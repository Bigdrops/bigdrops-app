#Requires -Version 5.1
<#
.SYNOPSIS
    Guided secure setup script for Bolu AI Provider (AMD Radeon Cloud Token Factory).
    Inspired by Hermes Agent provider configuration wizard.

.DESCRIPTION
    Allows an administrator to securely configure, test, and rotate the AMD API key
    for Bolu without exposing secrets to client bundles, logs, or git commits.
    Configures local development (.env.local) and remote deployment (Vercel).

.PARAMETER Key
    Optional SecureString containing the AMD API key. If omitted, prompts securely.

.PARAMETER Target
    Setup target: 'local', 'vercel', 'both', or 'test'. Defaults to interactive prompt.

.PARAMETER SkipTest
    If specified, skips the live pre-flight connection test to AMD.

.PARAMETER TimeoutMs
    Server timeout in milliseconds. Defaults to 60000 (recommended for Africa/China route).

.EXAMPLE
    pwsh -ExecutionPolicy Bypass -File scripts/setup-bolu-provider.ps1
    pwsh -ExecutionPolicy Bypass -File scripts/setup-bolu-provider.ps1 -Target local
    pwsh -ExecutionPolicy Bypass -File scripts/setup-bolu-provider.ps1 -Target test
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [System.Security.SecureString]$Key,

    [Parameter(Mandatory = $false)]
    [ValidateSet('local', 'vercel', 'both', 'test')]
    [string]$Target,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTest,

    [Parameter(Mandatory = $false)]
    [int]$TimeoutMs = 60000,

    [Parameter(Mandatory = $false)]
    [string]$Model = "DeepSeek-V4-Flash"
)

# Set Strict Mode & Error Action
$ErrorActionPreference = 'Stop'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot

function Write-Header {
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Cyan
    Write-Host "   BOURXE Bolu AI Provider Setup (Hermes-Inspired Wizard)    " -ForegroundColor Cyan
    Write-Host "==============================================================" -ForegroundColor Cyan
    Write-Host "Target Provider: AMD Radeon Cloud Token Factory" -ForegroundColor Yellow
    Write-Host "Endpoint:        https://developer.amd.com.cn/radeon/api/v1" -ForegroundColor Gray
    Write-Host "Default Model:   $Model" -ForegroundColor Gray
    Write-Host "Security Model:  Server-only environment custody (never in git/browser)" -ForegroundColor Gray
    Write-Host ""
}

function Convert-SecureStringToPlain {
    param([System.Security.SecureString]$Secure)
    if (-not $Secure) { return "" }
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
    }
    finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
}

function Mask-ApiKey {
    param([string]$RawKey)
    if (-not $RawKey) { return "" }
    if ($RawKey.Length -le 8) { return "••••••••" }
    $Tail = $RawKey.Substring($RawKey.Length - 4)
    return "••••$Tail"
}

function Test-AmdConnection {
    param([string]$PlainKey)
    Write-Host "[1/3] Testing live connection to AMD Token Factory..." -ForegroundColor Yellow
    $Endpoint = "https://developer.amd.com.cn/radeon/api/v1/chat/completions"
    $Headers = @{
        "Authorization" = "Bearer $PlainKey"
        "Content-Type"  = "application/json"
    }
    $Body = @{
        model = $Model
        messages = @(
            @{ role = "user"; content = "Say 'ok' in one word." }
        )
        max_tokens = 5
        temperature = 0.1
        stream = $false
    } | ConvertTo-Json

    try {
        $Response = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $Headers -Body $Body -TimeoutSec 25
        Write-Host "  [OK] AMD Token Factory connection verified!" -ForegroundColor Green
        if ($Response.choices -and $Response.choices[0].message.content) {
            $Snippet = $Response.choices[0].message.content.Trim()
            Write-Host "  [OK] Model test response received ($Model)." -ForegroundColor DarkGreen
        }
        return $true
    }
    catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        if ($StatusCode -eq 401 -or $StatusCode -eq 403) {
            Write-Host "  [FAIL] Authentication failed (HTTP $StatusCode). The AMD Token Factory rejected your API key." -ForegroundColor Red
            Write-Host "         Please verify that your key was copied correctly from developer.amd.com.cn." -ForegroundColor Red
            return $false
        }
        elseif ($StatusCode -eq 429) {
            Write-Host "  [WARN] Rate limit reached (HTTP 429). The key is valid, but currently rate-limited." -ForegroundColor Yellow
            return $true
        }
        else {
            Write-Host "  [WARN] Could not complete direct pre-flight test: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "         The AMD endpoint in China may be experiencing high latency or network filtering." -ForegroundColor DarkYellow
            $ProceedAnyway = Read-Host "  Do you want to proceed with configuration anyway? (y/n)"
            return ($ProceedAnyway -eq 'y' -or $ProceedAnyway -eq 'Y')
        }
    }
}

