# Graph API Reference for SharePoint Embedded

## API Stability

Scripts use v1.0 endpoints where available. Beta-only endpoints are documented below.

| Endpoint Category | API Version | Notes |
|-------------------|-------------|-------|
| Container Types CRUD | **v1.0** | Stable |
| Container Type Registrations | **v1.0** | Stable |
| Containers CRUD (create, list, get, delete, activate) | **v1.0** | Stable |
| Container Permissions | **beta** | No v1.0 equivalent — required for permission management |
| Container Lock/Unlock | **beta** | No v1.0 equivalent — required for archive/restore |
| Deleted Containers (list, restore, purge) | **beta** | No v1.0 equivalent |
| Custom Properties | **v1.0** | Stable |
| Container Drive | **v1.0** | Stable |
| Drive/DriveItem Operations | **v1.0** | Stable |
| App Registration | **v1.0** | Stable |

## Contents

- [Container Types](#container-types)
- [Container Type Registrations](#container-type-registrations)
- [Containers](#containers)
- [Container Permissions](#container-permissions)
- [Custom Properties](#custom-properties)
- [Container Drive](#container-drive)
- [Deleted Containers](#deleted-containers)
- [Common Errors](#common-errors)

---

## Container Types

| Operation | Method | Endpoint | Auth Scope |
|-----------|--------|----------|------------|
| Create | `POST` | `/containerTypes` | `FileStorageContainerType.Manage.All` |
| List | `GET` | `/containerTypes` | `FileStorageContainerType.Manage.All` |
| Get | `GET` | `/containerTypes/{id}` | `FileStorageContainerType.Manage.All` |
| Update | `PATCH` | `/containerTypes/{id}` | `FileStorageContainerType.Manage.All` |
| Delete | `DELETE` | `/containerTypes/{id}` | `FileStorageContainerType.Manage.All` |

### Create Container Type

```http
POST https://graph.microsoft.com/beta/storage/fileStorage/containerTypes
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "My Container Type",
  "owningAppId": "app-id-guid",
  "billingClassification": "trial"
}
```

> **GOTCHA:** The field is `name`, NOT `displayName`. Using `displayName` returns an error.

> **GOTCHA:** The response returns the container type ID as `id`, NOT `containerTypeId`.

### Optional Settings (Create or Update)

```json
{
  "name": "My Container Type",
  "owningAppId": "app-id-guid",
  "billingClassification": "trial",
  "settings": {
    "isDiscoverabilityEnabled": false,
    "isItemVersioningEnabled": true,
    "isSearchEnabled": true,
    "isSharingRestricted": false,
    "itemMajorVersionLimit": 500,
    "maxStoragePerContainerInBytes": 27487790694400,
    "sharingCapability": "disabled",
    "urlTemplate": "myapp/{containerName}",
    "consumingTenantOverridables": "isSearchEnabled,itemMajorVersionLimit",
    "agent": {
      "chatEmbedAllowedHosts": ["https://myapp.com"]
    }
  }
}
```

---

## Container Type Registrations

| Operation | Method | Endpoint | Auth Scope |
|-----------|--------|----------|------------|
| Register (create/replace) | `PUT` | `/containerTypeRegistrations/{containerTypeId}` | `FileStorageContainerTypeReg.Manage.All` |
| List | `GET` | `/containerTypeRegistrations` | `FileStorageContainerTypeReg.Manage.All` |
| Get | `GET` | `/containerTypeRegistrations/{containerTypeId}` | `FileStorageContainerTypeReg.Manage.All` |
| Delete | `DELETE` | `/containerTypeRegistrations/{containerTypeId}` | `FileStorageContainerTypeReg.Manage.All` |

### Register Container Type

```http
PUT https://graph.microsoft.com/beta/storage/fileStorage/containerTypeRegistrations/{containerTypeId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "applicationPermissionGrants": [
    {
      "appId": "your-app-id",
      "delegatedPermissions": ["full"],
      "applicationPermissions": ["full"]
    }
  ]
}
```

> **CRITICAL:** If `applicationPermissionGrants` is empty or omitted, container creation will fail with `UnauthorizedAccessException`. The consuming tenant store will have no permissions record for the app.

---

## Containers

| Operation | Method | Endpoint | Auth Scope |
|-----------|--------|----------|------------|
| Create | `POST` | `/containers` | `FileStorageContainer.Selected` |
| List | `GET` | `/containers?$filter=containerTypeId eq '{id}'` | `FileStorageContainer.Selected` |
| Get | `GET` | `/containers/{containerId}` | `FileStorageContainer.Selected` |
| Update | `PATCH` | `/containers/{containerId}` | `FileStorageContainer.Selected` |
| Delete | `DELETE` | `/containers/{containerId}` | `FileStorageContainer.Selected` |
| Activate | `POST` | `/containers/{containerId}/activate` | `FileStorageContainer.Selected` |
| Lock | `POST` | `/containers/{containerId}/lock` | `FileStorageContainer.Selected` |
| Unlock | `POST` | `/containers/{containerId}/unlock` | `FileStorageContainer.Selected` |
| Permanent Delete | `POST` | `/containers/{containerId}/permanentDelete` | `FileStorageContainer.Selected` |

### Create Container

```http
POST https://graph.microsoft.com/beta/storage/fileStorage/containers
Content-Type: application/json
Authorization: Bearer {token}

{
  "containerTypeId": "container-type-id",
  "displayName": "My Container",
  "description": "Optional description"
}
```

> **GOTCHA:** New containers start as `inactive`. You must call `/activate` to make them operational.

### Optional Container Settings

```json
{
  "containerTypeId": "container-type-id",
  "displayName": "My Container",
  "settings": {
    "isOcrEnabled": true,
    "isItemVersioningEnabled": true,
    "itemMajorVersionLimit": 50,
    "itemDefaultSensitivityLabelId": "label-guid"
  }
}
```

---

## Container Permissions

| Operation | Method | Endpoint | Auth Scope |
|-----------|--------|----------|------------|
| Create | `POST` | `/containers/{id}/permissions` | `FileStorageContainer.Selected` |
| List | `GET` | `/containers/{id}/permissions` | `FileStorageContainer.Selected` |
| Get | `GET` | `/containers/{id}/permissions/{permId}` | `FileStorageContainer.Selected` |
| Update | `PATCH` | `/containers/{id}/permissions/{permId}` | `FileStorageContainer.Selected` |
| Delete | `DELETE` | `/containers/{id}/permissions/{permId}` | `FileStorageContainer.Selected` |

### Create Permission

```http
POST https://graph.microsoft.com/beta/storage/fileStorage/containers/{containerId}/permissions
Content-Type: application/json
Authorization: Bearer {token}

{
  "roles": ["writer"],
  "grantedToV2": {
    "user": {
      "userPrincipalName": "user@contoso.com"
    }
  }
}
```

Valid roles: `reader`, `writer`, `manager`, `owner`

> **GOTCHA:** The field is `userPrincipalName`, NOT `email`.

---

## Custom Properties

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get | `GET` | `/containers/{id}/customProperties` |
| Set | `PATCH` | `/containers/{id}/customProperties` |

### Set Custom Properties

```http
PATCH https://graph.microsoft.com/beta/storage/fileStorage/containers/{containerId}/customProperties
Content-Type: application/json

{
  "myProperty": {
    "value": "hello",
    "isSearchable": true
  }
}
```

Set `value` to `null` to delete a property.

---

## Container Drive

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Drive | `GET` | `/containers/{id}/drive` |

Returns the OneDrive drive (document library) associated with the container. Use standard Drive/DriveItem APIs for file operations.

---

## Deleted Containers

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List | `GET` | `/deletedContainers` |
| Get | `GET` | `/deletedContainers/{id}` |
| Restore | `POST` | `/deletedContainers/{id}/restore` |
| Purge | `DELETE` | `/deletedContainers/{id}` |

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `UnauthorizedAccessException` on container creation | Registration has no `applicationPermissionGrants` | Re-register with PUT including the `applicationPermissionGrants` array |
| "Container type must have a name, owning app id and container type id" | Used `displayName` instead of `name` in CT creation | Use `name` field |
| `403 Forbidden` | Token missing required scope | Check `scp` claim in JWT; re-declare permissions on app |
| "Billing policy not found" | Used `billingClassification: standard` on dev tenant | Use `trial` for development |
| Each owning app can only have one container type | App already has a CT | Check existing CTs before creating |
