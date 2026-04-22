#requires -Version 5.1
<#
.SYNOPSIS
    Step 4: Interactive authentication for SPE-scoped token.
.DESCRIPTION
    Acquires a token via interactive auth code + PKCE flow (opens browser).
    Falls back to device code flow if browser cannot be launched.
    Token is cached to .spe-token for reuse by subsequent scripts.
    If a valid cached token exists, skips auth entirely.
.PARAMETER UseDeviceCode
    Force device code flow instead of interactive browser auth.
#>

param(
    [switch]$UseDeviceCode
)

. "$PSScriptRoot\_common.ps1"

$spe = Assert-EnvKeys @("TENANT_ID", "CLIENT_ID")
$tenantId = $spe["TENANT_ID"]
$appId = $spe["CLIENT_ID"]
$tokenPath = Join-Path (Get-Location) ".spe-token"
$scopes = "FileStorageContainer.Selected FileStorageContainerType.Manage.All FileStorageContainerTypeReg.Manage.All"
$redirectUri = "http://localhost:3000"

Write-Host "`n=== Step 4: SPE Authentication ===" -ForegroundColor Cyan

# Validate that the app is a public client
try {
    $bootstrapHeaders = Get-BootstrapHeaders
    $appDetails = Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications?`$filter=appId eq '$appId'" -Headers $bootstrapHeaders
    $appObj = $appDetails.value | Select-Object -First 1
    if ($appObj -and $appObj.isFallbackPublicClient -ne $true) {
        Write-Host "  WARNING: App '$appId' is not configured as a public client (isFallbackPublicClient = false)." -ForegroundColor Red
        Write-Host "  Interactive and device code flows only work with public client applications." -ForegroundColor Red
        throw "App '$appId' is a confidential client. Auth requires a public client application."
    }
} catch [System.Management.Automation.RuntimeException] {
    if ($_ -match "confidential client") { throw }
    Write-Host "  Could not verify app client type (bootstrap token may be unavailable). Proceeding..." -ForegroundColor Yellow
}

# Check for cached token
$speToken = $null
if (Test-Path $tokenPath) {
    $cachedToken = (Get-Content $tokenPath -Raw).Trim()
    if ($cachedToken) {
        try {
            $payload = $cachedToken.Split('.')[1]
            switch ($payload.Length % 4) {
                2 { $payload += '==' }
                3 { $payload += '=' }
            }
            $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
            $expiry = [DateTimeOffset]::FromUnixTimeSeconds($decoded.exp).LocalDateTime
            if ($expiry -gt (Get-Date).AddMinutes(2)) {
                $speToken = $cachedToken
                Write-Host "  Using cached SPE token (expires $($expiry.ToString('HH:mm:ss')))" -ForegroundColor Green
            } else {
                Write-Host "  Cached token expired. Starting authentication..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Could not read cached token. Starting authentication..." -ForegroundColor Yellow
        }
    }
}

$authMethod = "Cached"

if (-not $speToken) {
    if (-not $UseDeviceCode) {
        # ── Interactive auth code + PKCE flow ─────────────────────────────────
        Write-Host "  Attempting interactive browser login..." -ForegroundColor Gray

        # Generate PKCE code verifier and challenge
        $codeVerifierBytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($codeVerifierBytes)
        $codeVerifier = [Convert]::ToBase64String($codeVerifierBytes) -replace '\+','-' -replace '/','_' -replace '='
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        $challengeBytes = $sha256.ComputeHash([System.Text.Encoding]::ASCII.GetBytes($codeVerifier))
        $codeChallenge = [Convert]::ToBase64String($challengeBytes) -replace '\+','-' -replace '/','_' -replace '='

        # Generate state for CSRF protection
        $stateBytes = New-Object byte[] 16
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($stateBytes)
        $state = [Convert]::ToBase64String($stateBytes) -replace '\+','-' -replace '/','_' -replace '='

        # Load System.Web for query string parsing (not loaded by default in PS 5.1)
        try { Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue } catch {}

        # Start localhost listener
        $port = 3000
        $listener = $null
        try {
            $listener = New-Object System.Net.HttpListener
            $listener.Prefixes.Add("http://localhost:${port}/")
            $listener.Start()
        } catch {
            Write-Host "  Could not start listener on port $port. Falling back to device code flow..." -ForegroundColor Yellow
            $UseDeviceCode = $true
        }

        if ($listener -and $listener.IsListening) {
            # Build authorization URL
            $encodedScopes = [System.Uri]::EscapeDataString($scopes)
            $encodedRedirect = [System.Uri]::EscapeDataString($redirectUri)
            $authUrl = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/authorize?" +
                "client_id=$appId" +
                "&response_type=code" +
                "&redirect_uri=$encodedRedirect" +
                "&scope=$encodedScopes" +
                "&state=$state" +
                "&code_challenge=$codeChallenge" +
                "&code_challenge_method=S256" +
                "&prompt=select_account"

            # Open browser
            Write-Host ""
            Write-Host "  Opening browser for sign-in..." -ForegroundColor White
            try {
                Start-Process $authUrl
            } catch {
                Write-Host "  Could not open browser. Falling back to device code flow..." -ForegroundColor Yellow
                $listener.Stop()
                $listener.Close()
                $UseDeviceCode = $true
            }
        }

        if ($listener -and $listener.IsListening -and -not $UseDeviceCode) {
            Write-Host "  Waiting for sign-in callback on http://localhost:${port}/ ..." -ForegroundColor Gray
            Write-Host "  (If the browser did not open, visit the URL above manually)" -ForegroundColor Gray

            # Wait for the callback (timeout after 300 seconds)
            $asyncResult = $listener.BeginGetContext($null, $null)
            $waitResult = $asyncResult.AsyncWaitHandle.WaitOne(300000)

            if (-not $waitResult) {
                Write-Host "  Timed out waiting for browser callback. Falling back to device code flow..." -ForegroundColor Yellow
                $listener.Stop()
                $listener.Close()
                $UseDeviceCode = $true
            } else {
                $context = $listener.EndGetContext($asyncResult)
                $request = $context.Request
                $response = $context.Response

                # Parse the callback
                $queryParams = [System.Web.HttpUtility]::ParseQueryString($request.Url.Query)
                $authCode = $queryParams["code"]
                $returnedState = $queryParams["state"]
                $authError = $queryParams["error"]

                # Send success page to browser
                $html = "<html><body><h2>Authentication successful!</h2><p>You can close this window and return to your terminal.</p></body></html>"
                if ($authError) {
                    $html = "<html><body><h2>Authentication failed</h2><p>Error: $authError</p><p>Close this window and check your terminal.</p></body></html>"
                }
                $htmlBytes = [System.Text.Encoding]::UTF8.GetBytes($html)
                $response.ContentLength64 = $htmlBytes.Length
                $response.ContentType = "text/html"
                $response.OutputStream.Write($htmlBytes, 0, $htmlBytes.Length)
                $response.OutputStream.Close()

                $listener.Stop()
                $listener.Close()

                if ($authError) {
                    $errorDesc = $queryParams["error_description"]
                    Write-Host "  Auth error: $authError - $errorDesc" -ForegroundColor Red
                    Write-Host "  Falling back to device code flow..." -ForegroundColor Yellow
                    $UseDeviceCode = $true
                } elseif ($returnedState -ne $state) {
                    Write-Host "  State mismatch (possible CSRF). Falling back to device code flow..." -ForegroundColor Red
                    $UseDeviceCode = $true
                } elseif ($authCode) {
                    # Exchange auth code for token
                    $tokenBody = "client_id=$appId" +
                        "&grant_type=authorization_code" +
                        "&code=$authCode" +
                        "&redirect_uri=$encodedRedirect" +
                        "&code_verifier=$codeVerifier"

                    try {
                        $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Method POST -Body $tokenBody
                        $speToken = $tokenResponse.access_token
                        $authMethod = "Interactive (Browser)"
                        Write-Host "  SPE token acquired via interactive login" -ForegroundColor Green
                    } catch {
                        $errMsg = $_.ErrorDetails.Message
                        Write-Host "  Token exchange failed: $errMsg" -ForegroundColor Red
                        Write-Host "  Falling back to device code flow..." -ForegroundColor Yellow
                        $UseDeviceCode = $true
                    }
                } else {
                    Write-Host "  No auth code received. Falling back to device code flow..." -ForegroundColor Yellow
                    $UseDeviceCode = $true
                }
            }
        }
    }

    # ── Device code flow (fallback or explicit) ───────────────────────────────
    if (-not $speToken -and $UseDeviceCode) {
        Write-Host "  Using device code flow..." -ForegroundColor Gray
        $deviceCodeBody = "client_id=$appId&scope=$scopes"
        $deviceCode = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/devicecode" -Method POST -Body $deviceCodeBody

        Write-Host ""
        Write-Host "  ACTION REQUIRED:" -ForegroundColor Yellow
        Write-Host "  $($deviceCode.message)" -ForegroundColor White
        Write-Host "  (First time: you will see a consent prompt - click Accept)" -ForegroundColor Gray
        Write-Host ""

        $pollBody = "client_id=$appId&grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=$($deviceCode.device_code)"
        $pollInterval = [Math]::Max([int]$deviceCode.interval, 5)

        while (-not $speToken) {
            Start-Sleep -Seconds $pollInterval
            try {
                $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Method POST -Body $pollBody
                $speToken = $tokenResponse.access_token
                $authMethod = "Device Code"
            } catch {
                $errBody = $null
                try { $errBody = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
                if ($errBody -and $errBody.error -eq "authorization_pending") {
                    Write-Host "  Waiting for authorization..." -ForegroundColor Gray
                } elseif ($errBody -and $errBody.error -eq "slow_down") {
                    $pollInterval += 5
                } else {
                    $errMsg = if ($errBody) { $errBody.error_description } else { $_.Exception.Message }
                    throw "Device code flow failed: $errMsg"
                }
            }
        }
    }

    if (-not $speToken) {
        throw "Failed to acquire SPE token via any auth method."
    }

    [System.IO.File]::WriteAllText($tokenPath, $speToken, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  SPE token cached to $tokenPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: OK"
Write-Host "Auth Method: $authMethod"
Write-Host "Scopes: Container.Selected, ContainerType.Manage, ContainerTypeReg.Manage"
Write-Host "Token Cache: $tokenPath"
Write-Host "=== END ==="  -ForegroundColor Green
Write-Host "[AGENT] STOP. Show the RESULT as a markdown table. Then ask the user to continue. Do NOT run the next script yet." -ForegroundColor DarkGray
Write-Host ""
