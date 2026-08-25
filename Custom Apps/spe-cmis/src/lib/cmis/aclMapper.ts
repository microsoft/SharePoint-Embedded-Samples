/**
 * ACL Mapper
 *
 * Maps between Microsoft Graph `Permission` resources (driveItem sharing
 * model) and CMIS `Acl`/`AclEntry` shapes. Per CMIS 1.1 spec section 2.1.6.
 *
 * This is a best-effort mapping: Graph's sharing model (roles: read/write,
 * invite-based recipients) doesn't map 1:1 onto arbitrary CMIS ACEs, so:
 *  - A principalId is the granted user's email/UPN when known (falling back
 *    to display name or AAD object id), since that's what's needed to grant
 *    NEW access via `addItemPermission`.
 *  - CMIS permissions are simplified to 'cmis:read' / 'cmis:write' (no
 *    fine-grained custom permission scheme).
 */

import type { Permission } from '@microsoft/microsoft-graph-types';
import { Acl, AclEntry } from '../types/cmis';

/**
 * Maps a Graph permission's `roles` array to CMIS permission strings.
 */
export function mapGraphRolesToCmisPermissions(roles?: string[] | null): string[] {
    if (roles?.includes('write') || roles?.includes('owner')) {
        return ['cmis:write'];
    }
    return ['cmis:read'];
}

/**
 * Maps CMIS permission strings (as sent by a client's addACEPermission[i][j]
 * fields) to a single Graph role. 'cmis:write'/'cmis:all' grant write access;
 * anything else (e.g. 'cmis:read') grants read-only access.
 */
export function mapCmisPermissionsToGraphRole(permissions: string[]): 'read' | 'write' {
    if (permissions.some(p => p === 'cmis:write' || p === 'cmis:all')) {
        return 'write';
    }
    return 'read';
}

/**
 * Best-effort extraction of a stable principal identifier from a Graph
 * Permission resource: prefers the invited email/UPN (needed to re-grant
 * access), falling back to display name or AAD object id.
 */
function getPrincipalId(permission: Permission): string {
    return (
        permission.invitation?.email ||
        permission.grantedToV2?.user?.id ||
        permission.grantedToV2?.user?.displayName ||
        permission.grantedTo?.user?.id ||
        permission.grantedTo?.user?.displayName ||
        'unknown'
    );
}

/**
 * Maps a list of Graph Permission resources to a CMIS Acl.
 */
export function mapPermissionsToAcl(permissions: Permission[]): Acl {
    const aces: AclEntry[] = permissions.map(permission => ({
        principal: { principalId: getPrincipalId(permission) },
        permissions: mapGraphRolesToCmisPermissions(permission.roles),
        isDirect: !permission.inheritedFrom,
    }));

    return { aces, isExact: true };
}