function Update-LocalEnv {
    param([string]$PlainKey)
    Write-Host "[2/3] Configuring local environment (.env.local)..." -ForegroundColor Yellow
    $EnvLocalPath = Join-Path $ProjectRoot ".env.local"
    $GitIgnorePath = Join-Path $ProjectRoot ".gitignore"

    # Verify .gitignore
    if (Test-Path $GitIgnorePath) {
        $GitIgnoreContent = Get-Content $GitIgnorePath -Raw
        if ($GitIgnoreContent -notmatch '\.env\.local') {
            Add-Content -Path $GitIgnorePath -Value "`n.env.local`n"
            Write-Host "  [SECURITY] Added .env.local to .gitignore to prevent accidental commits." -ForegroundColor DarkCyan
        }
    }

    $NewEntries = @{
        "BOLU_PROVIDER_NAME"       = "amd"
        "BOLU_PROVIDER_API_KEY"    = $PlainKey
        "BOLU_PROVIDER_BASE_URL"   = "https://developer.amd.com.cn/radeon/api/v1"
        "BOLU_PROVIDER_MODEL"      = $Model
        "BOLU_PROVIDER_TIMEOUT_MS" = "$TimeoutMs"
        "BOLU_PROVIDER_MODE"       = "live"
    }

    $Lines = @()
    if (Test-Path $EnvLocalPath) {
        $Lines = Get-Content $EnvLocalPath
    }

    $ExistingKeys = @{}
    $UpdatedLines = @()
    foreach ($Line in $Lines) {
        $Trimmed = $Line.Trim()
        if ($Trimmed -match '^([A-Za-z0-9_]+)=(.*)$') {
            $VarName = $Matches[1]
            if ($NewEntries.ContainsKey($VarName)) {
                $UpdatedLines += "$VarName=$($NewEntries[$VarName])"
                $ExistingKeys[$VarName] = $true
            } else {
                $UpdatedLines += $Line
            }
        } else {
            $UpdatedLines += $Line
        }
    }

    foreach ($VarName in $NewEntries.Keys) {
        if (-not $ExistingKeys.ContainsKey($VarName)) {
            $UpdatedLines += "$VarName=$($NewEntries[$VarName])"
        }
    }

    $UpdatedLines | Set-Content -Path $EnvLocalPath -Encoding UTF8
    Write-Host "  [SUCCESS] Local .env.local updated with AMD provider configuration." -ForegroundColor Green
    Write-Host "            API Key masked: $(Mask-ApiKey $PlainKey)" -ForegroundColor DarkGray
}

