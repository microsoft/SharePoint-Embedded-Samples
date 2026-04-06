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

export function registerDriveTools(server: McpServer, graph: GraphClient): void {

  // ── Drive metadata ───────────────────────────────────────────────────────────

  server.tool(
    'get_drive',
    'Get metadata for a drive (name, quota, owner, webUrl, driveType)',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
    },
    async ({ driveId }) => {
      try {
        return ok(await graph.get(`/drives/${driveId}`));
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'get_drive_root',
    'Get the root folder item of a drive',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
    },
    async ({ driveId }) => {
      try {
        return ok(await graph.get(`/drives/${driveId}/root`));
      } catch (e) { return err(e); }
    }
  );

  // ── Item by path ─────────────────────────────────────────────────────────────

  server.tool(
    'get_item_by_path',
    'Get a drive item by its path relative to the drive root (e.g. "Documents/Reports/Q1.pdf")',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemPath: z.string().min(1).describe('Path relative to root, e.g. "folder/subfolder/file.txt"'),
    },
    async ({ driveId, itemPath }) => {
      try {
        const encoded = itemPath.split('/').map(encodeURIComponent).join('/');
        return ok(await graph.get(`/drives/${driveId}/root:/${encoded}`));
      } catch (e) { return err(e); }
    }
  );

  // ── Change tracking (delta) ──────────────────────────────────────────────────

  server.tool(
    'get_drive_changes',
    'Track changes across all items in a drive using delta. On first call omit deltaToken to get all items and a new token. On subsequent calls pass the deltaToken to get only changed items since the last call.',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      deltaToken: z.string().optional()
        .describe('Token from a previous get_drive_changes response to fetch only changes since then. Omit for the initial full enumeration.'),
      top: z.number().int().positive().optional().describe('Max items per page'),
    },
    async ({ driveId, deltaToken, top }) => {
      try {
        const params = new URLSearchParams();
        if (deltaToken) params.set('$deltaToken', deltaToken);
        if (top) params.set('$top', String(top));
        const qs = params.toString();
        const path = `/drives/${driveId}/root/delta${qs ? '?' + qs : ''}`;
        return ok(await graph.get(path));
      } catch (e) { return err(e); }
    }
  );

  // ── Followed items ───────────────────────────────────────────────────────────

  server.tool(
    'list_followed_items',
    'List drive items the signed-in user is following in this drive',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      top: z.number().int().positive().optional().describe('Max items to return'),
    },
    async ({ driveId, top }) => {
      try {
        let path = `/drives/${driveId}/following`;
        if (top) path += `?$top=${top}`;
        return ok(await graph.get(path));
      } catch (e) { return err(e); }
    }
  );
}
