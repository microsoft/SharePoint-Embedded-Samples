/**
 * CMIS Query (cmisaction=query)
 *
 * SharePoint Embedded has no built-in CMIS SQL query engine, and
 * implementing the full CMIS SQL-92-like grammar is out of scope for this
 * adapter. Instead, this module supports a small, real, useful subset:
 *
 *   SELECT ... FROM cmis:document|cmis:folder [WHERE cmis:name (=|LIKE) '<value>']
 *
 * which covers the common "find an item by name" use case. Execution is a
 * recursive walk of the repository's folder tree (via listChildren) with
 * in-memory filtering - acceptable given SPE containers are expected to be
 * modestly sized. This corresponds to capabilityQuery='metadataonly'
 * (no full-text search, no joins, no arbitrary property predicates).
 */

import type { DriveItem } from '@microsoft/microsoft-graph-types';
import { listChildren } from '../graph/driveItemService';
import { mapDriveItemsToQueryResults } from './objectMapper';
import { QueryResults } from '../types/cmis';

interface ParsedQuery {
    typeId: 'cmis:document' | 'cmis:folder' | null; // null = any type (cmis:item / no FROM clause narrowing)
    nameFilter?: { operator: '=' | 'like'; value: string };
}

interface QueryParseError {
    error: string;
}

const QUERY_REGEX =
    /^\s*select\s+.+?\s+from\s+(cmis:document|cmis:folder|cmis:item)\s*(?:where\s+cmis:name\s+(=|like)\s+'([^']*)')?\s*$/i;

/**
 * Parses a (very small subset of) CMIS SQL. Returns a QueryParseError if
 * the statement isn't recognized.
 */
export function parseCmisQuery(statement: string): ParsedQuery | QueryParseError {
    const match = QUERY_REGEX.exec(statement.trim());
    if (!match) {
        return {
            error:
                "Unsupported query statement. Only 'SELECT ... FROM cmis:document|cmis:folder " +
                "[WHERE cmis:name (=|LIKE) \\'<value>\\']' is supported.",
        };
    }

    const fromType = match[1].toLowerCase();
    const typeId = fromType === 'cmis:item' ? null : (fromType as 'cmis:document' | 'cmis:folder');

    const result: ParsedQuery = { typeId };
    if (match[2] && match[3] !== undefined) {
        result.nameFilter = { operator: match[2].toLowerCase() as '=' | 'like', value: match[3] };
    }
    return result;
}

/**
 * Evaluates the (limited) WHERE cmis:name filter against an item's name.
 * Supports exact match ('=') and a simple LIKE subset with '%' wildcards
 * at the start, end, both, or neither (SQL-92 '%' wildcard semantics).
 */
function matchesNameFilter(name: string, filter?: ParsedQuery['nameFilter']): boolean {
    if (!filter) {
        return true;
    }

    if (filter.operator === '=') {
        return name === filter.value;
    }

    const pattern = filter.value;
    const lowerName = name.toLowerCase();
    if (pattern.startsWith('%') && pattern.endsWith('%') && pattern.length > 1) {
        return lowerName.includes(pattern.slice(1, -1).toLowerCase());
    }
    if (pattern.endsWith('%')) {
        return lowerName.startsWith(pattern.slice(0, -1).toLowerCase());
    }
    if (pattern.startsWith('%')) {
        return lowerName.endsWith(pattern.slice(1).toLowerCase());
    }
    return lowerName === pattern.toLowerCase();
}

/**
 * Fetches ALL children of a folder, following `@odata.nextLink`
 * continuation pages. A single listChildren(top=999) call only returns the
 * first page - folders with more than 999 children would otherwise be
 * silently truncated, dropping items (and nested folders, breaking the
 * tree walk) from query results.
 */
async function listAllChildren(
    accessToken: string,
    repositoryId: string,
    folderId: string
): Promise<DriveItem[]> {
    const pageSize = 999;
    const all: DriveItem[] = [];
    let skip = 0;

    while (true) {
        const result = await listChildren(accessToken, repositoryId, folderId, pageSize, skip);
        if (!result.success) {
            break;
        }
        const items = result.data?.value || [];
        all.push(...items);
        if (items.length < pageSize || !result.data?.['@odata.nextLink']) {
            break;
        }
        skip += pageSize;
    }

    return all;
}

/**
 * Executes a query statement against the repository, recursively walking
 * the folder tree from the root.
 */
export async function executeCmisQuery(
    statement: string,
    accessToken: string,
    repositoryId: string,
    maxItems: number,
    skipCount: number
): Promise<{ success: boolean; queryResults?: QueryResults; error?: string }> {
    const parsed = parseCmisQuery(statement);
    if ('error' in parsed) {
        return { success: false, error: parsed.error };
    }

    const matches: DriveItem[] = [];
    const queue: string[] = ['root'];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const folderId = queue.shift()!;
        if (visited.has(folderId)) {
            continue;
        }
        visited.add(folderId);

        const children = await listAllChildren(accessToken, repositoryId, folderId);

        for (const item of children) {
            const isFolder = !!item.folder;
            const typeMatches = parsed.typeId === null || (parsed.typeId === 'cmis:folder') === isFolder;
            if (typeMatches && matchesNameFilter(item.name || '', parsed.nameFilter)) {
                matches.push(item);
            }
            if (isFolder && item.id) {
                queue.push(item.id);
            }
        }
    }

    const total = matches.length;
    const page = matches.slice(skipCount, skipCount + maxItems);
    const queryResults = mapDriveItemsToQueryResults(page, skipCount + maxItems < total, total, true, false);

    return { success: true, queryResults };
}
