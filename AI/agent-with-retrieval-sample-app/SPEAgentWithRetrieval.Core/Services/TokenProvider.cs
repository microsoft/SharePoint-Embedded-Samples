using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Options;
using SPEAgentWithRetrieval.Core.Models;

namespace SPEAgentWithRetrieval.Core.Services;

public interface ITokenProvider
{
    Task<string> GetTokenAsync(CancellationToken cancellationToken = default);
    void SetExternalToken(string token);
}

public class TokenProvider : ITokenProvider
{
    private readonly Microsoft365Options _microsoft365Options;
    private readonly TokenCredential _credential;
    private string? _externalToken;

    public TokenProvider(IOptions<Microsoft365Options> microsoft365Options)
    {
        _microsoft365Options = microsoft365Options.Value;

        // Configure the credential based on settings
        _credential = _microsoft365Options.UseUserAuthentication
            ? CreateUserCredential()
            : new DefaultAzureCredential();
    }

    private TokenCredential CreateUserCredential()
    {
        // Device code flow: works in headless/console environments where a
        // browser cannot be launched automatically. Prints a URL + code to enter.
        if (_microsoft365Options.UseDeviceCodeAuth)
        {
            return CreateDeviceCodeCredential();
        }

        // Prefer InteractiveBrowserCredential, but provide a genuine fallback to device code.
        // A browser failure surfaces during token acquisition (not construction), so wrapping
        // construction in try/catch would never trigger the fallback. ChainedTokenCredential
        // instead tries the browser first and transparently falls back to device code when the
        // browser flow cannot acquire a token (e.g. no browser available in the environment).
        var interactiveCredential = new InteractiveBrowserCredential(new InteractiveBrowserCredentialOptions
        {
            TenantId = _microsoft365Options.TenantId,
            ClientId = _microsoft365Options.ClientId,
            RedirectUri = new Uri("http://localhost"),
            TokenCachePersistenceOptions = CreateTokenCacheOptions(),
            BrowserCustomization = new BrowserCustomizationOptions
            {
                UseEmbeddedWebView = false
            }
        });

        return new ChainedTokenCredential(interactiveCredential, CreateDeviceCodeCredential());
    }

    private DeviceCodeCredential CreateDeviceCodeCredential()
    {
        return new DeviceCodeCredential(new DeviceCodeCredentialOptions
        {
            TenantId = _microsoft365Options.TenantId,
            ClientId = _microsoft365Options.ClientId,
            TokenCachePersistenceOptions = CreateTokenCacheOptions(),
            DeviceCodeCallback = (code, cancellation) =>
            {
                Console.WriteLine($"\nTo authenticate, please visit: {code.VerificationUri}");
                Console.WriteLine($"And enter the code: {code.UserCode}");
                Console.WriteLine("Waiting for authentication to complete...");
                return Task.CompletedTask;
            }
        });
    }

    private static TokenCachePersistenceOptions CreateTokenCacheOptions()
    {
        // The MSAL token cache is always persisted using the OS-level encrypted
        // secret store (DPAPI on Windows, Keychain on macOS, libsecret on Linux).
        // Unencrypted on-disk storage is intentionally never enabled.
        return new TokenCachePersistenceOptions
        {
            Name = "SPEAgentAuthCache"
        };
    }

    public async Task<string> GetTokenAsync(CancellationToken cancellationToken = default)
    {
        // If an external token was provided (e.g., from the web UI), use it
        if (!string.IsNullOrEmpty(_externalToken))
        {
            return _externalToken;
        }

        try
        {
            // Otherwise, get a token from the credential
            var token = await _credential.GetTokenAsync(
                new TokenRequestContext(_microsoft365Options.Scopes),
                cancellationToken);
                
            return token.Token;
        }
        catch (AuthenticationFailedException ex) when (ex.Message.Contains("AADSTS9002327"))
        {
            throw new InvalidOperationException(
                "Authentication failed: The Azure AD app registration is configured as a Single-Page Application (SPA) " +
                "but this console application requires a Public Client configuration. " +
                "Please update the app registration in Azure Portal:\n" +
                "1. Go to Azure Portal > Azure Active Directory > App registrations\n" +
                "2. Find your app and go to Authentication\n" +
                "3. Remove Single-page application platform\n" +
                "4. Add Mobile and desktop applications platform with redirect URI: http://localhost\n" +
                "5. Set 'Allow public client flows' to Yes", ex);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to acquire token: {ex.Message}", ex);
        }
    }

    public void SetExternalToken(string token)
    {
        _externalToken = token;
    }
}
