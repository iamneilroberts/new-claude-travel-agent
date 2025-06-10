# DNS Caching Implementation for MCP Servers

## Problem Statement
Claude Desktop was experiencing `EAI_AGAIN` DNS resolution errors when starting multiple MCP servers concurrently. This happens because:
- All 8-10 MCP servers start simultaneously 
- Each uses `mcp-remote` to connect to Cloudflare Workers
- Concurrent DNS lookups overwhelm DNS resolution capacity
- Results in "temporary failure in DNS lookup" errors

## Solution: /etc/hosts DNS Caching

### How It Works
By adding static IP mappings to `/etc/hosts`, we eliminate network DNS lookups entirely:
```
104.21.27.54 d1-database-pure.somotravel.workers.dev  # MCP Cache
172.67.141.117 pure-amadeus-api-mcp.somotravel.workers.dev  # MCP Cache
```

When `mcp-remote` resolves hostnames:
1. Checks `/etc/hosts` first → finds cached IP instantly
2. Skips network DNS lookup completely  
3. Connects immediately without EAI_AGAIN risk

### Implementation Status

#### Phase 1: Single Server Test ✅ COMPLETED
- **Date**: June 9, 2025, 2:19 PM CDT
- **Server**: d1-database-pure.somotravel.workers.dev
- **IP Cached**: 104.21.27.54
- **Status**: DNS cache entry added to /etc/hosts
- **Next**: Test Claude Desktop with single server

## Implementation Scripts

### Test Scripts Created
- `/tmp/test_dns_cache_step1.sh` - Single server test (EXECUTED)
- `/tmp/implement_full_dns_cache.sh` - Full implementation for all servers
- `/tmp/verify_dns_cache.sh` - Verification and speed testing
- `/tmp/claude_desktop_config_dns_test.json` - Test configuration

### Management Commands
```bash
# View current cache
grep 'MCP.*Cache' /etc/hosts

# Verify DNS resolution speed
/tmp/verify_dns_cache.sh

# Remove cache entries
sudo sed -i '/# MCP.*Cache/d' /etc/hosts

# Restore original hosts file
sudo cp /etc/hosts.backup.YYYYMMDD_HHMMSS /etc/hosts
```

## Risk Mitigation

### IP Stability Testing
Cloudflare Workers IPs tested stable over 60-second intervals:
- d1-database: 104.21.27.54, 172.67.141.117 (stable)
- amadeus-api: 172.64.80.1 (stable)

### Backup Strategy
- Automatic timestamped backups: `/etc/hosts.backup.YYYYMMDD_HHMMSS`
- Easy rollback procedure
- Isolated MCP entries for clean removal

### Monitoring Requirements
- **Weekly IP checks**: Verify Cloudflare hasn't changed Worker IPs
- **Connection testing**: Monitor for any connection failures
- **Cache refresh**: Re-run implementation script if IPs change

## Testing Phases

### ✅ Phase 1: Single Server (COMPLETED)
- [x] Added d1-database DNS cache entry
- [ ] Test Claude Desktop with single server
- [ ] Verify EAI_AGAIN errors eliminated

### Phase 2: Multi-Server Test (PENDING)
- [ ] Run full implementation script
- [ ] Test with 3 servers (d1-database, amadeus-api, google-places)
- [ ] Confirm no DNS conflicts

### Phase 3: Full Deployment (PENDING)  
- [ ] Deploy all 10 MCP servers with DNS caching
- [ ] Monitor Claude Desktop startup logs
- [ ] Document performance improvements

## Troubleshooting

### If DNS Cache Fails
```bash
# Remove MCP cache entries
sudo sed -i '/# MCP.*Cache/d' /etc/hosts

# Fallback to staggered startup approach
cp /tmp/claude_desktop_config_staggered.json ~/.config/Claude/claude_desktop_config.json
```

### If IPs Change
```bash
# Refresh all DNS cache entries
sudo /tmp/implement_full_dns_cache.sh
```

### Connection Issues
```bash
# Test connectivity to cached IPs
curl -I https://d1-database-pure.somotravel.workers.dev/health

# Verify SSL certificate validity
openssl s_client -connect 104.21.27.54:443 -servername d1-database-pure.somotravel.workers.dev
```

## Performance Expectations

### Before DNS Caching
- Concurrent DNS lookups: 8-10 servers simultaneously
- DNS resolution time: ~24ms per lookup
- Failure rate: High EAI_AGAIN errors under load

### After DNS Caching
- DNS resolution time: <1ms (local /etc/hosts lookup)
- Failure rate: Eliminated (no network DNS dependency)
- Startup time: Significantly faster concurrent connections

## Files Modified
- `/etc/hosts` - DNS cache entries added
- `/etc/hosts.backup.20250609_141926` - Original backup

## Next Steps
1. Test Claude Desktop with single cached server
2. If successful, implement full DNS caching
3. Deploy complete MCP server configuration
4. Monitor and document performance improvements