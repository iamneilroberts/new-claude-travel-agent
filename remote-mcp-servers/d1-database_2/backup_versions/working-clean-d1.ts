import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
interface JsonRpcRequestMessage {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: any;
}

interface JsonRpcResponseMessage {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Define our environment bindings (e.g., for D1, KV, R2)
export interface Env {
  DB: D1Database; // Our D1 database binding
  // Add other bindings here if needed, e.g.:
  // MY_KV_NAMESPACE: KVNamespace;
  // MY_R2_BUCKET: R2Bucket;
}

// Define properties that can be passed to our McpAgent instance if needed
// For now, we don't have custom props beyond what McpAgent might expect.
// If McpAgentProps was exported, we might use: type MyAgentProps = McpAgentProps & { /* custom props */ };
// type MyAgentProps = any; // We will use Record<string, unknown> for Props

// McpAgent<Env = unknown, Props = unknown, State = Record<string, unknown>>
export class MyMCP extends McpAgent<Env, Record<string, unknown>, any> {
  // Declare server, it will be initialized in the constructor
  public server: McpServer;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env); // Pass state and env to the McpAgent base constructor
    this.server = new McpServer({
      name: 'Clean D1 Travel DB MCP',
      version: '0.1.0',
      description: 'Provides CRUD operations for the travel database via Cloudflare D1.',
    });
    // It's crucial that McpAgent's constructor correctly sets up `this.env`
  }

  // The init method is called by the McpAgent base class to initialize tools.
  async init() {
    console.log('MyMCP: Initializing tools...');
    // Server name, version, description are now set at instantiation above.
    console.log('MyMCP: this.env in init():', this.env ? 'defined' : 'undefined');
    if (this.env) {
      console.log('MyMCP: this.env.DB in init():', this.env.DB ? 'defined' : 'undefined');
    }

    // --- Client Tools ---
    this.server.tool(
      'create_client',
      'Creates a new client record in the travel database.',
      {
        first_name: z.string().describe("Client's first name (required)"),
        last_name: z.string().describe("Client's last name (required)"),
        email: z.string().email().optional().describe("Client's email address"),
        phone: z.string().optional().describe("Client's phone number"),
        address: z.string().optional().describe("Client's street address"),
        city: z.string().optional().describe("Client's city"),
        state: z.string().optional().describe("Client's state or province"),
        postal_code: z.string().optional().describe("Client's postal code"),
        country: z.string().optional().default('United States').describe("Client's country"),
        date_of_birth: z.string().optional().describe("Client's date of birth (e.g., YYYY-MM-DD)"),
        passport_number: z.string().optional().describe("Client's passport number"),
        passport_expiry: z.string().optional().describe("Client's passport expiry date (e.g., YYYY-MM-DD)"),
        preferences: z.string().optional().describe("Client's travel preferences (JSON string or text)"),
        notes: z.string().optional().describe('Additional notes about the client'),
        idempotency_key: z.string().optional().describe('Optional unique key to prevent duplicate creation on retry'),
      },
      async (params: any) => { // TODO: Define a specific type for params based on Zod schema
        console.log('MyMCP: create_client called with:', params);
        if (params.idempotency_key) {
          console.log(`MyMCP: Idempotency key received: ${params.idempotency_key}`);
          // Basic idempotency check placeholder: In a real scenario, you'd check a KV store or similar
          // For now, we'll just log it. A full implementation would involve:
          // 1. Check if key exists in a temporary store (e.g., KV with TTL).
          // 2. If yes, return stored response.
          // 3. If no, proceed with creation, then store key and response.
        }

        try {
          const sql = `
            INSERT INTO clients (
              first_name, last_name, email, phone, address, city, state,
              postal_code, country, date_of_birth, passport_number,
              passport_expiry, preferences, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;
          const bindings = [
            params.first_name,
            params.last_name,
            params.email ?? null,
            params.phone ?? null,
            params.address ?? null,
            params.city ?? null,
            params.state ?? null,
            params.postal_code ?? null,
            params.country,
            params.date_of_birth ?? null,
            params.passport_number ?? null,
            params.passport_expiry ?? null,
            params.preferences ?? null,
            params.notes ?? null,
          ];
          
          const ps = this.env.DB.prepare(sql).bind(...bindings);
          const { success, meta } = await ps.run();

          if (success && meta && meta.last_row_id) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ client_id: meta.last_row_id, status: 'success', message: 'Client created successfully.' }) },
              ],
            };
          } else {
            console.error('MyMCP: Error creating client - D1 op not successful or meta missing.', { success, meta });
            return {
              content: [ { type: 'text', text: JSON.stringify({ status: 'error', message: 'Failed to create client. D1 operation error.' }) } ],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception creating client:', e.message, e.stack);
          return {
            content: [ { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) } ],
            isError: true,
          };
        }
      }
    );


    // Get Client
    this.server.tool(
      'get_client',
      'Retrieves a client\'s details by their ID.',
      { client_id: z.number().int().positive().describe('The unique ID of the client to retrieve (required)') },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: get_client called for ID:', params.client_id);
        console.log('MyMCP: this.env in get_client:', this.env ? 'defined' : 'undefined');
        if (this.env) {
          console.log('MyMCP: this.env.DB in get_client:', this.env.DB ? 'defined' : 'undefined');
        }
        try {
          const sql = 'SELECT * FROM clients WHERE client_id = ?;';
          const ps = this.env.DB.prepare(sql).bind(params.client_id);
          const client = await ps.first();

          if (client) {
            return { content: [{ type: 'text', text: JSON.stringify(client) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `Client with ID ${params.client_id} not found.` }) },
              ],
              isError: false,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting client ID ${params.client_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );


    // Update Client
    this.server.tool(
      'update_client',
      'Updates specified fields for an existing client.',
      {
        client_id: z.number().int().positive().describe('The unique ID of the client to update (required)'),
        first_name: z.string().optional().describe('Client\'s first name'),
        last_name: z.string().optional().describe('Client\'s last name'),
        email: z.string().email().optional().describe('Client\'s email address'),
        phone: z.string().optional().describe('Client\'s phone number'),
        address: z.string().optional().describe('Client\'s street address'),
        city: z.string().optional().describe('Client\'s city'),
        state: z.string().optional().describe('Client\'s state or province'),
        postal_code: z.string().optional().describe('Client\'s postal code'),
        country: z.string().optional().describe('Client\'s country'),
        date_of_birth: z.string().optional().describe('Client\'s date of birth (e.g., YYYY-MM-DD)'),
        passport_number: z.string().optional().describe('Client\'s passport number'),
        passport_expiry: z.string().optional().describe('Client\'s passport expiry date (e.g., YYYY-MM-DD)'),
        preferences: z.string().optional().describe('Client\'s travel preferences (JSON string or text)'),
        notes: z.string().optional().describe('Additional notes about the client'),
      },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: update_client called with:', params);
        const { client_id, ...fieldsToUpdate } = params;

        if (Object.keys(fieldsToUpdate).length === 0) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'no_action', message: 'No fields provided to update.' }) }],
          };
        }

        const setClauses: string[] = [];
        const bindings: any[] = [];

        for (const [key, value] of Object.entries(fieldsToUpdate)) {
          if (value !== undefined) {
            setClauses.push(`${key} = ?`);
            bindings.push(value);
          }
        }

        if (setClauses.length === 0) {
           return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'no_action', message: 'No valid fields provided to update after filtering undefined.' }) }],
          };
        }

        bindings.push(client_id);

        try {
          const sql = `UPDATE clients SET ${setClauses.join(', ')} WHERE client_id = ?;`;
          const ps = this.env.DB.prepare(sql).bind(...bindings);
          const { success, meta } = await ps.run();

          if (success && meta && meta.changes > 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'success', message: `Client ID ${client_id} updated successfully. Changes: ${meta.changes}` }) }],
            };
          } else if (success && meta && meta.changes === 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'no_change', message: `Client ID ${client_id} found, but no fields were changed (values might be the same or client not found).` }) }],
            };
          } else {
            console.error(`MyMCP: Error updating client ID ${client_id}: D1 success was false or meta missing.`, { success, meta });
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Failed to update client ID ${client_id}. D1 operation reported an issue.` }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception updating client ID ${client_id}:`, e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );


    // Delete Client
    this.server.tool(
      'delete_client',
      'Deletes a client record by their ID.',
      { client_id: z.number().int().positive().describe('The unique ID of the client to delete (required)') },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: delete_client called for ID:', params.client_id);
        try {
          const sql = 'DELETE FROM clients WHERE client_id = ?;';
          const ps = this.env.DB.prepare(sql).bind(params.client_id);
          const { success, meta } = await ps.run();

          if (success && meta && meta.changes > 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'success', message: `Client ID ${params.client_id} deleted successfully. Changes: ${meta.changes}` }) }],
            };
          } else if (success && meta && meta.changes === 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'not_found', message: `Client ID ${params.client_id} not found or no changes made (already deleted).` }) }],
            };
          } else {
            console.error(`MyMCP: Error deleting client ID ${params.client_id}: D1 success was false or meta missing.`, { success, meta });
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Failed to delete client ID ${params.client_id}. D1 operation reported an issue.` }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception deleting client ID ${params.client_id}:`, e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );



    // --- Trip Tools ---
    this.server.tool(
      'create_trip',
      'Creates a new trip record in the travel database.',
      {
        trip_name: z.string().describe('Name of the trip (required)'),
        start_date: z.string().describe('Start date of the trip (e.g., YYYY-MM-DD) (required)'),
        end_date: z.string().describe('End date of the trip (e.g., YYYY-MM-DD) (required)'),
        group_id: z.number().int().positive().optional().describe('Optional group ID associated with the trip'),
        duration: z.number().int().positive().optional().describe('Duration of the trip in days'),
        status: z.string().optional().default('Planned').describe('Status of the trip (e.g., Planned, Booked, Completed)'),
        description: z.string().optional().describe('A description of the trip'),
        total_cost: z.number().optional().describe('Estimated or actual total cost of the trip'),
        currency: z.string().optional().default('USD').describe('Currency for the trip costs (e.g., USD, EUR)'),
        paid_amount: z.number().optional().default(0).describe('Amount already paid for the trip'),
        balance_due: z.number().optional().describe('Remaining balance due for the trip'),
        agent_name: z.string().optional().describe('Name of the travel agent handling the trip'),
        agent_contact: z.string().optional().describe('Contact information for the travel agent'),
        special_requests: z.string().optional().describe('Any special requests for the trip'),
        notes: z.string().optional().describe('Additional notes about the trip'),
        idempotency_key: z.string().optional().describe('Optional unique key to prevent duplicate creation on retry'),
      },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: create_trip called with:', params);
        if (params.idempotency_key) {
          console.log(`MyMCP: Idempotency key received for create_trip: ${params.idempotency_key}`);
        }

        try {
          const sql = `
            INSERT INTO trips (
              trip_name, start_date, end_date, group_id, duration, status, 
              description, total_cost, currency, paid_amount, balance_due, 
              agent_name, agent_contact, special_requests, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;
          const bindings = [
            params.trip_name,
            params.start_date,
            params.end_date,
            params.group_id ?? null,
            params.duration ?? null,
            params.status,
            params.description ?? null,
            params.total_cost ?? null,
            params.currency,
            params.paid_amount,
            params.balance_due ?? null,
            params.agent_name ?? null,
            params.agent_contact ?? null,
            params.special_requests ?? null,
            params.notes ?? null,
          ];
          
          const ps = this.env.DB.prepare(sql).bind(...bindings);
          const { success, meta } = await ps.run();

          if (success && meta && meta.last_row_id) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ trip_id: meta.last_row_id, status: 'success', message: 'Trip created successfully.' }) },
              ],
            };
          } else {
            console.error('MyMCP: Error creating trip - D1 op not successful or meta missing.', { success, meta });
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'error', message: 'Failed to create trip. D1 operation error.' }) },
              ],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception creating trip:', e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );


    // Get Trip
    this.server.tool(
      'get_trip',
      'Retrieves a trip\'s summary details by its ID using TripSummaryView.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip to retrieve (required)') },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: get_trip (using TripSummaryView) called for ID:', params.trip_id);
        try {
          const sql = 'SELECT * FROM TripSummaryView WHERE trip_id = ?;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const trip = await ps.first();

          if (trip) {
            return { content: [{ type: 'text', text: JSON.stringify(trip) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `Trip with ID ${params.trip_id} not found.` }) },
              ],
              isError: false,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );


    // Update Trip
    this.server.tool(
      'update_trip',
      'Updates specified fields for an existing trip.',
      {
        trip_id: z.number().int().positive().describe('The unique ID of the trip to update (required)'),
        trip_name: z.string().optional().describe('Name of the trip'),
        start_date: z.string().optional().describe('Start date of the trip (e.g., YYYY-MM-DD)'),
        end_date: z.string().optional().describe('End date of the trip (e.g., YYYY-MM-DD)'),
        group_id: z.number().int().positive().optional().describe('Optional group ID associated with the trip'),
        duration: z.number().int().positive().optional().describe('Duration of the trip in days'),
        status: z.string().optional().describe('Status of the trip (e.g., Planned, Booked, Completed)'),
        description: z.string().optional().describe('A description of the trip'),
        total_cost: z.number().optional().describe('Estimated or actual total cost of the trip'),
        currency: z.string().optional().describe('Currency for the trip costs (e.g., USD, EUR)'),
        paid_amount: z.number().optional().describe('Amount already paid for the trip'),
        balance_due: z.number().optional().describe('Remaining balance due for the trip'),
        agent_name: z.string().optional().describe('Name of the travel agent handling the trip'),
        agent_contact: z.string().optional().describe('Contact information for the travel agent'),
        special_requests: z.string().optional().describe('Any special requests for the trip'),
        notes: z.string().optional().describe('Additional notes about the trip'),
      },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: update_trip called with:', params);
        const { trip_id, ...fieldsToUpdate } = params;

        if (Object.keys(fieldsToUpdate).length === 0) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'no_action', message: 'No fields provided to update for the trip.' }) }],
          };
        }

        const setClauses: string[] = [];
        const bindings: any[] = [];

        for (const [key, value] of Object.entries(fieldsToUpdate)) {
          if (value !== undefined) {
            setClauses.push(`${key} = ?`);
            bindings.push(value);
          }
        }

        if (setClauses.length === 0) {
           return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'no_action', message: 'No valid fields provided to update for the trip after filtering undefined.' }) }],
          };
        }

        bindings.push(trip_id);

        try {
          const sql = `UPDATE trips SET ${setClauses.join(', ')} WHERE trip_id = ?;`;
          const ps = this.env.DB.prepare(sql).bind(...bindings);
          const { success, meta } = await ps.run();

          if (success && meta && meta.changes > 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'success', message: `Trip ID ${trip_id} updated successfully. Changes: ${meta.changes}` }) }],
            };
          } else if (success && meta && meta.changes === 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'no_change', message: `Trip ID ${trip_id} found, but no fields were changed.` }) }],
            };
          } else {
            console.error(`MyMCP: Error updating trip ID ${trip_id}: D1 success was false or meta missing.`, { success, meta });
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Failed to update trip ID ${trip_id}. D1 operation reported an issue.` }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception updating trip ID ${trip_id}:`, e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );

    // Delete Trip
    this.server.tool(
      'delete_trip',
      'Deletes a trip record by its ID.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip to delete (required)') },
      async (params: any) => { // TODO: Define a specific type for params
        console.log('MyMCP: delete_trip called for ID:', params.trip_id);
        try {
          const sql = 'DELETE FROM trips WHERE trip_id = ?;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const { success, meta } = await ps.run();

          if (success && meta && meta.changes > 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'success', message: `Trip ID ${params.trip_id} deleted successfully. Changes: ${meta.changes}` }) }],
            };
          } else if (success && meta && meta.changes === 0) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'not_found', message: `Trip ID ${params.trip_id} not found or no changes made (already deleted).` }) }],
            };
          } else {
            console.error(`MyMCP: Error deleting trip ID ${params.trip_id}: D1 success was false or meta missing.`, { success, meta });
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Failed to delete trip ID ${params.trip_id}. D1 operation reported an issue.` }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception deleting trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );
    // --- ActivityLog Tools ---
    this.server.tool(
      'get_recent_activities',
      'Retrieves recent activities from the ActivityLog.',
      {
        limit: z.number().int().positive().optional().default(3).describe('Number of recent activities to retrieve (default: 3)'),
        days_past: z.number().int().positive().optional().default(7).describe('How many days back to look for activities (default: 7)'),
      },
      async (params: { limit: number; days_past: number }) => {
        console.log('MyMCP: get_recent_activities called with:', params);
        try {
          const sql = `
            SELECT a.*, t.trip_name, c.first_name, c.last_name
            FROM ActivityLog a
            LEFT JOIN Trips t ON a.trip_id = t.trip_id
            LEFT JOIN Clients c ON a.client_id = c.client_id
            WHERE a.activity_timestamp >= date('now', '-' || ? || ' days')
            ORDER BY a.activity_timestamp DESC
            LIMIT ?;
          `;
          const ps = this.env.DB.prepare(sql).bind(params.days_past.toString(), params.limit); // D1 expects string for date modifier
          const { results } = await ps.all();

          if (results && results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `No activities found within the last ${params.days_past} days.` }) },
              ],
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception getting recent activities:', e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'add_activity_log_entry',
      'Adds a new entry to the ActivityLog.',
      {
        session_id: z.string().describe('The current session ID (required)'),
        activity_type: z.string().describe('The type of activity (required)'),
        details: z.string().describe('A brief description of the activity (required)'),
        trip_id: z.number().int().positive().optional().describe('The ID of the trip related to the activity'),
        client_id: z.number().int().positive().optional().describe('The ID of the client related to the activity'),
      },
      async (params: { session_id: string; activity_type: string; details: string; trip_id?: number; client_id?: number }) => {
        console.log('MyMCP: add_activity_log_entry called with:', params);
        try {
          const sql = `
            INSERT INTO ActivityLog (session_id, client_id, trip_id, activity_type, details)
            VALUES (?, ?, ?, ?, ?);
          `;
          const bindings = [
            params.session_id,
            params.client_id ?? null,
            params.trip_id ?? null,
            params.activity_type,
            params.details,
          ];
          const ps = this.env.DB.prepare(sql).bind(...bindings);
          const { success, meta } = await ps.run();

          if (success && meta && meta.last_row_id) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ activity_log_id: meta.last_row_id, status: 'success', message: 'Activity logged successfully.' }) },
              ],
            };
          } else {
            console.error('MyMCP: Error adding activity log entry - D1 op not successful or meta missing.', { success, meta });
            return {
              content: [ { type: 'text', text: JSON.stringify({ status: 'error', message: 'Failed to log activity. D1 operation error.' }) } ],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception adding activity log entry:', e.message, e.stack);
          return {
            content: [ { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) } ],
            isError: true,
          };
        }
      }
    );

    // Get Trip Daily Logistics
    this.server.tool(
      'get_trip_daily_logistics',
      'Retrieves a focused summary of daily accommodation and transportation logistics for a trip. Use this for specific lodging and travel arrangements, not for all activities or general trip data.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip (required)') },
      async (params: { trip_id: number }) => {
        console.log('MyMCP: get_trip_daily_logistics called for ID:', params.trip_id);
        try {
          const sql = 'SELECT * FROM TripDailyLogisticsView WHERE trip_id = ? ORDER BY day_number;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const D1results = await ps.all();

          if (D1results && D1results.results && D1results.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `No daily logistics found for Trip ID ${params.trip_id}.` }) },
              ],
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting daily logistics for trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    // Get Trip Daily Activities
    this.server.tool(
      'get_trip_daily_activities',
      'Retrieves detailed day-by-day activities for a trip using TripDailyActivitiesView.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip (required)') },
      async (params: { trip_id: number }) => {
        console.log('MyMCP: get_trip_daily_activities called for ID:', params.trip_id);
        try {
          const sql = 'SELECT * FROM TripDailyActivitiesView WHERE trip_id = ? ORDER BY day_number;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const D1results = await ps.all();

          if (D1results && D1results.results && D1results.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `No daily activities found for Trip ID ${params.trip_id}.` }) },
              ],
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting daily activities for trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    // Get Trip Day Summary
    this.server.tool(
      'get_trip_day_summary',
      'Retrieves summarized counts of daily components for a trip using TripDaySummaryView.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip (required)') },
      async (params: { trip_id: number }) => {
        console.log('MyMCP: get_trip_day_summary called for ID:', params.trip_id);
        try {
          const sql = 'SELECT * FROM TripDaySummaryView WHERE trip_id = ? ORDER BY day_number;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const D1results = await ps.all();

          if (D1results && D1results.results && D1results.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `No day summary found for Trip ID ${params.trip_id}.` }) },
              ],
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting day summary for trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    // Get Upcoming Trips
    this.server.tool(
      'get_upcoming_trips',
      'Retrieves a summary of trips starting in the next 30 days using UpcomingTripsSummaryView.',
      {}, // No parameters needed for this specific view query
      async () => {
        console.log('MyMCP: get_upcoming_trips called');
        try {
          const sql = 'SELECT * FROM UpcomingTripsSummaryView ORDER BY start_date ASC;';
          const ps = this.env.DB.prepare(sql);
          const D1results = await ps.all();

          if (D1results && D1results.results && D1results.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: 'No upcoming trips found in the next 30 days.' }) },
              ],
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception getting upcoming trips:', e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    // Get Comprehensive Trip Details
    this.server.tool(
      'get_comprehensive_trip_details',
      'Retrieves all-inclusive day-by-day details for a trip, including activities, logistics, and notes, from ComprehensiveTripView. Prefer more specialized tools like get_trip_daily_logistics or get_trip_daily_activities if only specific information is needed.',
      { trip_id: z.number().int().positive().describe('The unique ID of the trip (required)') },
      async (params: { trip_id: number }) => {
        console.log('MyMCP: get_comprehensive_trip_details called for ID:', params.trip_id);
        try {
          const sql = 'SELECT * FROM ComprehensiveTripView WHERE trip_id = ? ORDER BY day_number;';
          const ps = this.env.DB.prepare(sql).bind(params.trip_id);
          const D1results = await ps.all();

          if (D1results && D1results.results && D1results.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results) }] };
          } else {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ status: 'not_found', message: `No comprehensive details found for Trip ID ${params.trip_id}.` }) },
              ],
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception getting comprehensive details for trip ID ${params.trip_id}:`, e.message, e.stack);
          return {
            content: [
              { type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) },
            ],
            isError: true,
          };
        }
      }
    );

    // General D1 Query Tool
    this.server.tool(
      'general_d1_query',
      'Executes an arbitrary SQL query against the D1 database. Use with caution. Supports SELECT, INSERT, UPDATE, DELETE.',
      {
        sql: z.string().describe('The SQL query to execute (required).'),
        params: z.array(z.any()).optional().describe('An array of parameters to bind to the SQL query (e.g., for placeholders like ?). Ensure numbers are passed as numbers, not strings, if the DB column is numeric.'),
      },
      async (params: { sql: string; params?: any[] }) => {
        console.log('MyMCP: general_d1_query called with SQL:', params.sql, 'and params:', params.params);
        try {
          const query = params.sql.trim().toUpperCase();
          let statement = this.env.DB.prepare(params.sql);

          if (params.params && params.params.length > 0) {
            statement = statement.bind(...params.params);
          }

          if (query.startsWith('SELECT')) {
            const D1results = await statement.all(); // D1 .all() returns { results: T[], success: true, meta: D1Meta } or { error: string, success: false, meta: D1Meta }
            if (D1results.success) {
              return { content: [{ type: 'text', text: JSON.stringify(D1results.results ?? []) }] };
            } else {
              console.error('MyMCP: general_d1_query SELECT error:', D1results.error, D1results.meta);
              return {
                content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'SELECT query failed.', details: D1results.error, meta: D1results.meta }) }],
                isError: true,
              };
            }
          } else if (query.startsWith('INSERT') || query.startsWith('UPDATE') || query.startsWith('DELETE')) {
            const D1results = await statement.run(); // D1 .run() returns { success: true, meta: D1Meta } or { error: string, success: false, meta: D1Meta }
            if (D1results.success) {
              return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', meta: D1results.meta }) }] };
            } else {
              console.error('MyMCP: general_d1_query CUD error:', D1results.error, D1results.meta);
               return {
                content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'Query (INSERT/UPDATE/DELETE) failed.', details: D1results.error, meta: D1results.meta }) }],
                isError: true,
              };
            }
          } else {
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'Unsupported SQL command. Only SELECT, INSERT, UPDATE, DELETE are allowed.' }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error(`MyMCP: Exception in general_d1_query for SQL "${params.sql}":`, e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );

    // --- Search Tools ---
    // Search Clients
    this.server.tool(
      'search_clients',
      'Searches for clients by name or email.',
      {
        name: z.string().optional().describe('Full or partial name of the client to search for.'),
        email: z.string().email().optional().describe('Email address of the client to search for.'),
      },
      async (params: { name?: string; email?: string }) => {
        console.log('MyMCP: search_clients called with:', params);
        if (!params.name && !params.email) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'Either name or email must be provided for search_clients.' }) }],
            isError: true,
          };
        }

        let sql = 'SELECT * FROM clients WHERE ';
        const bindings: any[] = [];
        const conditions: string[] = [];

        if (params.name) {
          conditions.push('(first_name LIKE ? OR last_name LIKE ?)');
          bindings.push(`%${params.name}%`, `%${params.name}%`);
        }
        if (params.email) {
          conditions.push('email LIKE ?');
          bindings.push(`%${params.email}%`);
        }

        sql += conditions.join(' AND ');
        sql += ' ORDER BY last_name, first_name;';

        try {
          let statement = this.env.DB.prepare(sql);
          if (bindings.length > 0) {
            statement = statement.bind(...bindings);
          }
          const D1results = await statement.all();

          if (D1results.success) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results ?? []) }] };
          } else {
            console.error('MyMCP: search_clients error:', D1results.error, D1results.meta);
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'Client search query failed.', details: D1results.error }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception in search_clients:', e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );

    // Search Trips
    this.server.tool(
      'search_trips',
      'Searches for trips by client name, client ID, trip name, or destination. Uses TripSummaryView.',
      {
        client_name: z.string().optional().describe('Full or partial name of a client associated with the trip.'),
        client_id: z.number().int().positive().optional().describe('Unique ID of a client associated with the trip.'),
        trip_name: z.string().optional().describe('Full or partial name of the trip.'),
        destination: z.string().optional().describe('Full or partial name of a destination in the trip (searches trip_name and description for now).'),
      },
      async (params: { client_name?: string; client_id?: number; trip_name?: string; destination?: string }) => {
        console.log('MyMCP: search_trips called with:', params);
        if (!params.client_name && !params.client_id && !params.trip_name && !params.destination) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'At least one search parameter must be provided for search_trips.' }) }],
            isError: true,
          };
        }

        // We will use TripSummaryView as it contains traveler names and basic trip details.
        // For destination search, we'll have to rely on trip_name or potentially join with other tables/views if more detailed destination searching is needed.
        // For simplicity now, destination will search trip_name and description from the Trips table (via TripSummaryView).
        
        let sql = 'SELECT * FROM TripSummaryView WHERE 1=1 ';
        const bindings: any[] = [];

        if (params.client_id) {
          // TripSummaryView has traveler_ids as a comma-separated string. This is not ideal for direct SQL LIKE.
          // A more robust solution would be to join with ClientGroupMembers and Clients, or have a better view structure.
          // For now, we'll use a subquery approach or rely on client_name if provided.
          // This part is complex with current TripSummaryView structure for client_id search.
          // Let's prioritize client_name for now if both are given, or adjust the view.
          // Given the constraints, we will primarily use client_name for searching by client.
          // If only client_id is given, it's harder with TripSummaryView's concatenated traveler_ids.
          // We will use a LIKE on traveler_ids for a basic match.
           sql += 'AND (traveler_ids LIKE ? OR traveler_ids LIKE ? OR traveler_ids LIKE ? OR traveler_ids = ?) '; // Handles start, middle, end, and exact match for a single ID
           const clientIdStr = String(params.client_id);
           bindings.push(`%${clientIdStr},%`, `%,${clientIdStr},%`, `%,${clientIdStr}`, clientIdStr);
        }
        
        if (params.client_name) {
          sql += 'AND (primary_contact_first_name LIKE ? OR primary_contact_last_name LIKE ? OR group_members LIKE ?) ';
          const clientNameSearch = `%${params.client_name}%`;
          bindings.push(clientNameSearch, clientNameSearch, clientNameSearch);
        }

        if (params.trip_name) {
          sql += 'AND trip_name LIKE ? ';
          bindings.push(`%${params.trip_name}%`);
        }
        
        if (params.destination) {
          // TripSummaryView doesn't directly link to a simple destination field from a Destinations table.
          // It gets trip_name from Trips. We can search trip_name for the destination.
          // A more advanced search would require joining or a different view.
          sql += 'AND (trip_name LIKE ? OR EXISTS (SELECT 1 FROM TripDays td JOIN TripActivities ta ON td.day_id = ta.day_id WHERE td.trip_id = TripSummaryView.trip_id AND ta.location_name LIKE ?)) ';
          bindings.push(`%${params.destination}%`, `%${params.destination}%`);
        }

        sql += 'ORDER BY start_date DESC, trip_name;';

        try {
          let statement = this.env.DB.prepare(sql);
          if (bindings.length > 0) {
            statement = statement.bind(...bindings);
          }
          const D1results = await statement.all();

          if (D1results.success) {
            return { content: [{ type: 'text', text: JSON.stringify(D1results.results ?? []) }] };
          } else {
            console.error('MyMCP: search_trips error:', D1results.error, D1results.meta);
            return {
              content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: 'Trip search query failed.', details: D1results.error }) }],
              isError: true,
            };
          }
        } catch (e: any) {
          console.error('MyMCP: Exception in search_trips:', e.message, e.stack);
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: `Exception: ${e.message}` }) }],
            isError: true,
          };
        }
      }
    );

    console.log('MyMCP: Tools initialization complete.');
  }
  // This method overrides the base McpAgent's onSSEMcpMessage.
  // Its signature MUST match the base class: (sessionId: string, request: Request) => Promise<Error | null>
  public async onSSEMcpMessage(sessionId: string, request: Request): Promise<Error | null> {
    const logPrefix = `D1 Worker MyMCP.onSSEMcpMessage: Session ID: ${sessionId},`;
    let messageText = "[Could not read message body]";
    let payload: JsonRpcRequestMessage | null = null;

    try {
        const clonedRequest = request.clone(); 
        messageText = await clonedRequest.text();
        console.log(`${logPrefix} Received raw message: ${messageText}`);

        payload = JSON.parse(messageText);
        console.log(`${logPrefix} Parsed payload method: ${payload?.method}`);
        console.log(`${logPrefix} Parsed full payload: ${JSON.stringify(payload)}`);

        if (payload && (payload.method === 'prompts/list' || payload.method === 'resources/list')) {
            const response: JsonRpcResponseMessage = {
                jsonrpc: '2.0',
                id: payload.id,
                result: [], 
            };
            const responseString = JSON.stringify(response);
            console.log(`${logPrefix} Sending custom response for ${payload.method}: ${responseString}`);

            const state = (this.state as unknown as DurableObjectState);
            const sockets = state.getWebSockets(sessionId);

            if (sockets.length > 0) {
                sockets.forEach(socket => {
                    try {
                        socket.send(responseString);
                    } catch (socketError: any) {
                        console.error(`${logPrefix} Error sending to WebSocket for method ${payload?.method}: ${socketError.message}`);
                    }
                });
            } else {
                console.error(`${logPrefix} No WebSocket found to send response for ${payload?.method}`);
            }
            return null; 
        }
    } catch (e: any) {
        console.error(`${logPrefix} Error parsing message or in custom handler: ${e instanceof Error ? e.message : String(e)}. Raw message was: ${messageText}`);
    }

    console.log(`${logPrefix} About to call super.onSSEMcpMessage for method: ${payload?.method || 'unknown (payload null or parse failed)'}. Raw message: ${messageText}`);
    return super.onSSEMcpMessage(sessionId, request);
  }
