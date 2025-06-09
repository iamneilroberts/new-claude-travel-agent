// Environment interface
interface Env {
  MCP_AUTH_KEY: string;
  BASIC_MEMORY_KV: KVNamespace;
}

interface MemoryNote {
  id: string;
  title: string;
  content: string;
  frontmatter: {
    created: string;
    modified: string;
    tags: string[];
    type: string;
    relations: string[];
  };
  observations: string[];
  relations: Record<string, string[]>;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
  create_knowledge_note: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the knowledge note'
      },
      content: {
        type: 'string',
        description: 'Main content/body of the note'
      },
      type: {
        type: 'string',
        enum: ['destination', 'client', 'experience', 'insight', 'general'],
        description: 'Type of knowledge note'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization'
      },
      observations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key observations or facts'
      },
      relations: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' }
        },
        description: 'Relations to other notes by type'
      }
    },
    required: ['title', 'content', 'type']
  },
  read_knowledge_note: {
    type: 'object',
    properties: {
      note_id: {
        type: 'string',
        description: 'ID of the knowledge note to read'
      },
      format: {
        type: 'string',
        enum: ['markdown', 'json'],
        description: 'Output format (default: markdown)'
      }
    },
    required: ['note_id']
  },
  search_knowledge_notes: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (title, content, tags, or observations)'
      },
      type_filter: {
        type: 'string',
        enum: ['destination', 'client', 'experience', 'insight', 'general'],
        description: 'Filter by note type'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)'
      }
    },
    required: ['query']
  },
  add_observation: {
    type: 'object',
    properties: {
      note_id: {
        type: 'string',
        description: 'ID of the knowledge note'
      },
      observation: {
        type: 'string',
        description: 'New observation to add'
      },
      method: {
        type: 'string',
        enum: ['experience', 'research', 'client-feedback', 'insight'],
        description: 'Method of observation'
      }
    },
    required: ['note_id', 'observation']
  },
  create_relation: {
    type: 'object',
    properties: {
      from_note_id: {
        type: 'string',
        description: 'ID of the source note'
      },
      to_note_id: {
        type: 'string',
        description: 'ID of the target note'
      },
      relation_type: {
        type: 'string',
        description: 'Type of relation (e.g., "related-to", "located-in", "experience-at")'
      }
    },
    required: ['from_note_id', 'to_note_id', 'relation_type']
  },
  list_knowledge_notes: {
    type: 'object',
    properties: {
      type_filter: {
        type: 'string',
        enum: ['destination', 'client', 'experience', 'insight', 'general'],
        description: 'Filter by note type'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)'
      }
    },
    required: []
  }
};

// Tool implementations
class BasicMemoryTools {
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  private formatNoteAsMarkdown(note: MemoryNote): string {
    const frontmatter = [
      '---',
      `title: "${note.title}"`,
      `created: ${note.frontmatter.created}`,
      `modified: ${note.frontmatter.modified}`,
      `type: ${note.frontmatter.type}`,
      `tags: [${note.frontmatter.tags.map(tag => `"${tag}"`).join(', ')}]`,
      '---',
      ''
    ].join('\n');

    const content = note.content + '\n\n';

    const observations = note.observations.length > 0 
      ? `## Observations\n\n${note.observations.map(obs => `- ${obs}`).join('\n')}\n\n`
      : '';

    const relations = Object.keys(note.relations).length > 0
      ? `## Relations\n\n${Object.entries(note.relations)
          .map(([type, targets]) => 
            `**${type}**: ${targets.map(target => `[[${target}]]`).join(', ')}`
          ).join('\n')}\n\n`
      : '';

    return frontmatter + content + observations + relations;
  }

  private calculateRelevance(text: string, query: string): number {
    const words = query.split(' ').filter(word => word.length > 0);
    let relevance = 0;
    
    for (const word of words) {
      const matches = (text.match(new RegExp(word, 'gi')) || []).length;
      relevance += matches;
    }
    
    return Math.min(relevance / (text.length / 100), 1); // Normalize to 0-1
  }
  
