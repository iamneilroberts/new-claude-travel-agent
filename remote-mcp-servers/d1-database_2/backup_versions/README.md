# D1 Database MCP Server - Backup Versions

This directory contains historical versions and artifacts from the D1 database MCP server development and restoration process.

## Current Production Version (../src/)
- **src/index.ts** - Enhanced D1 MCP server with 15 tools including travel management
- **wrangler.pure-mcp.toml** - Production deployment configuration  
- **test-d1-connection.js** - Production test suite

## Backup Contents

### /old_source/
Historical source code versions:
- `index.js` - Original JavaScript implementation
- `robust-mcp-index.ts.backup-airport-only` - Critical backup that saved the project
- `tools/` - Previous modular tools structure

### /build_artifacts/
Compiled and generated files:
- `debug-build/` - Debug compilation outputs
- `dist/` - Distribution builds
- `index.js` - Compiled JavaScript
- `worker-mcpagent.js` - Worker agent script

### /data_scripts/
Database seeding and migration scripts:
- `airports_data*.sql` - Airport data chunks for database seeding
- `cities_data*.sql` - Cities data chunks
- `load-*.sh` - Data loading shell scripts
- `seed-airports.js` - Airport seeding script
- `split-data.js` - Data splitting utility
- `migrations/` - Database migration scripts

### /configurations/
Alternative configuration files:
- `biome.json` - Code formatting configuration
- `wrangler.robust.toml` - Alternative deployment config
- `wrangler.toml` - Legacy deployment config

### /working_versions/
Previous working implementations:
- `pure-mcp-index-alt-version.ts` - Alternative pure MCP implementation
- `robust-mcp-index-with-client-tools.ts` - Version with extensive client tools
- `working-clean-d1.ts` - Clean working version

## Recovery Notes
The file `robust-mcp-index.ts.backup-airport-only` was critical for restoring functionality when the main server was broken. It contained the working airport lookup implementation that was essential for the restoration process.

## Deployment History
- **Current**: wrangler.pure-mcp.toml → https://d1-database-pure.somotravel.workers.dev
- **Backup configs**: Various experimental wrangler configurations

## Last Updated
Generated during Step 3 cleanup - organizing single production version