function Update-VercelEnv {
    param([string]$PlainKey)
    Write-Host "[3/3] Configuring remote Vercel environment variables..." -ForegroundColor Yellow

    # Check if Vercel CLI is available
    $VercelCmd = Get-Command "vercel" -ErrorAction SilentlyContinue
    if (-not $VercelCmd) {
        $VercelCmd = Get-Command "vercel.cmd" -ErrorAction SilentlyContinue
    }

    if (-not $VercelCmd) {
        Write-Host "  [NOTICE] Vercel CLI is not installed on this machine." -ForegroundColor Yellow
        Write-Host "  To configure Vercel remotely without manual dashboard navigation:" -ForegroundColor Cyan
        Write-Host "  1. Install Vercel CLI:  bun add -g vercel  (or npm i -g vercel)" -ForegroundColor Gray
        Write-Host "  2. Authenticate once:   vercel login" -ForegroundColor Gray
        Write-Host "  3. Link project:        vercel link" -ForegroundColor Gray
        Write-Host "  4. Re-run this script:  pwsh scripts/setup-bolu-provider.ps1 -Target vercel" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Alternatively, add these variables in Vercel Dashboard -> Settings -> Environment Variables:" -ForegroundColor Cyan
        Write-Host "    BOLU_PROVIDER_NAME       = amd" -ForegroundColor Gray
        Write-Host "    BOLU_PROVIDER_API_KEY    = $(Mask-ApiKey $PlainKey)" -ForegroundColor Gray
        Write-Host "    BOLU_PROVIDER_BASE_URL   = https://developer.amd.com.cn/radeon/api/v1" -ForegroundColor Gray
        Write-Host "    BOLU_PROVIDER_MODEL      = $Model" -ForegroundColor Gray
        Write-Host "    BOLU_PROVIDER_TIMEOUT_MS = $TimeoutMs" -ForegroundColor Gray
        Write-Host "    BOLU_PROVIDER_MODE       = live" -ForegroundColor Gray
        return
    }

    # Test Vercel authentication
    try {
        $WhoAmI = & $VercelCmd whoami 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [AUTH REQUIRED] Vercel CLI is installed but not authenticated." -ForegroundColor Yellow
            Write-Host "  Please run 'vercel login' first, then re-run this script." -ForegroundColor Cyan
            return
        }
        Write-Host "  [OK] Authenticated to Vercel as: $WhoAmI" -ForegroundColor DarkGreen
    }
    catch {
        Write-Host "  [WARN] Could not verify Vercel CLI login state: $_" -ForegroundColor Yellow
        return
    }

    $VarsToSet = @(
        @{ Name = "BOLU_PROVIDER_NAME";       Value = "amd" },
        @{ Name = "BOLU_PROVIDER_API_KEY";    Value = $PlainKey },
        @{ Name = "BOLU_PROVIDER_BASE_URL";   Value = "https://developer.amd.com.cn/radeon/api/v1" },
        @{ Name = "BOLU_PROVIDER_MODEL";      Value = $Model },
        @{ Name = "BOLU_PROVIDER_TIMEOUT_MS"; Value = "$TimeoutMs" },
        @{ Name = "BOLU_PROVIDER_MODE";       Value = "live" }
    )

    $Environments = @('production', 'preview')

    foreach ($Var in $VarsToSet) {
        foreach ($EnvName in $Environments) {
            Write-Host "  Setting $($Var.Name) for $EnvName..." -NoNewline
            # Remove previous if exists (rotation support)
            $null = & $VercelCmd env rm $Var.Name $EnvName -y 2>&1
            # Add new value via stdin
            $AddResult = $Var.Value | & $VercelCmd env add $Var.Name $EnvName 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host " [OK]" -ForegroundColor Green
            } else {
                Write-Host " [RETRY/INFO]" -ForegroundColor Yellow
            }
        }
    }

    Write-Host "  [SUCCESS] Vercel environment variables provisioned for production & preview." -ForegroundColor Green
    Write-Host ""
    Write-Host "  [IMPORTANT] Redeployment Required:" -ForegroundColor Yellow
    Write-Host "  Vercel serverless functions load environment variables at deployment time." -ForegroundColor Gray
    Write-Host "  Run 'vercel --prod' or click 'Redeploy' on your latest deployment in Vercel." -ForegroundColor Cyan
}