  async create_knowledge_note(params: any) {
    try {
      console.log('create_knowledge_note called with:', params);
      
      const noteId = params.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const now = new Date().toISOString();
      
      const note: MemoryNote = {
        id: noteId,
        title: params.title,
        content: params.content,
        frontmatter: {
          created: now,
          modified: now,
          tags: params.tags || [],
          type: params.type,
          relations: []
        },
        observations: params.observations || [],
        relations: params.relations || {}
      };

      // Store in KV
      await this.env.BASIC_MEMORY_KV.put(`note:${noteId}`, JSON.stringify(note));

      // Update search index
      const searchData = {
        title: note.title,
        content: note.content,
        type: note.frontmatter.type,
        tags: note.frontmatter.tags,
        observations: note.observations.join(' ')
      };
      await this.env.BASIC_MEMORY_KV.put(`search:${noteId}`, JSON.stringify(searchData));

      const markdown = this.formatNoteAsMarkdown(note);

      return {
        content: [{
          type: "text",
          text: `Knowledge note created successfully!\n\n**Note ID**: ${noteId}\n\n**Generated Markdown**:\n\n${markdown}`
        }]
      };
    } catch (error: any) {
      console.error('Error creating knowledge note:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating knowledge note: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  async read_knowledge_note(params: any) {
    try {
      console.log('read_knowledge_note called with:', params);
      
      const noteData = await this.env.BASIC_MEMORY_KV.get(`note:${params.note_id}`);
      
      if (!noteData) {
        return {
          content: [{
            type: "text",
            text: `Knowledge note with ID "${params.note_id}" not found.`
          }],
          isError: true
        };
      }

      const note: MemoryNote = JSON.parse(noteData);
      
      if (params.format === 'json') {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(note, null, 2)
          }]
        };
      }

      const markdown = this.formatNoteAsMarkdown(note);

      return {
        content: [{
          type: "text",
          text: markdown
        }]
      };
    } catch (error: any) {
      console.error('Error reading knowledge note:', error);
      return {
        content: [{
          type: "text",
          text: `Error reading knowledge note: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  async search_knowledge_notes(params: any) {
    try {
      console.log('search_knowledge_notes called with:', params);
      
      const limit = params.limit || 10;
      const query = params.query.toLowerCase();
      
      // Get all search indices
      const searchResults: any[] = [];
      const list = await this.env.BASIC_MEMORY_KV.list({ prefix: 'search:' });
      
      for (const key of list.keys) {
        const searchData = await this.env.BASIC_MEMORY_KV.get(key.name);
        if (searchData) {
          const data = JSON.parse(searchData);
          
          // Apply type filter
          if (params.type_filter && data.type !== params.type_filter) {
            continue;
          }
          
          // Search in title, content, tags, observations
          const searchText = [
            data.title,
            data.content,
            data.tags.join(' '),
            data.observations
          ].join(' ').toLowerCase();
          
          if (searchText.includes(query)) {
            const noteId = key.name.replace('search:', '');
            searchResults.push({
              id: noteId,
              title: data.title,
              type: data.type,
              tags: data.tags,
              relevance: this.calculateRelevance(searchText, query)
            });
          }
        }
      }

      // Sort by relevance and limit
      searchResults.sort((a, b) => b.relevance - a.relevance);
      const limitedResults = searchResults.slice(0, limit);

      if (limitedResults.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No knowledge notes found matching query: "${params.query}"`
          }]
        };
      }

      const resultText = `Found ${limitedResults.length} knowledge notes:\n\n` +
        limitedResults.map((result, index) => 
          `${index + 1}. **${result.title}** (${result.id})\n` +
          `   - Type: ${result.type}\n` +
          `   - Tags: ${result.tags.join(', ')}\n` +
          `   - Relevance: ${Math.round(result.relevance * 100)}%`
        ).join('\n\n');

