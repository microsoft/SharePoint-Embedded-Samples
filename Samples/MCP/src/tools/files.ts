import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { GraphClient } from '../graph.js';

type TextContent = { type: 'text'; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(e: unknown): ToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
}

export function registerFileTools(server: McpServer, graph: GraphClient): void {
  server.tool(
    'list_items',
    'List files and folders in a container drive root or a specific folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      folderId: z.string().optional().describe('Folder item ID to list (omit for root)'),
      top: z.number().int().positive().optional().describe('Maximum items to return'),
      orderBy: z.string().optional()
        .describe('OData orderBy expression, e.g. "name asc" or "lastModifiedDateTime desc"'),
    },
    async ({ driveId, folderId, top, orderBy }) => {
      try {
        const base = folderId
          ? `/drives/${driveId}/items/${folderId}/children`
          : `/drives/${driveId}/root/children`;
        const params = new URLSearchParams();
        if (top) params.set('$top', String(top));
        if (orderBy) params.set('$orderby', orderBy);
        const qs = params.toString();
        const result = await graph.get(`${base}${qs ? '?' + qs : ''}`);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'get_item',
    'Get metadata for a file or folder by item ID',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
    },
    async ({ driveId, itemId }) => {
      try {
        const result = await graph.get(`/drives/${driveId}/items/${itemId}`);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'upload_file',
    'Upload a file to a container drive. File content must be base64-encoded. Maximum 4MB — for larger files use an upload session via the Graph API directly.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      fileName: z.string().describe('File name including extension, e.g. "report.pdf"'),
      contentBase64: z.string().describe('Base64-encoded file content'),
      contentType: z.string().describe('MIME type, e.g. "application/pdf", "text/plain", "image/png"'),
      parentFolderId: z.string().optional()
        .describe('Parent folder item ID (omit to upload to root)'),
    },
    async ({ driveId, fileName, contentBase64, contentType, parentFolderId }) => {
      try {
        const buffer = Buffer.from(contentBase64, 'base64');
        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer;
        const encodedName = encodeURIComponent(fileName);
        const path = parentFolderId
          ? `/drives/${driveId}/items/${parentFolderId}:/${encodedName}:/content`
          : `/drives/${driveId}/root:/${encodedName}:/content`;
        const result = await graph.upload(path, arrayBuffer, contentType);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'download_file',
    'Download the content of a file. Returns base64-encoded content.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
    },
    async ({ driveId, itemId }) => {
      try {
        const arrayBuffer = await graph.download(`/drives/${driveId}/items/${itemId}/content`);
        const contentBase64 = Buffer.from(arrayBuffer).toString('base64');
        return ok({ itemId, contentBase64, sizeBytes: arrayBuffer.byteLength });
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'delete_item',
    'Permanently delete a file or folder from the drive. This cannot be undone.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to delete'),
    },
    async ({ driveId, itemId }) => {
      try {
        await graph.delete(`/drives/${driveId}/items/${itemId}`);
        return ok({ success: true, message: `Item ${itemId} deleted` });
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'create_folder',
    'Create a new folder in a container drive',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      folderName: z.string().min(1).describe('Name of the new folder'),
      parentFolderId: z.string().optional()
        .describe('Parent folder item ID (omit to create at root)'),
    },
    async ({ driveId, folderName, parentFolderId }) => {
      try {
        const path = parentFolderId
          ? `/drives/${driveId}/items/${parentFolderId}/children`
          : `/drives/${driveId}/root/children`;
        const result = await graph.post(path, {
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        });
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'move_item',
    'Move or rename a file or folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to move/rename'),
      newName: z.string().optional().describe('New name for the item'),
      newParentFolderId: z.string().optional()
        .describe('Item ID of the destination folder (omit to keep current parent)'),
    },
    async ({ driveId, itemId, newName, newParentFolderId }) => {
      try {
        if (!newName && !newParentFolderId) {
          return err(new Error('Provide newName and/or newParentFolderId'));
        }
        const body: Record<string, unknown> = {};
        if (newName) body['name'] = newName;
        if (newParentFolderId) body['parentReference'] = { id: newParentFolderId };
        const result = await graph.patch(`/drives/${driveId}/items/${itemId}`, body);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'copy_item',
    'Copy a file or folder to a destination folder. Returns an operationUrl to poll for completion status.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to copy'),
      destinationFolderId: z.string().describe('Item ID of the destination folder'),
      newName: z.string().optional().describe('New name for the copy (omit to keep original name)'),
    },
    async ({ driveId, itemId, destinationFolderId, newName }) => {
      try {
        const body: Record<string, unknown> = {
          parentReference: { driveId, id: destinationFolderId },
        };
        if (newName) body['name'] = newName;
        const result = await graph.postAsync(`/drives/${driveId}/items/${itemId}/copy`, body);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'search_items',
    'Search for files and folders within a drive by keyword',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      query: z.string().min(1).describe('Search query string'),
      top: z.number().int().positive().optional().describe('Maximum results to return'),
    },
    async ({ driveId, query, top }) => {
      try {
        const encoded = encodeURIComponent(query);
        let path = `/drives/${driveId}/root/search(q='${encoded}')`;
        if (top) path += `?$top=${top}`;
        const result = await graph.get(path);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'create_sharing_link',
    'Create a sharing link for a file or folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      type: z.enum(['view', 'edit', 'embed'])
        .describe('Link type: "view" (read-only), "edit" (read-write), or "embed"'),
      scope: z.enum(['anonymous', 'organization'])
        .describe('Link scope: "anonymous" (anyone with link) or "organization" (tenant only)'),
      expirationDateTime: z.string().optional()
        .describe('ISO 8601 expiration date, e.g. "2025-12-31T23:59:59Z"'),
    },
    async ({ driveId, itemId, type, scope, expirationDateTime }) => {
      try {
        const body: Record<string, unknown> = { type, scope };
        if (expirationDateTime) body['expirationDateTime'] = expirationDateTime;
        const result = await graph.post(`/drives/${driveId}/items/${itemId}/createLink`, body);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  // ── Item metadata update ─────────────────────────────────────────────────────

  server.tool(
    'update_item',
    'Update the metadata of a file or folder (name, description, or move to a new parent)',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to update'),
      name: z.string().optional().describe('New name for the item'),
      description: z.string().optional().describe('New description for the item'),
    },
    async ({ driveId, itemId, name, description }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body['name'] = name;
        if (description !== undefined) body['description'] = description;
        if (!Object.keys(body).length) return err(new Error('Provide at least one field to update'));
        return ok(await graph.patch(`/drives/${driveId}/items/${itemId}`, body));
      } catch (e) { return err(e); }
    }
  );

  // ── Restore / permanent delete ───────────────────────────────────────────────

  server.tool(
    'restore_item',
    'Restore a deleted drive item from the recycle bin to its original location',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to restore'),
    },
    async ({ driveId, itemId }) => {
      try {
        return ok(await graph.post(`/drives/${driveId}/items/${itemId}/restore`, {}));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'permanently_delete_item',
    'Permanently delete a drive item, bypassing the recycle bin. Cannot be undone.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to permanently delete'),
    },
    async ({ driveId, itemId }) => {
      try {
        await graph.post(`/drives/${driveId}/items/${itemId}/permanentDelete`, {});
        return ok({ success: true, message: `Item ${itemId} permanently deleted` });
      } catch (e) { return err(e); }
    }
  );

  // ── Check in / check out ─────────────────────────────────────────────────────

  server.tool(
    'checkout_item',
    'Check out a file to prevent others from editing it while you make changes',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to check out'),
    },
    async ({ driveId, itemId }) => {
      try {
        await graph.post(`/drives/${driveId}/items/${itemId}/checkout`, {});
        return ok({ success: true, message: `Item ${itemId} checked out` });
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'checkin_item',
    'Check in a previously checked-out file to make it available to others',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to check in'),
      comment: z.string().optional().describe('Check-in comment (version note)'),
      checkInAs: z.enum(['published', 'unspecified']).optional()
        .describe('Check-in type: "published" to publish a major version, "unspecified" for minor/default'),
    },
    async ({ driveId, itemId, comment, checkInAs }) => {
      try {
        const body: Record<string, unknown> = {};
        if (comment) body['comment'] = comment;
        if (checkInAs) body['checkInAs'] = checkInAs;
        await graph.post(`/drives/${driveId}/items/${itemId}/checkin`, body);
        return ok({ success: true, message: `Item ${itemId} checked in` });
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'discard_checkout',
    'Discard a checked-out file, reverting to the last checked-in version',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID whose checkout to discard'),
    },
    async ({ driveId, itemId }) => {
      try {
        await graph.post(`/drives/${driveId}/items/${itemId}/discardCheckout`, {});
        return ok({ success: true, message: `Checkout discarded for item ${itemId}` });
      } catch (e) { return err(e); }
    }
  );

  // ── Versions ─────────────────────────────────────────────────────────────────

  server.tool(
    'list_item_versions',
    'List all versions of a file in a drive',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
    },
    async ({ driveId, itemId }) => {
      try {
        return ok(await graph.get(`/drives/${driveId}/items/${itemId}/versions`));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'get_item_version',
    'Get metadata for a specific version of a file',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      versionId: z.string().describe('The version ID (from list_item_versions)'),
    },
    async ({ driveId, itemId, versionId }) => {
      try {
        return ok(await graph.get(`/drives/${driveId}/items/${itemId}/versions/${versionId}`));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'restore_item_version',
    'Restore a previous version of a file, making it the current version',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      versionId: z.string().describe('The version ID to restore (from list_item_versions)'),
    },
    async ({ driveId, itemId, versionId }) => {
      try {
        await graph.post(`/drives/${driveId}/items/${itemId}/versions/${versionId}/restoreVersion`, {});
        return ok({ success: true, message: `Version ${versionId} restored for item ${itemId}` });
      } catch (e) { return err(e); }
    }
  );

  // ── Large file upload session ────────────────────────────────────────────────

  server.tool(
    'create_upload_session',
    'Create an upload session for a large file (>4MB). Returns an uploadUrl that accepts PUT requests with byte ranges. Upload chunks of up to 60MB each using: PUT <uploadUrl> with Content-Range and Content-Length headers — no Authorization header needed on the uploadUrl itself.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      fileName: z.string().describe('File name including extension, e.g. "large-video.mp4"'),
      parentFolderId: z.string().optional()
        .describe('Parent folder item ID (omit to upload to root)'),
      conflictBehavior: z.enum(['rename', 'replace', 'fail']).optional()
        .describe('What to do if a file with the same name exists: "rename" (default), "replace", or "fail"'),
    },
    async ({ driveId, fileName, parentFolderId, conflictBehavior }) => {
      try {
        const encodedName = encodeURIComponent(fileName);
        const path = parentFolderId
          ? `/drives/${driveId}/items/${parentFolderId}:/${encodedName}:/createUploadSession`
          : `/drives/${driveId}/root:/${encodedName}:/createUploadSession`;
        const item: Record<string, unknown> = { name: fileName };
        if (conflictBehavior) item['@microsoft.graph.conflictBehavior'] = conflictBehavior;
        return ok(await graph.post(path, { item }));
      } catch (e) { return err(e); }
    }
  );

  // ── Download in alternate format ─────────────────────────────────────────────

  server.tool(
    'download_item_as_format',
    'Download a file converted to a different format (e.g. convert a Word doc to PDF). Returns base64-encoded content.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      format: z.enum(['pdf', 'glb', 'html', 'jpg', 'zip'])
        .describe('Target format: "pdf" (Office docs → PDF), "jpg" (image thumbnails), "html", "glb" (3D), "zip"'),
    },
    async ({ driveId, itemId, format }) => {
      try {
        const arrayBuffer = await graph.download(`/drives/${driveId}/items/${itemId}/content?format=${format}`);
        const contentBase64 = Buffer.from(arrayBuffer).toString('base64');
        return ok({ itemId, format, contentBase64, sizeBytes: arrayBuffer.byteLength });
      } catch (e) { return err(e); }
    }
  );

  // ── Thumbnails & preview ─────────────────────────────────────────────────────

  server.tool(
    'get_item_thumbnails',
    'Get thumbnail images for a file or folder (small, medium, large sizes)',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
    },
    async ({ driveId, itemId }) => {
      try {
        return ok(await graph.get(`/drives/${driveId}/items/${itemId}/thumbnails`));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'preview_item',
    'Get a short-lived embeddable preview URL for a file. The returned getUrl can be embedded in an iframe.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      zoom: z.number().optional().describe('Zoom level (1–4, default: 1)'),
      page: z.number().int().positive().optional().describe('Page number to navigate to on open'),
    },
    async ({ driveId, itemId, zoom, page }) => {
      try {
        const body: Record<string, unknown> = {};
        if (zoom !== undefined) body['zoom'] = zoom;
        if (page !== undefined) body['page'] = page;
        return ok(await graph.post(`/drives/${driveId}/items/${itemId}/preview`, body));
      } catch (e) { return err(e); }
    }
  );

  // ── Follow / unfollow ────────────────────────────────────────────────────────

  server.tool(
    'follow_item',
    'Follow a drive item to receive notifications about changes to it',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to follow'),
    },
    async ({ driveId, itemId }) => {
      try {
        return ok(await graph.post(`/drives/${driveId}/items/${itemId}/follow`, {}));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'unfollow_item',
    'Stop following a drive item',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID to unfollow'),
    },
    async ({ driveId, itemId }) => {
      try {
        await graph.post(`/drives/${driveId}/items/${itemId}/unfollow`, {});
        return ok({ success: true, message: `Stopped following item ${itemId}` });
      } catch (e) { return err(e); }
    }
  );
}
