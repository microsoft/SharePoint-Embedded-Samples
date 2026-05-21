# SPE Setup — Gotchas and Edge Cases

Reference material from live testing. The scripts handle all of these automatically.

1. **`az login` needs `--allow-no-subscriptions`** — M365-only tenants have no Azure subscriptions.
2. **Graph API field is `name`, NOT `displayName`** — For container type creation.
3. **Response field is `id`, NOT `containerTypeId`** — Container type ID comes back as `id`.
4. **Permission GUIDs are critical** — `085ca537...`, `8e6ec84c...`, `c319a7df...` (in `_common.ps1`).
5. **Registration MUST include `applicationPermissionGrants`** — Without it, container creation fails with `UnauthorizedAccessException`.
6. **Each owning app gets ONE container type** — Scripts check before creating.
7. **Trial vs Standard billing** — `trial` works without billing policy. `standard` needs tenant config.
8. **New containers start `inactive`** — Must call `/activate`.
9. **Registration propagation delay (10-30s)** — `accessDenied` after registration is normal. Scripts retry with backoff.
10. **Service principal auto-created** — Device code sign-in creates it automatically.
11. **Trial CT limit is 3 per tenant** — Delete old ones or use `06-cleanup.ps1`.