// This fetch method will be called on the Durable Object instance
  // when a request is routed to it.
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
console.log(`D1 Worker MyMCP.fetch: method=${request.method}, url=${request.url}`);
    if (request.method === 'POST') {
        try {
            const clonedRequest = request.clone(); // Clone to avoid consuming the body
            const payload: any = await clonedRequest.json();
            console.log(`D1 Worker MyMCP.fetch POST payload method: ${payload?.method}`);
            // Add a log for the actual payload to see its structure
            console.log(`D1 Worker MyMCP.fetch POST full payload: ${JSON.stringify(payload)}`);
        } catch (e) {
            console.log(`D1 Worker MyMCP.fetch: Could not parse POST body as JSON or no method field.`);
        }
    }
    
    // We are interested in POST requests to /mcp or /mcp/*
    if (request.method === 'POST' && (requestUrl.pathname === '/mcp' || requestUrl.pathname.startsWith('/mcp/'))) {
        let message: JsonRpcRequestMessage | undefined;
        let messageId: string | number | null = null;
        
        try {
            // Clone the request to read its body, so the original request can still be passed to super.fetch if needed.
            const clonedRequest = request.clone();
            const requestBodyText = await clonedRequest.text();
            message = JSON.parse(requestBodyText) as JsonRpcRequestMessage;
            messageId = message.id;

            // If the method is not one of the above, it will fall through to super.fetch(request)
        } catch (error: any) {
            // This catch block handles errors during parsing or initial processing
            // of requests that *might* have been one of our target methods.
            console.error("MyMCP: Error during pre-processing in custom fetch for /mcp POST:", error.message);
            const errorResponse: JsonRpcResponseMessage = {
                jsonrpc: '2.0',
                id: messageId, // Use parsed ID if available, otherwise it might be null
                error: { code: -32700, message: 'Parse error or invalid request during custom handling', data: error.message },
            };
            return new Response(JSON.stringify(errorResponse), {
                status: 400, // Bad Request due to parsing or structure
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
    
    // For any other request method, path, or if the method wasn't one of the special ones,
    // delegate to the McpAgent's base fetch handling using the original request.
    return super.fetch(request);
  }
  // log(level: LogLevel, ...data: any[]): void {
  //   // Custom logging implementation
  //   super.log(level, '[CleanD1Mcp]', ...data);
  // }
}

// Standard Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // MCP typically uses /mcp for regular requests and /sse for streaming
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      // The .serve() method from McpAgent handles routing to the agent.
      // It requires the base path the agent is serving from.
      return MyMCP.serve('/mcp').fetch(request, env, ctx);
    }
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      // .serveSSE() is for Server-Sent Events, often used by MCP for streaming.
      return MyMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    return new Response('Not found. MCP server available at /mcp or /sse.', { status: 404 });
  },
};
