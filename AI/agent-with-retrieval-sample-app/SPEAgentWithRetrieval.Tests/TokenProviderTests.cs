using SPEAgentWithRetrieval.Core.Models;
using SPEAgentWithRetrieval.Core.Services;
using Xunit;

namespace SPEAgentWithRetrieval.Tests;

public class TokenProviderTests
{
    private const string ValidTenantId = "00000000-0000-0000-0000-000000000001";
    private const string ValidClientId = "00000000-0000-0000-0000-000000000002";

    private static TokenProvider Create(Microsoft365Options? options = null)
        => new(TestHelpers.Options(options ?? new Microsoft365Options
        {
            TenantId = ValidTenantId,
            ClientId = ValidClientId
        }));

    [Fact]
    public async Task GetTokenAsync_ReturnsExternalToken_WhenSet()
    {
        var provider = Create();
        provider.SetExternalToken("external-abc");

        var token = await provider.GetTokenAsync();

        Assert.Equal("external-abc", token);
    }

    [Fact]
    public async Task GetTokenAsync_ExternalToken_ShortCircuits_WithoutContactingAzure()
    {
        // No real credential flow should run when an external token is present, so this
        // completes instantly even though no Azure identity is configured.
        var provider = Create(new Microsoft365Options
        {
            TenantId = ValidTenantId,
            ClientId = ValidClientId,
            UseUserAuthentication = true,
            UseDeviceCodeAuth = true
        });
        provider.SetExternalToken("external-xyz");

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var token = await provider.GetTokenAsync(cts.Token);

        Assert.Equal("external-xyz", token);
    }
}
