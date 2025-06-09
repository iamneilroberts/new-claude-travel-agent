#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { promisify } from "util";

/**
 * Simple Memory MCP Server for Claude Code
 * Provides tools to add summaries, commit notes, and search basic-memory system
 */

// Helper function to execute basic-memory commands
async function executeBasicMemory(args: string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fullCommand = ['basic-memory', 'tool', ...args];
    console.error('Executing command:', 'uvx', fullCommand.join(' '));
    const process = spawn('uvx', fullCommand, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Basic-memory command failed: ${stderr || `Exit code: ${code}`}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn basic-memory: ${error.message}`));
    });
    
    // Send stdin content if provided
    if (stdin) {
      process.stdin.write(stdin);
      process.stdin.end();
    }
  });
}

const server = new Server(
  {
    name: "basic-memory",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_notes",
        description: "Search for notes in the basic-memory system",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query terms"
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10
            }
          },
          required: ["query"]
        }
      },
      {
        name: "read_note",
        description: "Read a specific note by its ID/permalink",
        inputSchema: {
          type: "object",
          properties: {
            noteId: {
              type: "string",
              description: "Note ID or permalink"
            }
          },
          required: ["noteId"]
        }
      },
      {
        name: "write_note",
        description: "Create or update a note in basic-memory (for summaries, commit notes, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Note title"
            },
            content: {
              type: "string", 
              description: "Note content in markdown format"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional tags for the note",
              default: []
            }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "add_compact_summary",
        description: "Add a /compact session summary to basic-memory",
        inputSchema: {
          type: "object",
          properties: {
            sessionDate: {
              type: "string",
              description: "Session date (YYYY-MM-DD format)"
            },
            summary: {
              type: "string",
              description: "Compact session summary content"
            },
            keyChanges: {
              type: "array",
              items: { type: "string" },
              description: "Key changes made in this session",
              default: []
            }
          },
          required: ["sessionDate", "summary"]
        }
      },
      {
        name: "add_commit_note",
        description: "Add detailed commit information to basic-memory",
        inputSchema: {
          type: "object",
          properties: {
            commitHash: {
              type: "string",
              description: "Git commit hash"
            },
            commitMessage: {
              type: "string",
              description: "Git commit message"
            },
            filesChanged: {
              type: "array",
              items: { type: "string" },
              description: "List of files changed in this commit",
              default: []
            },
            details: {
              type: "string",
              description: "Detailed description of changes",
              default: ""
            }
          },
          required: ["commitHash", "commitMessage"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_notes": {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        const result = await executeBasicMemory([
          'search-notes', 
          query, 
          '--page-size', 
          limit.toString()
        ]);
        
        return {
          content: [
            {
              type: "text",
              text: `Search results for "${query}":\n\n${result}`
            }
          ]
        };
      }

      case "read_note": {
        const { noteId } = args as { noteId: string };
        const result = await executeBasicMemory(['read-note', noteId]);
        
        return {
          content: [
            {
              type: "text", 
              text: `Note content for ${noteId}:\n\n${result}`
            }
          ]
        };
      }

      case "write_note": {
        const { title, content, tags = [] } = args as { 
          title: string; 
          content: string; 
          tags?: string[] 
        };
        
        const writeArgs = [
          'write-note',
          '--title', title,
          '--folder', 'notes'
        ];
        
        if (tags.length > 0) {
          writeArgs.push('--tags', tags.join(','));
        }
        
        const result = await executeBasicMemory(writeArgs, content);
        
        return {
          content: [
            {
              type: "text",
              text: `Note created/updated successfully:\n\n${result}`
            }
          ]
        };
      }

      case "add_compact_summary": {
        const { sessionDate, summary, keyChanges = [] } = args as {
          sessionDate: string;
          summary: string;
          keyChanges?: string[];
        };

        const title = `Session Summary - ${sessionDate}`;
        const content = `# Session Summary - ${sessionDate}

## Summary
${summary}

## Key Changes
${keyChanges.map(change => `- ${change}`).join('\n')}

## Session Type
/compact summary

## Date
${sessionDate}
`;

        const result = await executeBasicMemory(['write-note', '--title', title, '--folder', 'notes'], content);
        
        return {
          content: [
            {
              type: "text",
              text: `Session summary added to basic-memory:\n\n${result}`
            }
          ]
        };
      }

      case "add_commit_note": {
        const { commitHash, commitMessage, filesChanged = [], details = "" } = args as {
          commitHash: string;
          commitMessage: string;
          filesChanged?: string[];
          details?: string;
        };

        const title = `Commit ${commitHash.substring(0, 8)} - ${commitMessage}`;
        const content = `# Commit Details - ${commitHash.substring(0, 8)}

## Commit Message
${commitMessage}

## Commit Hash
\`${commitHash}\`

## Files Changed
${filesChanged.map(file => `- \`${file}\``).join('\n')}

## Details
${details || 'No additional details provided.'}

## Commit Type
Git commit record

## Timestamp
${new Date().toISOString()}
`;

        const result = await executeBasicMemory(['write-note', '--title', title, '--folder', 'notes'], content);
        
        return {
          content: [
            {
              type: "text",
              text: `Commit note added to basic-memory:\n\n${result}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Basic Memory MCP Server running");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});