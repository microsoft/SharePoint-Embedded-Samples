import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { GraphClient } from '../graph.js';
import type { AppConfig } from '../config.js';

type TextContent = { type: 'text'; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function err(e: unknown): ToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
}

export function registerContainerTools(server: McpServer, graph: GraphClient, config: AppConfig): void {
  const ctid = config.containerTypeId;

  // ── Container CRUD ──────────────────────────────────────────────────────────

  server.tool('list_containers',
    'List all SharePoint Embedded containers for the configured container type',
    { top: z.number().int().positive().optional().describe('Max containers to return') },
    async ({ top }) => {
      try {
        // GUIDs in Microsoft Graph OData filters are unquoted
        let path = `/storage/fileStorage/containers?$filter=containerTypeId eq ${ctid}`;
        if (top) path += `&$top=${top}`;
        return ok(await graph.get(path));
      } catch (e) { return err(e); }
    }
  );

  server.tool('create_container',
    'Create a new SharePoint Embedded container',
    {
      displayName: z.string().min(1).describe('Display name for the container'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ displayName, description }) => {
      try {
        const body: Record<string, unknown> = { displayName, containerTypeId: ctid };
        if (description) body['description'] = description;
        return ok(await graph.post('/storage/fileStorage/containers', body));
      } catch (e) { return err(e); }
    }
  );

  server.tool('get_container',
    'Get details of a container including its embedded drive ID',
    { containerId: z.string().describe('The container ID') },
    async ({ containerId }) => {
      try {
        return ok(await graph.get(`/storage/fileStorage/containers/${containerId}?$expand=drive($select=id,webUrl,name)`));
      } catch (e) { return err(e); }
    }
  );

  server.tool('get_container_drive',
    'Get the driveId for a container. Use this driveId with all file operation tools.',
    { containerId: z.string().describe('The container ID') },
    async ({ containerId }) => {
      try {
        const r = await graph.get<{ id: string; displayName: string; drive?: { id?: string; webUrl?: string } }>(
          `/storage/fileStorage/containers/${containerId}?$expand=drive($select=id,webUrl,name)`
        );
        return ok({ containerId: r.id, displayName: r.displayName, driveId: r.drive?.id, driveWebUrl: r.drive?.webUrl });
      } catch (e) { return err(e); }
    }
  );

  server.tool('update_container',
    'Update the display name, description, or custom properties of a container',
    {
      containerId: z.string().describe('The container ID'),
      displayName: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
    },
    async ({ containerId, displayName, description }) => {
      try {
        const body: Record<string, unknown> = {};
        if (displayName) body['displayName'] = displayName;
        if (description !== undefined) body['description'] = description;
        if (!Object.keys(body).length) return err(new Error('Provide at least one field to update'));
        return ok(await graph.patch(`/storage/fileStorage/containers/${containerId}`, body));
      } catch (e) { return err(e); }
    }
  );

  server.tool('delete_container',
    'Delete a container (moves to deleted containers, recoverable for 93 days)',
    { containerId: z.string().describe('The container ID to delete') },
    async ({ containerId }) => {
      try {
        await graph.delete(`/storage/fileStorage/containers/${containerId}`);
        return ok({ success: true, message: `Container ${containerId} deleted` });
      } catch (e) { return err(e); }
    }
  );

  server.tool('activate_container',
    'Activate an inactive container (changes status from inactive to active)',
    { containerId: z.string().describe('The container ID to activate') },
    async ({ containerId }) => {
      try {
        await graph.post(`/storage/fileStorage/containers/${containerId}/activate`, {});
        return ok({ success: true, message: `Container ${containerId} activated` });
      } catch (e) { return err(e); }
    }
  );

  server.tool('permanent_delete_container',
    'Permanently delete a container. Cannot be undone — container is not recoverable.',
    { containerId: z.string().describe('The container ID to permanently delete') },
    async ({ containerId }) => {
      try {
        await graph.post(`/storage/fileStorage/containers/${containerId}/permanentDelete`, {});
        return ok({ success: true, message: `Container ${containerId} permanently deleted` });
      } catch (e) { return err(e); }
    }
  );

  // ── Deleted containers ──────────────────────────────────────────────────────

  server.tool('list_deleted_containers',
    'List soft-deleted containers (recoverable within 93 days)',
    { top: z.number().int().positive().optional().describe('Max containers to return') },
    async ({ top }) => {
      try {
        let path = `/storage/fileStorage/deletedContainers?$filter=containerTypeId eq ${ctid}`;
        if (top) path += `&$top=${top}`;
        return ok(await graph.get(path));
      } catch (e) { return err(e); }
    }
  );

  server.tool('restore_deleted_container',
    'Restore a soft-deleted container',
    { containerId: z.string().describe('The deleted container ID to restore') },
    async ({ containerId }) => {
      try {
        return ok(await graph.post(`/storage/fileStorage/deletedContainers/${containerId}/restore`, {}));
      } catch (e) { return err(e); }
    }
  );

  server.tool('permanent_delete_deleted_container',
    'Permanently remove a soft-deleted container from the deleted containers store. Cannot be undone.',
    { containerId: z.string().describe('The deleted container ID to permanently remove') },
    async ({ containerId }) => {
      try {
        await graph.delete(`/storage/fileStorage/deletedContainers/${containerId}`);
        return ok({ success: true, message: `Deleted container ${containerId} permanently removed` });
      } catch (e) { return err(e); }
    }
  );

  // ── Container lock / unlock ─────────────────────────────────────────────────

  server.tool('lock_container',
    'Lock a container to prevent modifications (sets lockState to lockedReadOnly)',
    { containerId: z.string().describe('The container ID to lock') },
    async ({ containerId }) => {
      try {
        await graph.post(`/storage/fileStorage/containers/${containerId}/lock`, { lockState: 'lockedReadOnly' });
        return ok({ success: true, message: `Container ${containerId} locked (read-only)` });
      } catch (e) { return err(e); }
    }
  );

  server.tool('unlock_container',
    'Unlock a previously locked container (sets lockState to unlocked)',
    { containerId: z.string().describe('The container ID to unlock') },
    async ({ containerId }) => {
      try {
        return ok(await graph.patch(`/storage/fileStorage/containers/${containerId}`, { lockState: 'unlocked' }));
      } catch (e) { return err(e); }
    }
  );

  // ── Container permissions ───────────────────────────────────────────────────

  server.tool('list_container_permissions',
    'List all permissions on a container (distinct from drive item permissions)',
    {
      containerId: z.string().describe('The container ID'),
      includeAllUsers: z.boolean().optional().describe('Include all users with implicit access via container membership'),
    },
    async ({ containerId, includeAllUsers }) => {
      try {
        const qs = includeAllUsers ? '?includeAllContainerUsers=true' : '';
        return ok(await graph.get(`/storage/fileStorage/containers/${containerId}/permissions${qs}`));
      } catch (e) { return err(e); }
    }
  );

  server.tool('add_container_permission',
    'Grant a user access to a container with a specific role (reader, writer, manager, or owner)',
    {
      containerId: z.string().describe('The container ID'),
      userPrincipalName: z.string().describe('UPN (email) of the user to grant access'),
      role: z.enum(['reader', 'writer', 'manager', 'owner']).describe('Role to assign'),
    },
    async ({ containerId, userPrincipalName, role }) => {
      try {
        const body = {
          roles: [role],
          grantedToV2: { user: { userPrincipalName } },
        };
        return ok(await graph.post(`/storage/fileStorage/containers/${containerId}/permissions`, body));
      } catch (e) { return err(e); }
    }
  );

  server.tool('update_container_permission',
    'Update the role of an existing container permission',
    {
      containerId: z.string().describe('The container ID'),
      permissionId: z.string().describe('The permission ID (from list_container_permissions)'),
      role: z.enum(['reader', 'writer', 'manager', 'owner']).describe('New role to assign'),
    },
    async ({ containerId, permissionId, role }) => {
      try {
        return ok(await graph.patch(`/storage/fileStorage/containers/${containerId}/permissions/${permissionId}`, { roles: [role] }));
      } catch (e) { return err(e); }
    }
  );

  server.tool('delete_container_permission',
    'Remove a permission from a container',
    {
      containerId: z.string().describe('The container ID'),
      permissionId: z.string().describe('The permission ID to remove (from list_container_permissions)'),
    },
    async ({ containerId, permissionId }) => {
      try {
        await graph.delete(`/storage/fileStorage/containers/${containerId}/permissions/${permissionId}`);
        return ok({ success: true, message: `Permission ${permissionId} removed` });
      } catch (e) { return err(e); }
    }
  );

  // ── Custom properties ───────────────────────────────────────────────────────

  server.tool('get_container_custom_properties',
    'Get all custom properties defined on a container',
    { containerId: z.string().describe('The container ID') },
    async ({ containerId }) => {
      try {
        return ok(await graph.get(`/storage/fileStorage/containers/${containerId}/customProperties`));
      } catch (e) { return err(e); }
    }
  );

  server.tool('set_container_custom_property',
    'Create or update a custom property on a container',
    {
      containerId: z.string().describe('The container ID'),
      propertyName: z.string().describe('Name/key of the custom property'),
      value: z.string().describe('Value of the custom property'),
      isSearchable: z.boolean().optional().describe('Whether the property is searchable (default: false)'),
    },
    async ({ containerId, propertyName, value, isSearchable }) => {
      try {
        const body: Record<string, unknown> = { value };
        if (isSearchable !== undefined) body['isSearchable'] = isSearchable;
        return ok(await graph.patch(
          `/storage/fileStorage/containers/${containerId}/customProperties/${propertyName}`,
          body
        ));
      } catch (e) { return err(e); }
    }
  );

  server.tool('delete_container_custom_property',
    'Delete a custom property from a container',
    {
      containerId: z.string().describe('The container ID'),
      propertyName: z.string().describe('Name/key of the custom property to delete'),
    },
    async ({ containerId, propertyName }) => {
      try {
        await graph.delete(`/storage/fileStorage/containers/${containerId}/customProperties/${propertyName}`);
        return ok({ success: true, message: `Custom property '${propertyName}' deleted` });
      } catch (e) { return err(e); }
    }
  );

  // ── Container columns ───────────────────────────────────────────────────────

  server.tool('list_container_columns',
    'List all column definitions on a container',
    { containerId: z.string().describe('The container ID') },
    async ({ containerId }) => {
      try {
        return ok(await graph.get(`/storage/fileStorage/containers/${containerId}/columns`));
      } catch (e) { return err(e); }
    }
  );

  server.tool('create_container_column',
    'Create a new column definition on a container. Pass the columnDefinition as a JSON object.',
    {
      containerId: z.string().describe('The container ID'),
      name: z.string().describe('Column name'),
      columnType: z.enum(['text', 'number', 'boolean', 'dateTime', 'choice', 'personOrGroup', 'lookup', 'geolocation', 'currency', 'term', 'thumbnail', 'calculatedValue', 'hyperlinkOrPicture', 'note'])
        .describe('Type of the column'),
      description: z.string().optional().describe('Column description'),
      enforceUniqueValues: z.boolean().optional().describe('Whether values must be unique'),
      hidden: z.boolean().optional().describe('Whether column is hidden'),
      indexed: z.boolean().optional().describe('Whether column is indexed for search'),
      required: z.boolean().optional().describe('Whether the column is required'),
    },
    async ({ containerId, name, columnType, description, enforceUniqueValues, hidden, indexed, required }) => {
      try {
        const body: Record<string, unknown> = { name, [columnType]: {} };
        if (description !== undefined) body['description'] = description;
        if (enforceUniqueValues !== undefined) body['enforceUniqueValues'] = enforceUniqueValues;
        if (hidden !== undefined) body['hidden'] = hidden;
        if (indexed !== undefined) body['indexed'] = indexed;
        if (required !== undefined) body['required'] = required;
        return ok(await graph.post(`/storage/fileStorage/containers/${containerId}/columns`, body));
      } catch (e) { return err(e); }
    }
  );

  server.tool('get_container_column',
    'Get a specific column definition from a container',
    {
      containerId: z.string().describe('The container ID'),
      columnId: z.string().describe('The column ID (from list_container_columns)'),
    },
    async ({ containerId, columnId }) => {
      try {
        return ok(await graph.get(`/storage/fileStorage/containers/${containerId}/columns/${columnId}`));
      } catch (e) { return err(e); }
    }
  );

  server.tool('update_container_column',
    'Update an existing column definition on a container',
    {
      containerId: z.string().describe('The container ID'),
      columnId: z.string().describe('The column ID (from list_container_columns)'),
      description: z.string().optional().describe('New description'),
      hidden: z.boolean().optional().describe('Whether column is hidden'),
      indexed: z.boolean().optional().describe('Whether column is indexed'),
      required: z.boolean().optional().describe('Whether column is required'),
    },
    async ({ containerId, columnId, description, hidden, indexed, required }) => {
      try {
        const body: Record<string, unknown> = {};
        if (description !== undefined) body['description'] = description;
        if (hidden !== undefined) body['hidden'] = hidden;
        if (indexed !== undefined) body['indexed'] = indexed;
        if (required !== undefined) body['required'] = required;
        if (!Object.keys(body).length) return err(new Error('Provide at least one field to update'));
        return ok(await graph.patch(`/storage/fileStorage/containers/${containerId}/columns/${columnId}`, body));
      } catch (e) { return err(e); }
    }
  );

  server.tool('delete_container_column',
    'Delete a column definition from a container',
    {
      containerId: z.string().describe('The container ID'),
      columnId: z.string().describe('The column ID to delete'),
    },
    async ({ containerId, columnId }) => {
      try {
        await graph.delete(`/storage/fileStorage/containers/${containerId}/columns/${columnId}`);
        return ok({ success: true, message: `Column ${columnId} deleted` });
      } catch (e) { return err(e); }
    }
  );

  // ── Recycle bin ─────────────────────────────────────────────────────────────

  server.tool('list_recycle_bin_items',
    'List items in the recycle bin of a container',
    {
      containerId: z.string().describe('The container ID'),
      top: z.number().int().positive().optional().describe('Max items to return'),
    },
    async ({ containerId, top }) => {
      try {
        let path = `/storage/fileStorage/containers/${containerId}/recycleBin/items`;
        if (top) path += `?$top=${top}`;
        return ok(await graph.get(path));
      } catch (e) { return err(e); }
    }
  );

  server.tool('restore_recycle_bin_item',
    'Restore an item from the container recycle bin to its original location',
    {
      containerId: z.string().describe('The container ID'),
      recycleBinItemId: z.string().describe('The recycle bin item ID (from list_recycle_bin_items)'),
    },
    async ({ containerId, recycleBinItemId }) => {
      try {
        return ok(await graph.post(
          `/storage/fileStorage/containers/${containerId}/recycleBin/items/${recycleBinItemId}/restore`,
          {}
        ));
      } catch (e) { return err(e); }
    }
  );

  server.tool('delete_recycle_bin_item',
    'Permanently delete an item from the container recycle bin. Cannot be undone.',
    {
      containerId: z.string().describe('The container ID'),
      recycleBinItemId: z.string().describe('The recycle bin item ID to permanently delete'),
    },
    async ({ containerId, recycleBinItemId }) => {
      try {
        await graph.delete(`/storage/fileStorage/containers/${containerId}/recycleBin/items/${recycleBinItemId}`);
        return ok({ success: true, message: `Recycle bin item ${recycleBinItemId} permanently deleted` });
      } catch (e) { return err(e); }
    }
  );

  server.tool('update_recycle_bin_settings',
    'Update the recycle bin retention settings for a container',
    {
      containerId: z.string().describe('The container ID'),
      retentionDays: z.number().int().min(1).max(180).describe('Number of days to retain deleted items (1–180)'),
    },
    async ({ containerId, retentionDays }) => {
      try {
        return ok(await graph.patch(
          `/storage/fileStorage/containers/${containerId}/recycleBin/settings`,
          { retentionDays }
        ));
      } catch (e) { return err(e); }
    }
  );
}
