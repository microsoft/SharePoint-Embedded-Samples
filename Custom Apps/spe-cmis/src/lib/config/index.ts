/**
 * Configuration management for the SPE-CMIS adapter service.
 * Centralizes environment variables and application settings.
 */

export interface AppConfig {
    /** Azure AD client/application ID */
    clientId: string;
    /** Azure AD client secret for app-only auth */
    clientSecret: string;
    /** Azure AD tenant ID, or 'organizations' for multi-tenant work/school accounts */
    tenantId: string;
}

/**
 * Loads configuration from environment variables.
 * Throws if required variables are missing.
 */
export function loadConfig(): AppConfig {
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            'Missing required environment variables: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET'
        );
    }

    return {
        clientId,
        clientSecret,
        tenantId: process.env.AZURE_TENANT_ID || 'organizations',
    };
}

/** Cached config instance */
let cachedConfig: AppConfig | null = null;

/**
 * Gets the application configuration (cached after first load).
 */
export function getConfig(): AppConfig {
    if (!cachedConfig) {
        cachedConfig = loadConfig();
    }
    return cachedConfig;
}

/**
 * Clears the cached configuration (useful for testing).
 */
export function clearConfigCache(): void {
    cachedConfig = null;
}
