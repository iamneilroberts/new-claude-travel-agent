# Claude Travel Agent Installer for Windows PowerShell

Write-Host "🌍 Claude Travel Agent Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check prerequisites
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            Write-Host "✅ $Command is installed" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ $Command is not installed" -ForegroundColor Red
        return $false
    }
}

Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow
$missingDeps = @()
$useDocker = $false

if (-not (Test-Command "node")) { $missingDeps += "Node.js" }
if (-not (Test-Command "npm")) { $missingDeps += "npm" }

# Docker is optional
if (Test-Command "docker") {
    Write-Host "✅ Docker found - local automation will be available" -ForegroundColor Green
    $useDocker = $true
} else {
    Write-Host "⚠️  Docker not found - remote services only" -ForegroundColor Yellow
}

if ($missingDeps.Count -gt 0) {
    Write-Host "`nPlease install missing dependencies first:" -ForegroundColor Red
    if ($missingDeps -contains "Node.js" -or $missingDeps -contains "npm") {
        Write-Host "- Node.js: https://nodejs.org/" -ForegroundColor Red
    }
    exit 1
}

# Find Claude Desktop config directory
$claudeConfigDir = "$env:APPDATA\Claude"
if (-not (Test-Path $claudeConfigDir)) {
    Write-Host "⚠️  Claude Desktop config directory not found" -ForegroundColor Yellow
    Write-Host "Please ensure Claude Desktop is installed"
    $customPath = Read-Host "Enter Claude config directory path (or press Enter to use $claudeConfigDir)"
    if ($customPath) {
        $claudeConfigDir = $customPath
    }
    New-Item -ItemType Directory -Force -Path $claudeConfigDir | Out-Null
}

Write-Host "✅ Using Claude config directory: $claudeConfigDir" -ForegroundColor Green

# Get configuration details
Write-Host "`nConfiguration Setup" -ForegroundColor Yellow
Write-Host "You'll need:"
Write-Host "1. Your Cloudflare Worker URL (e.g., travel-agent.YOUR-DOMAIN.workers.dev)"
Write-Host "2. Your MCP authentication token"
Write-Host ""
$workerDomain = Read-Host "Enter your Cloudflare Worker domain (without https://)"
$authToken = Read-Host "Enter your MCP auth token"

# Create configuration
Write-Host "`nCreating Claude Desktop configuration..." -ForegroundColor Yellow

$config = @{
    mcpServers = @{
        "travel-agent-remote" = @{
            command = "npx"
            args = @("mcp-use", "https://$workerDomain")
            env = @{
                MCP_USE_AUTH_TOKEN = $authToken
            }
        }
    }
}

# Add Docker config if available
if ($useDocker) {
    $config.mcpServers["cpmaxx-local"] = @{
        command = "docker"
        args = @(
            "run",
            "--rm",
            "-i",
            "--pull", "missing",
            "ghcr.io/iamneilroberts/claude-travel/mcp-cpmaxx-unified:latest"
        )
    }
}

$config | ConvertTo-Json -Depth 10 | Set-Content "$claudeConfigDir\claude_desktop_config.json"

# Test connection
Write-Host "`nTesting connection..." -ForegroundColor Yellow
try {
    $testResult = npx mcp-use test "https://$workerDomain" --token "$authToken" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not verify connection. Please check your credentials after restarting Claude." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify connection. Please check your credentials after restarting Claude." -ForegroundColor Yellow
}

# Success message
Write-Host "`n🎉 Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Desktop"
Write-Host "2. Look for 'travel-agent-remote' in the MCP tools"
Write-Host "3. Try asking: 'Search for flights from NYC to Paris next week'"
Write-Host ""
Write-Host "Configuration saved to: $claudeConfigDir\claude_desktop_config.json" -ForegroundColor Gray

if ($useDocker) {
    Write-Host ""
    Write-Host "Docker container will be downloaded on first use of local automation tools." -ForegroundColor Gray
}