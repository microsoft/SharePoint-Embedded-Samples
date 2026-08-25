import { HttpRequest, InvocationContext } from "@azure/functions";

/**
 * Parses multipart form data from the request.
 * Manual implementation since request.formData() may not work correctly in all cases.
 */
export async function parseMultipartForm(request: HttpRequest, context?: InvocationContext): Promise<{
    fields: Map<string, string>;
    fileContent: Buffer | null;
    fileName: string | null;
    mimeType: string | null;
}> {
    const fields = new Map<string, string>();
    let fileContent: Buffer | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;

    try {
        // First try the native formData() method
        const formData = await request.formData();
        const entries = [...formData.entries()];
        context?.log(`FormData entries count: ${entries.length}`);

        if (entries.length > 0) {
            for (const [key, value] of entries) {
                // Check if it's a file-like object (has arrayBuffer method and name property)
                const isFile = value && typeof value === 'object' && 'arrayBuffer' in value && 'name' in value;
                context?.log(`FormData entry: key=${key}, type=${isFile ? 'File' : 'string'}`);
                if (isFile) {
                    const fileValue = value as { name: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> };
                    fileName = fileValue.name;
                    mimeType = fileValue.type || null;
                    fileContent = Buffer.from(await fileValue.arrayBuffer());
                    context?.log(`File parsed: name=${fileName}, type=${mimeType}, size=${fileContent.length}`);
                } else {
                    fields.set(key, String(value));
                    context?.log(`Field parsed: ${key}=${String(value)}`);
                }
            }
            return { fields, fileContent, fileName, mimeType };
        }
    } catch (error) {
        context?.log(`Native formData() failed: ${error}, trying manual parse...`);
    }

    // Fallback: Manual multipart parsing
    try {
        const contentType = request.headers.get('content-type') || '';
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!boundaryMatch) {
            context?.log('No boundary found in content-type');
            return { fields, fileContent, fileName, mimeType };
        }

        const boundary = boundaryMatch[1] || boundaryMatch[2];
        context?.log(`Parsing with boundary: ${boundary}`);

        const body = Buffer.from(await request.arrayBuffer());
        context?.log(`Body size: ${body.length} bytes`);

        const parts = splitMultipartBody(body, boundary);
        context?.log(`Found ${parts.length} parts`);

        for (const part of parts) {
            const { headers, content } = parseMultipartPart(part);
            const disposition = headers.get('content-disposition') || '';

            const nameMatch = disposition.match(/name="([^"]+)"/);
            const filenameMatch = disposition.match(/filename="([^"]+)"/);

            if (nameMatch) {
                const fieldName = nameMatch[1];

                if (filenameMatch) {
                    // This is a file field
                    fileName = filenameMatch[1];
                    mimeType = headers.get('content-type') || 'application/octet-stream';
                    fileContent = content;
                    context?.log(`Manual parse - File: name=${fileName}, type=${mimeType}, size=${content.length}`);
                } else {
                    // This is a regular field
                    const value = content.toString('utf-8').trim();
                    fields.set(fieldName, value);
                    context?.log(`Manual parse - Field: ${fieldName}=${value}`);
                }
            }
        }
    } catch (error) {
        context?.log(`Manual multipart parsing failed: ${error}`);
    }

    return { fields, fileContent, fileName, mimeType };
}

/**
 * Splits a multipart body into individual parts based on the boundary.
 */
function splitMultipartBody(body: Buffer, boundary: string): Buffer[] {
    const parts: Buffer[] = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundary = Buffer.from(`--${boundary}--`);

    let start = 0;
    let pos = body.indexOf(boundaryBuffer, start);

    while (pos !== -1) {
        // Skip the first boundary
        if (start > 0) {
            // Extract content between boundaries (excluding CRLF before boundary)
            let end = pos;
            if (body[end - 2] === 0x0D && body[end - 1] === 0x0A) {
                end -= 2;
            }
            if (end > start) {
                parts.push(body.subarray(start, end));
            }
        }

        // Move past the boundary and CRLF
        start = pos + boundaryBuffer.length;
        if (body[start] === 0x0D && body[start + 1] === 0x0A) {
            start += 2;
        }

        // Check for end boundary
        if (body.subarray(pos, pos + endBoundary.length).equals(endBoundary)) {
            break;
        }

        pos = body.indexOf(boundaryBuffer, start);
    }

    return parts;
}

/**
 * Parses a single multipart part into headers and content.
 */
function parseMultipartPart(part: Buffer): { headers: Map<string, string>; content: Buffer } {
    const headers = new Map<string, string>();

    // Find the blank line separating headers from content
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) {
        return { headers, content: part };
    }

    // Parse headers
    const headerSection = part.subarray(0, headerEnd).toString('utf-8');
    const headerLines = headerSection.split('\r\n');

    for (const line of headerLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const name = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            headers.set(name, value);
        }
    }

    // Content starts after headers + blank line
    const content = part.subarray(headerEnd + 4);

    return { headers, content };
}
