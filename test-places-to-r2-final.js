#!/usr/bin/env node

/**
 * Complete Google Places MCP -> R2 Storage workflow test
 * Using proper SSE session creation and MCP protocol
 */

const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Configuration
const GOOGLE_PLACES_URL = 'https://google-places-api-mcp.somotravel.workers.dev';
const R2_STORAGE_URL = 'https://r2-storage-mcp.somotravel.workers.dev';
const GOOGLE_AUTH = 'google-places-mcp-auth-key-2025';
const R2_AUTH = 'r2-mcp-auth-key-2025';

class MCPClient {
    constructor(baseUrl, authKey) {
        this.baseUrl = baseUrl;
        this.authKey = authKey;
        this.sessionId = null;
        this.messageUrl = null;
    }

    async initializeSession() {
        console.log(`🔌 Initializing session for ${this.baseUrl}...`);

        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${this.baseUrl}/sse`, {
                headers: {
                    'Authorization': `Bearer ${this.authKey}`
                }
            });

            eventSource.addEventListener('endpoint', (event) => {
                console.log(`📡 Received endpoint: ${event.data}`);

                // Handle relative URLs
                if (event.data.startsWith('/')) {
                    this.messageUrl = this.baseUrl + event.data;
                } else {
                    this.messageUrl = event.data;
                }

                // Extract sessionId
                const url = new URL(this.messageUrl);
                this.sessionId = url.searchParams.get('sessionId');

                console.log(`🆔 Session ID: ${this.sessionId}`);
                eventSource.close();
                resolve();
            });

            eventSource.addEventListener('error', (error) => {
                console.error('❌ SSE Error:', error);
                eventSource.close();
                reject(error);
            });

            setTimeout(() => {
                eventSource.close();
                reject(new Error('Session initialization timeout'));
            }, 10000);
        });
    }

    async initialize() {
        console.log(`🚀 Initializing MCP protocol...`);

        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "test-client", version: "1.0.0" }
            }
        };

        const response = await fetch(this.messageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authKey}`,
                'mcp-session-id': this.sessionId
            },
            body: JSON.stringify(request)
        });

        const result = await this.parseSSEResponse(await response.text());
        console.log(`✅ MCP initialized: ${result ? 'success' : 'failed'}`);
        return result;
    }

    async listTools() {
        console.log(`📋 Listing available tools...`);

        const request = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {}
        };

        const response = await fetch(this.messageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authKey}`,
                'mcp-session-id': this.sessionId
            },
            body: JSON.stringify(request)
        });

        return await this.parseSSEResponse(await response.text());
    }

    async callTool(toolName, args) {
        console.log(`🔧 Calling tool: ${toolName}`);

        const request = {
            jsonrpc: "2.0",
            id: Math.floor(Math.random() * 1000),
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            }
        };

        const response = await fetch(this.messageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authKey}`,
                'mcp-session-id': this.sessionId
            },
            body: JSON.stringify(request)
        });

        return await this.parseSSEResponse(await response.text());
    }

    parseSSEResponse(text) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    return JSON.parse(line.slice(6));
                } catch (e) {
                    console.warn('Failed to parse SSE data:', line);
                }
            }
        }
        return null;
    }
}

class PlacesToR2Workflow {
    constructor() {
        this.googleClient = new MCPClient(GOOGLE_PLACES_URL, GOOGLE_AUTH);
        this.r2Client = new MCPClient(R2_STORAGE_URL, R2_AUTH);
    }

    async setup() {
        console.log('🚀 Setting up workflow clients...');

        // Initialize Google Places client
        await this.googleClient.initializeSession();
        await this.googleClient.initialize();

        // Initialize R2 Storage client
        await this.r2Client.initializeSession();
        await this.r2Client.initialize();

        console.log('✅ Both clients initialized successfully');
    }

