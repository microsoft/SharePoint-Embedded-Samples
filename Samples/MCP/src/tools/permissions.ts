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

export function registerPermissionTools(server: McpServer, graph: GraphClient): void {
  server.tool(
    'list_permissions',
    'List all permissions on a file or folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
    },
    async ({ driveId, itemId }) => {
      try {
        const result = await graph.get(`/drives/${driveId}/items/${itemId}/permissions`);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'grant_permission',
    'Grant access to a file or folder by inviting users via their email addresses',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      recipients: z.array(z.string().email()).min(1)
        .describe('Array of email addresses to invite'),
      roles: z.array(z.enum(['read', 'write'])).min(1)
        .describe('Roles to grant: "read" for view access, "write" for edit access'),
      message: z.string().optional().describe('Optional invitation message'),
      requireSignIn: z.boolean().optional()
        .describe('Whether recipients must sign in (default: true)'),
    },
    async ({ driveId, itemId, recipients, roles, message, requireSignIn }) => {
      try {
        const body: Record<string, unknown> = {
          requireSignIn: requireSignIn ?? true,
          sendInvitation: false,
          roles,
          recipients: recipients.map(email => ({ email })),
        };
        if (message) body['message'] = message;
        const result = await graph.post(`/drives/${driveId}/items/${itemId}/invite`, body);
        return ok(result);
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'remove_permission',
    'Remove a specific permission from a file or folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      permissionId: z.string()
        .describe('The permission ID to remove — get this from list_permissions'),
    },
    async ({ driveId, itemId, permissionId }) => {
      try {
        await graph.delete(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`);
        return ok({ success: true, message: `Permission ${permissionId} removed` });
      } catch (e) { return err(e); }
    }
  );

  server.tool(
    'update_permission',
    'Update the roles on an existing permission for a file or folder',
    {
      driveId: z.string().describe('Drive ID — get this from get_container_drive'),
      itemId: z.string().describe('The drive item ID'),
      permissionId: z.string()
        .describe('The permission ID to update — get this from list_permissions'),
      roles: z.array(z.enum(['read', 'write', 'owner'])).min(1)
        .describe('New roles to assign: "read", "write", or "owner"'),
    },
    async ({ driveId, itemId, permissionId, roles }) => {
      try {
        return ok(await graph.patch(
          `/drives/${driveId}/items/${itemId}/permissions/${permissionId}`,
          { roles }
        ));
      } catch (e) { return err(e); }
    }
  );
}
