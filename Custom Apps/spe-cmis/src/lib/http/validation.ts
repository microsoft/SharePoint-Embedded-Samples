/**
 * Request input shape-validation helpers.
 *
 * Existence checks alone aren't enough for values that flow into downstream
 * Graph API calls or CMIS query parsing - validate their expected shape too.
 */

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SPE container/drive IDs are base64url-ish (e.g. "b!wDT-79B69UWw991LeG8ubg..."), not GUIDs.
const REPOSITORY_ID_PATTERN = /^[A-Za-z0-9_!-]{1,256}$/;

/** Validates that a value looks like a GUID (e.g. a Container Type ID). */
export function isValidGuid(value: string): boolean {
    return GUID_PATTERN.test(value);
}

/** Validates that a value looks like an SPE container/drive ID (repositoryId). */
export function isValidRepositoryId(value: string): boolean {
    return REPOSITORY_ID_PATTERN.test(value);
}

/**
 * Parses a query/form value as a bounded non-negative integer.
 * Returns `fallback` when absent, or `undefined` when present but not a
 * valid non-negative integer (callers should treat that as invalidArgument).
 */
export function parseBoundedInt(
    value: string | null | undefined,
    fallback: number,
    max?: number
): number | undefined {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
        return undefined;
    }
    return max !== undefined ? Math.min(parsed, max) : parsed;
}
