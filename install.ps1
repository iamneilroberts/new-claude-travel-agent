# Claude Travel Agent Installer for Windows PowerShell

Write-Host "🌍 Claude Travel Agent Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script should be run as Administrator for Docker checks." -ForegroundColor Yellow
    Write-Host "Continuing with limited checks..." -ForegroundColor Yellow
}

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

if (-not (Test-Command "docker")) { $missingDeps += "Docker Desktop" }
if (-not (Test-Command "node")) { $missingDeps += "Node.js" }
if (-not (Test-Command "npm")) { $missingDeps += "npm" }

if ($missingDeps.Count -gt 0) {
    Write-Host "`nPlease install missing dependencies first:" -ForegroundColor Red
    if ($missingDeps -contains "Docker Desktop") {
        Write-Host "- Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
    }
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

# Install mcp-use
Write-Host "`nInstalling MCP proxy..." -ForegroundColor Yellow
npm install -g mcp-use

# Pull Docker container
Write-Host "`nPulling Claude Travel Agent container..." -ForegroundColor Yellow
try {
    docker pull ghcr.io/iamneilroberts/claude-travel/mcp-cpmaxx-unified:latest
} catch {
    Write-Host "Note: Container not yet published. Will be available after first release." -ForegroundColor Yellow
}

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
        "cpmaxx-local" = @{
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
}

$config | ConvertTo-Json -Depth 10 | Set-Content "$claudeConfigDir\claude_desktop_config.json"

# Create desktop extension directory
Write-Host "`nCreating desktop extensions..." -ForegroundColor Yellow
$extensionDir = "$env:USERPROFILE\.claude-extensions"
New-Item -ItemType Directory -Force -Path $extensionDir | Out-Null

$extension = @{
    name = "Claude Travel Agent"
    description = "Complete travel planning assistant"
    version = "2.0.0"
    author = "Neil Roberts"
    mcp = @{
        command = "npx"
        args = @("mcp-use", "https://$workerDomain")
        env = @{
            MCP_USE_AUTH_TOKEN = $authToken
        }
    }
    metadata = @{
        icon = "✈️"
        categories = @("travel", "planning", "automation")
        capabilities = @(
            "Flight search (Amadeus)",
            "Hotel search (Google Places)",
            "Travel package search (CPMaxx)",
            "Itinerary generation",
            "Mobile notifications",
            "Document creation"
        )
    }
}

$extension | ConvertTo-Json -Depth 10 | Set-Content "$extensionDir\travel-agent.dxt"

# Success message
Write-Host "`n🎉 Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Desktop"
Write-Host "2. Look for 'travel-agent-remote' in the MCP tools"
Write-Host "3. Try asking: 'Search for flights from NYC to Paris next week'"
Write-Host ""
Write-Host "Configuration saved to: $claudeConfigDir\claude_desktop_config.json" -ForegroundColor Gray
Write-Host "Desktop extension saved to: $extensionDir\travel-agent.dxt" -ForegroundColor Gray
Write-Host ""
Write-Host "For updates, run:" -ForegroundColor Gray
Write-Host "iwr -useb https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/update.ps1 | iex" -ForegroundColor Yellow