      return {
        content: [{
          type: "text",
          text: resultText
        }]
      };
    } catch (error: any) {
      console.error('Error searching knowledge notes:', error);
      return {
        content: [{
          type: "text",
          text: `Error searching knowledge notes: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  async add_observation(params: any) {
    try {
      console.log('add_observation called with:', params);
      
      const noteData = await this.env.BASIC_MEMORY_KV.get(`note:${params.note_id}`);
      
      if (!noteData) {
        return {
          content: [{
            type: "text",
            text: `Knowledge note with ID "${params.note_id}" not found.`
          }],
          isError: true
        };
      }

      const note: MemoryNote = JSON.parse(noteData);
      
      // Add observation with method prefix if specified
      const formattedObservation = params.method 
        ? `[${params.method}] ${params.observation}`
        : params.observation;
      
      note.observations.push(formattedObservation);
      note.frontmatter.modified = new Date().toISOString();

      // Update stored note
      await this.env.BASIC_MEMORY_KV.put(`note:${params.note_id}`, JSON.stringify(note));

      // Update search index
      const searchData = {
        title: note.title,
        content: note.content,
        type: note.frontmatter.type,
        tags: note.frontmatter.tags,
        observations: note.observations.join(' ')
      };
      await this.env.BASIC_MEMORY_KV.put(`search:${params.note_id}`, JSON.stringify(searchData));

      return {
        content: [{
          type: "text",
          text: `Observation added successfully to "${note.title}"!\n\n**New observation**: ${formattedObservation}`
        }]
      };
    } catch (error: any) {
      console.error('Error adding observation:', error);
      return {
        content: [{
          type: "text",
          text: `Error adding observation: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  async create_relation(params: any) {
    try {
      console.log('create_relation called with:', params);
      
      // Get both notes
      const fromNoteData = await this.env.BASIC_MEMORY_KV.get(`note:${params.from_note_id}`);
      const toNoteData = await this.env.BASIC_MEMORY_KV.get(`note:${params.to_note_id}`);
      
      if (!fromNoteData || !toNoteData) {
        return {
          content: [{
            type: "text",
            text: `One or both notes not found: "${params.from_note_id}", "${params.to_note_id}"`
          }],
          isError: true
        };
      }

      const fromNote: MemoryNote = JSON.parse(fromNoteData);
      const toNote: MemoryNote = JSON.parse(toNoteData);

      // Add relation to source note
      if (!fromNote.relations[params.relation_type]) {
        fromNote.relations[params.relation_type] = [];
      }
      if (!fromNote.relations[params.relation_type].includes(params.to_note_id)) {
        fromNote.relations[params.relation_type].push(params.to_note_id);
      }

      // Add reverse relation to target note
      const reverseRelationType = `${params.relation_type}-reverse`;
      if (!toNote.relations[reverseRelationType]) {
        toNote.relations[reverseRelationType] = [];
      }
      if (!toNote.relations[reverseRelationType].includes(params.from_note_id)) {
        toNote.relations[reverseRelationType].push(params.from_note_id);
      }

      // Update modified timestamps
      const now = new Date().toISOString();
      fromNote.frontmatter.modified = now;
      toNote.frontmatter.modified = now;

      // Save both notes
      await this.env.BASIC_MEMORY_KV.put(`note:${params.from_note_id}`, JSON.stringify(fromNote));
      await this.env.BASIC_MEMORY_KV.put(`note:${params.to_note_id}`, JSON.stringify(toNote));

      return {
        content: [{
          type: "text",
          text: `Relation created successfully!\n\n**${fromNote.title}** --[${params.relation_type}]--> **${toNote.title}**`
        }]
      };
    } catch (error: any) {
      console.error('Error creating relation:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating relation: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  async list_knowledge_notes(params: any) {
    try {
      console.log('list_knowledge_notes called with:', params);
      
      const limit = params.limit || 20;
      const notes: any[] = [];
      const list = await this.env.BASIC_MEMORY_KV.list({ prefix: 'note:' });
      
      for (const key of list.keys) {
        const noteData = await this.env.BASIC_MEMORY_KV.get(key.name);
        if (noteData) {
          const note: MemoryNote = JSON.parse(noteData);
          
          // Apply type filter
          if (params.type_filter && note.frontmatter.type !== params.type_filter) {
            continue;
          }
          
          notes.push({
            id: note.id,
            title: note.title,
            type: note.frontmatter.type,
            tags: note.frontmatter.tags,
            created: note.frontmatter.created,
            modified: note.frontmatter.modified,
            observationCount: note.observations.length,
            relationCount: Object.values(note.relations).flat().length
          });
        }
      }

      // Sort by modified date (newest first)
      notes.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      const limitedNotes = notes.slice(0, limit);

      if (limitedNotes.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No knowledge notes found."
          }]
        };
      }

      const resultText = `Found ${limitedNotes.length} knowledge notes:\n\n` +
        limitedNotes.map((note, index) => 
          `${index + 1}. **${note.title}** (${note.id})\n` +
          `   - Type: ${note.type}\n` +
          `   - Tags: ${note.tags.join(', ')}\n` +
          `   - Observations: ${note.observationCount}\n` +
          `   - Relations: ${note.relationCount}\n` +
          `   - Modified: ${new Date(note.modified).toLocaleDateString()}`
        ).join('\n\n');

      return {
        content: [{
          type: "text",
          text: resultText
        }]
      };
    } catch (error: any) {
      console.error('Error listing knowledge notes:', error);
      return {
        content: [{
          type: "text",
          text: `Error listing knowledge notes: ${error.message}`
        }],
        isError: true
      };
    }
  }
}

// Pure MCP JSON-RPC 2.0 Handler
class PureBasicMemoryMCPServer {
  private tools: BasicMemoryTools;
  
  constructor(env: Env) {
    this.tools = new BasicMemoryTools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'Basic Memory MCP',
                version: '2.0.0'
              }
            }
          };
          
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'create_knowledge_note',
                  description: 'Create/update knowledge note',
                  inputSchema: toolSchemas.create_knowledge_note
                },
                {
                  name: 'read_knowledge_note',
                  description: 'Read knowledge note',
                  inputSchema: toolSchemas.read_knowledge_note
                },
                {
                  name: 'search_knowledge_notes',
                  description: 'Search knowledge notes',
                  inputSchema: toolSchemas.search_knowledge_notes
                },
                {
                  name: 'add_observation',
                  description: 'Add observation to existing note',
                  inputSchema: toolSchemas.add_observation
                },
                {
                  name: 'create_relation',
                  description: 'Create relation between notes',
                  inputSchema: toolSchemas.create_relation
                },
                {
                  name: 'list_knowledge_notes',
                  description: 'List all knowledge notes',
                  inputSchema: toolSchemas.list_knowledge_notes
                }
              ]
            }
          };
          
        case 'tools/call':
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          
          // Validate tool exists
          if (!(toolName in toolSchemas)) {
            throw new Error(`Unknown tool: ${toolName}`);
          }
          
          // Call the appropriate tool method
          const result = await (this.tools as any)[toolName](toolArgs);
          
          return {
            jsonrpc: '2.0',
            id,
            result
          };
          
        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };
          
        case 'resources/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: []
            }
          };
          
        case 'prompts/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: []
            }
          };
          
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: String(error)
        }
      };
    }
  }
}

// Cloudflare Worker Export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // SSE endpoint for MCP protocol
    if (url.pathname === '/sse') {
      const server = new PureBasicMemoryMCPServer(env);
      
      // Handle incoming messages
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const response = await server.handleRequest(body);
          
          // Return SSE-formatted response
          return new Response(
            `data: ${JSON.stringify(response)}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        } catch (error) {
          return new Response(
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
                data: String(error)
              }
            })}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        }
      }
      
      // For GET requests, return a simple SSE connection
      return new Response(
        `data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        }
      );
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'Pure Basic Memory MCP v2.0',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        tools: [
          'create_knowledge_note',
          'read_knowledge_note',
          'search_knowledge_notes',
          'add_observation',
          'create_relation',
          'list_knowledge_notes'
        ],
        features: [
          'KV-based knowledge management',
          'Note creation and retrieval',
          'Full-text search',
          'Observation tracking',
          'Relation management',
          'Markdown formatting'
        ]
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Default response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/sse", "/health"]
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};