# --- Main Execution Flow ---
Write-Header

# 1. Determine Target
if (-not $Target) {
    Write-Host "Select setup action:" -ForegroundColor White
    Write-Host "  [1] Local Development (.env.local only)" -ForegroundColor Gray
    Write-Host "  [2] Remote Vercel Deployment (Production & Preview)" -ForegroundColor Gray
    Write-Host "  [3] Full Setup (Local .env.local + Remote Vercel)" -ForegroundColor Gray
    Write-Host "  [4] Test AMD Connection Only (Pre-Flight Verification)" -ForegroundColor Gray
    Write-Host "  [5] Rotate / Replace Existing Key" -ForegroundColor Gray
    Write-Host "  [Q] Quit" -ForegroundColor Gray
    Write-Host ""
    $Choice = Read-Host "Enter choice (1-5 or Q)"
    switch ($Choice) {
        '1' { $Target = 'local' }
        '2' { $Target = 'vercel' }
        '3' { $Target = 'both' }
        '4' { $Target = 'test' }
        '5' { $Target = 'both' }
        Default {
            Write-Host "Exiting setup." -ForegroundColor Yellow
            exit 0
        }
    }
}

# 2. Acquire API Key
$PlainKey = ""
if ($Key) {
    $PlainKey = Convert-SecureStringToPlain $Key
} else {
    Write-Host "Please enter your AMD API Key (input will be masked):" -ForegroundColor White
    $SecureInput = Read-Host -Prompt "AMD API Key" -AsSecureString
    $PlainKey = Convert-SecureStringToPlain $SecureInput
}

if (-not $PlainKey -or $PlainKey.Trim().Length -eq 0) {
    Write-Host "[ERROR] API key cannot be empty. Setup aborted." -ForegroundColor Red
    exit 1
}

$PlainKey = $PlainKey.Trim()

# Validate key prefix
if (-not $PlainKey.StartsWith("rc-")) {
    Write-Host "[WARNING] Key does not begin with standard AMD Token Factory prefix 'rc-'." -ForegroundColor Yellow
    $ProceedPrefix = Read-Host "Do you wish to continue with this key anyway? (y/n)"
    if ($ProceedPrefix -ne 'y' -and $ProceedPrefix -ne 'Y') {
        Write-Host "Setup aborted." -ForegroundColor Red
        exit 1
    }
}

# 3. Connection Test
if (-not $SkipTest) {
    $TestPassed = Test-AmdConnection -PlainKey $PlainKey
    if (-not $TestPassed -and $Target -ne 'test') {
        $ProceedFail = Read-Host "Pre-flight test failed. Still proceed with saving? (y/n)"
        if ($ProceedFail -ne 'y' -and $ProceedFail -ne 'Y') {
            Write-Host "Setup cancelled. Credentials were not saved." -ForegroundColor Red
            exit 1
        }
    }
}

if ($Target -eq 'test') {
    Write-Host ""
    Write-Host "[DONE] Test finished. No credentials were saved." -ForegroundColor Cyan
    exit 0
}

# 4. Provisioning
if ($Target -eq 'local' -or $Target -eq 'both') {
    Update-LocalEnv -PlainKey $PlainKey
}

if ($Target -eq 'vercel' -or $Target -eq 'both') {
    Update-VercelEnv -PlainKey $PlainKey
}

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "       Bolu AMD Provider Configuration Complete!             " -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Provider:   amd (AMD Radeon Cloud Token Factory)" -ForegroundColor Gray
Write-Host "  Model:      $Model" -ForegroundColor Gray
Write-Host "  Key:        $(Mask-ApiKey $PlainKey)" -ForegroundColor Gray
Write-Host "  Mode:       live" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Step: If deploying to Vercel, trigger a redeployment to activate." -ForegroundColor Cyan
Write-Host ""