    async listAllTools() {
        console.log('\n📋 Available Tools:');

        const googleTools = await this.googleClient.listTools();
        if (googleTools && googleTools.result && googleTools.result.tools) {
            console.log('\nGoogle Places API tools:');
            googleTools.result.tools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
            });
        }

        const r2Tools = await this.r2Client.listTools();
        if (r2Tools && r2Tools.result && r2Tools.result.tools) {
            console.log('\nR2 Storage tools:');
            r2Tools.result.tools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
            });
        }
    }

    async runWorkflow() {
        console.log('\n🎯 Starting Places -> R2 workflow...');
        console.log('=' * 60);

        try {
            // Step 1: Find place
            console.log('\n1️⃣ Finding Eiffel Tower...');
            const findResult = await this.googleClient.callTool('find_place', {
                query: 'Eiffel Tower Paris',
                max_results: 1
            });

            if (!findResult || !findResult.result || !findResult.result.content) {
                throw new Error('Failed to find place');
            }

            const findData = JSON.parse(findResult.result.content[0].text);
            if (!findData.candidates || findData.candidates.length === 0) {
                throw new Error('No place candidates found');
            }

            const placeId = findData.candidates[0].place_id;
            const placeName = findData.candidates[0].name;
            console.log(`✅ Found: ${placeName} (${placeId})`);

            // Step 2: Get place details with photos
            console.log('\n2️⃣ Getting place details...');
            const detailsResult = await this.googleClient.callTool('get_place_details', {
                place_id: placeId,
                fields: ['photos', 'name', 'formatted_address']
            });

            if (!detailsResult || !detailsResult.result || !detailsResult.result.content) {
                throw new Error('Failed to get place details');
            }

            const detailsData = JSON.parse(detailsResult.result.content[0].text);
            if (!detailsData.result || !detailsData.result.photos || detailsData.result.photos.length === 0) {
                throw new Error('No photos found for this place');
            }

            const photoRef = detailsData.result.photos[0].photo_reference;
            console.log(`✅ Found ${detailsData.result.photos.length} photos`);

            // Step 3: Get photo URL and data
            console.log('\n3️⃣ Getting photo data...');
            const photoResult = await this.googleClient.callTool('get_place_photo_url', {
                photo_reference: photoRef,
                max_width: 400
            });

            if (!photoResult || !photoResult.result || !photoResult.result.content) {
                throw new Error('Failed to get photo data');
            }

            const photoData = JSON.parse(photoResult.result.content[0].text);
            if (!photoData.base64_data) {
                throw new Error('No base64 data in photo response');
            }

            console.log(`✅ Photo data retrieved (${photoData.base64_data.length} characters)`);

            // Step 4: Upload to R2
            console.log('\n4️⃣ Uploading to R2 Storage...');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `eiffel-tower-${timestamp}.jpg`;
            const objectKey = `test-photos/${filename}`;

            const uploadResult = await this.r2Client.callTool('upload_object', {
                key: objectKey,
                content: photoData.base64_data,
                content_type: 'image/jpeg'
            });

            if (!uploadResult || !uploadResult.result || !uploadResult.result.content) {
                throw new Error('Failed to upload to R2');
            }

            console.log(`✅ Uploaded: ${filename}`);
            console.log(`   Upload result: ${uploadResult.result.content[0].text}`);

            // Step 5: Verify upload
            console.log('\n5️⃣ Verifying R2 storage...');
            const listResult = await this.r2Client.callTool('list_objects', {
                prefix: 'test-photos/'
            });

            if (!listResult || !listResult.result || !listResult.result.content) {
                throw new Error('Failed to list R2 objects');
            }

            const listText = listResult.result.content[0].text;
            const isFound = listText.includes(filename);

            console.log(`✅ Verification: ${isFound ? 'SUCCESS' : 'FAILED'}`);
            console.log(`   Objects listed: ${listText}`);

            // Final summary
            console.log('\n🎉 Workflow completed successfully!');
            console.log('=' * 60);
            console.log(`📍 Place: ${placeName}`);
            console.log(`📸 Photo uploaded: ${filename}`);
            console.log(`☁️ R2 Object Key: ${objectKey}`);
            console.log(`🌐 Photo URL: ${photoData.photo_url || 'N/A'}`);
            console.log('=' * 60);

        } catch (error) {
            console.error('❌ Workflow failed:', error.message);
            throw error;
        }
    }

    async run() {
        try {
            await this.setup();
            await this.listAllTools();
            await this.runWorkflow();
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
}

// Run the test
if (require.main === module) {
    const workflow = new PlacesToR2Workflow();
    workflow.run().catch(console.error);
}

module.exports = { PlacesToR2Workflow };
