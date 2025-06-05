import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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

export class BasicMemoryMCP extends McpAgent {
  server = new McpServer({
    name: "Basic Memory MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    // Create/update knowledge note
    this.server.tool(
      "create_knowledge_note",
      {
        title: z.string().describe("Title of the knowledge note"),
        content: z.string().describe("Main content/body of the note"),
        type: z.enum(['destination', 'client', 'experience', 'insight', 'general']).describe("Type of knowledge note"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
        observations: z.array(z.string()).optional().describe("Key observations or facts"),
        relations: z.record(z.array(z.string())).optional().describe("Relations to other notes by type")
      },
      async (params) => {
        try {
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
          await env.BASIC_MEMORY_KV.put(`note:${noteId}`, JSON.stringify(note));

          // Update search index
          const searchData = {
            title: note.title,
            content: note.content,
            type: note.frontmatter.type,
            tags: note.frontmatter.tags,
            observations: note.observations.join(' ')
          };
          await env.BASIC_MEMORY_KV.put(`search:${noteId}`, JSON.stringify(searchData));

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
    );

    // Read knowledge note
    this.server.tool(
      "read_knowledge_note",
      {
        note_id: z.string().describe("ID of the knowledge note to read"),
        format: z.enum(['markdown', 'json']).optional().describe("Output format (default: markdown)")
      },
      async (params) => {
        try {
          const noteData = await env.BASIC_MEMORY_KV.get(`note:${params.note_id}`);
          
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
    );

    // Search knowledge notes
    this.server.tool(
      "search_knowledge_notes",
      {
        query: z.string().describe("Search query (title, content, tags, or observations)"),
        type_filter: z.enum(['destination', 'client', 'experience', 'insight', 'general']).optional().describe("Filter by note type"),
        limit: z.number().optional().describe("Maximum number of results (default: 10)")
      },
      async (params) => {
        try {
          const limit = params.limit || 10;
          const query = params.query.toLowerCase();
          
          // Get all search indices
          const searchResults: any[] = [];
          const list = await env.BASIC_MEMORY_KV.list({ prefix: 'search:' });
          
          for (const key of list.keys) {
            const searchData = await env.BASIC_MEMORY_KV.get(key.name);
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
    );

    // Add observation to existing note
    this.server.tool(
      "add_observation",
      {
        note_id: z.string().describe("ID of the knowledge note"),
        observation: z.string().describe("New observation to add"),
        method: z.enum(['experience', 'research', 'client-feedback', 'insight']).optional().describe("Method of observation")
      },
      async (params) => {
        try {
          const noteData = await env.BASIC_MEMORY_KV.get(`note:${params.note_id}`);
          
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
          await env.BASIC_MEMORY_KV.put(`note:${params.note_id}`, JSON.stringify(note));

          // Update search index
          const searchData = {
            title: note.title,
            content: note.content,
            type: note.frontmatter.type,
            tags: note.frontmatter.tags,
            observations: note.observations.join(' ')
          };
          await env.BASIC_MEMORY_KV.put(`search:${params.note_id}`, JSON.stringify(searchData));

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
    );

    // Create relation between notes
    this.server.tool(
      "create_relation",
      {
        from_note_id: z.string().describe("ID of the source note"),
        to_note_id: z.string().describe("ID of the target note"),
        relation_type: z.string().describe("Type of relation (e.g., 'related-to', 'located-in', 'experience-at')")
      },
      async (params) => {
        try {
          // Get both notes
          const fromNoteData = await env.BASIC_MEMORY_KV.get(`note:${params.from_note_id}`);
          const toNoteData = await env.BASIC_MEMORY_KV.get(`note:${params.to_note_id}`);
          
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
          await env.BASIC_MEMORY_KV.put(`note:${params.from_note_id}`, JSON.stringify(fromNote));
          await env.BASIC_MEMORY_KV.put(`note:${params.to_note_id}`, JSON.stringify(toNote));

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
    );

    // List all knowledge notes
    this.server.tool(
      "list_knowledge_notes",
      {
        type_filter: z.enum(['destination', 'client', 'experience', 'insight', 'general']).optional().describe("Filter by note type"),
        limit: z.number().optional().describe("Maximum number of results (default: 20)")
      },
      async (params) => {
        try {
          const limit = params.limit || 20;
          const notes: any[] = [];
          const list = await env.BASIC_MEMORY_KV.list({ prefix: 'note:' });
          
          for (const key of list.keys) {
            const noteData = await env.BASIC_MEMORY_KV.get(key.name);
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
    );
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
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Basic Memory MCP',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return BasicMemoryMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};