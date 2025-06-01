# Slash Commands for Claude Travel Agent

This document describes the slash command system that provides quick shortcuts for common operations in the Claude Travel Agent.

## Quick Start

The most common commands:
- `/t` or `/go` - Initialize the travel assistant
- `/p` - Manage prompts
- `/h` - Get help

## Available Commands

### Travel Assistant

#### `/travel` (aliases: `/t`, `/init-travel`, `/travel-init`, `/start`)
Initialize the travel assistant with multiple options and fallbacks.

**Usage:** 
- `/travel` or `/t` - Default initialization (uses prompt-server)
- `/travel check` - List available travel prompts in database
- `/travel db` - Load from database (fallback if prompt-server fails)
- `/travel full` - Load all travel-related prompts
- `/travel load <name>` - Load specific prompt by name
- `/travel setup` - Interactive setup wizard
- `/travel custom [components]` - Custom initialization with specific features
- `/travel help` - Show all travel initialization options

**Examples:**
```
/t                               # Quick start
/travel check                    # See what's available
/travel db                       # Use database fallback
/travel load travel_agent_pro    # Load specific prompt
/travel custom flights hotels    # Custom setup with flights and hotels
/travel setup                    # Interactive wizard
```

#### `/go` (aliases: `/g`, `/init`)
Quick start command for the travel assistant (same as `/travel`).

**Usage:** `/go` or `/g`

**Troubleshooting:**
- If `/t` returns unexpected content (like a pricing prompt), use `/travel db` or `/travel setup`
- Check available prompts with `/travel check` or `/prompts search travel`
- Create custom configurations with `/travel custom`

### Prompt Management

#### `/prompts` (aliases: `/p`, `/prompt`)
View and manage prompts stored in the D1 database.

**Usage:** `/prompts [subcommand]`

**Subcommands:**
- `list` - List all prompts organized by category
- `view <name>` - View detailed information about a specific prompt
- `dashboard` - Show comprehensive prompt management dashboard
- `search <keywords>` - Search prompts by name, description, or content
- `category [name]` - List categories or prompts in a specific category
- `edit <name>` - Edit an existing prompt
- `create <name>` - Create a new prompt with guided workflow
- `update <name> <field> <value>` - Update a specific field of a prompt
- `delete <name>` - Delete a prompt

**Examples:**
- `/p list` - List all prompts
- `/p view travel_system_prompt` - View the travel system prompt
- `/p search flight` - Search for prompts containing "flight"
- `/p category travel` - List all prompts in the travel category
- `/p update travel_assistant description "Enhanced travel planning assistant"` - Update description
- `/p update travel_assistant tags "travel,planning,flights,hotels"` - Update tags

### Server Management

#### `/servers` (aliases: `/s`, `/list-servers`)
List all available MCP servers.

**Usage:** `/servers`

#### `/connect` (aliases: `/c`)
Connect to a specific MCP server.

**Usage:** `/connect <server-name>`

**Example:** `/connect amadeus-api`

### Tools

#### `/tools` (aliases: `/tool`, `/list-tools`)
List available tools from all servers or a specific server.

**Usage:** `/tools [server-name]`

**Examples:**
- `/tools` - List all available tools
- `/tools amadeus-api` - List tools from the amadeus-api server

### Prompt Creation

#### `/create-prompt` (aliases: `/cp`)
Create a new prompt with structured input in a single command.

**Usage:** `/create-prompt <name> <description> <category> <content> [tags]`

**Example:** 
```
/cp travel-assistant "Helpful travel planning assistant" travel "You are a knowledgeable travel assistant..." "travel,planning"
```

### Help

#### `/help` (aliases: `/h`, `/?`)
Show help information about available commands.

**Usage:** `/help [command]`

**Examples:**
- `/help` - Show all available commands
- `/help prompts` - Show detailed help for the prompts command

## Implementation Details

The slash command system is implemented in:
- `/windows-mcp-bridge/mcp_use/agents/slash_commands.py` - Command handler
- `/windows-mcp-bridge/mcp_use/agents/mcpagent.py` - Integration with MCP agent
- `/windows-mcp-bridge/mcp_use/agents/prompt_viewer.py` - Prompt viewing utilities

### How It Works

1. When a user types a message starting with `/`, the system recognizes it as a command
2. The command is parsed to extract the command name, subcommand, and arguments
3. The appropriate handler is called
4. For tool-based commands, the handler returns a tool invocation that the agent processes
5. For direct commands, the handler returns the result immediately

### Adding New Commands

To add a new slash command:

1. Add the command registration in `slash_commands.py`:
```python
self.register_command(
    name="mycommand",
    description="Description of the command",
    handler=self._handle_mycommand,
    usage="/mycommand [args]",
    aliases=["mc", "mycmd"]
)
```

2. Implement the handler method:
```python
async def _handle_mycommand(self, agent, subcommand: Optional[str], args: List[str]) -> str:
    # Handle the command
    return "result or tool invocation"
```

### Command Response Types

Commands can return:
1. **Direct text response** - Displayed immediately to the user
2. **Tool invocation** - Processed by the agent (e.g., `"use_tool_from_server server-name tool-name {args}"`)
3. **Agent action** - Converted to a query for the agent to process

## Tips

- Use tab completion when available in your terminal
- Commands are case-insensitive
- You can use the shortest unique prefix for commands
- Use `/h <command>` to get detailed help for any command