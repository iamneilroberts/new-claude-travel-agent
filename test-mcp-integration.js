// Complete MCP integration test for Google Places → R2 Storage
const { EventSource } = await import('eventsource');

class MCPClient {
  constructor(baseUrl, authKey) {
    this.baseUrl = baseUrl;
    this.authKey = authKey;
    this.sessionId = null;
    this.messageUrl = null;
  }

  async initializeSession() {
    console.log(`Initializing session with ${this.baseUrl}...`);

    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.baseUrl}/sse`, {
        headers: {
          'Authorization': `Bearer ${this.authKey}`
        }
      });

      eventSource.onopen = () => {
        console.log('SSE connection opened');
      };

      eventSource.addEventListener('endpoint', (event) => {
        console.log('Received endpoint:', event.data);
        // Handle relative URLs by combining with base URL
        if (event.data.startsWith('/')) {
          this.messageUrl = this.baseUrl + event.data;
        } else {
          this.messageUrl = event.data;
        }
        const url = new URL(this.messageUrl);
        this.sessionId = url.searchParams.get('sessionId');
        console.log(`Session ID: ${this.sessionId}, Message URL: ${this.messageUrl}`);
        eventSource.close();
        resolve();
      });

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        reject(error);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.sessionId) {
          eventSource.close();
          reject(new Error('Session initialization timeout'));
        }
      }, 10000);
    });
  }

  async callTool(toolName, args) {
    if (!this.messageUrl) {
      throw new Error('Session not initialized');
    }

    const request = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    };

    console.log(`Calling tool ${toolName} with args:`, args);

    const response = await fetch(this.messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authKey}`,
        'mcp-session-id': this.sessionId
      },
      body: JSON.stringify(request)
    });

    const text = await response.text();
    console.log(`Response status: ${response.status}`);

    if (text.includes('event: message')) {
      const dataLine = text.split('\n').find(line => line.startsWith('data: '));
      if (dataLine) {
        return JSON.parse(dataLine.replace('data: ', ''));
      }
    }

    throw new Error(`Invalid response: ${text}`);
  }

  async initialize() {
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

    return this.parseSSEResponse(await response.text());
  }

  parseSSEResponse(text) {
    if (text.includes('event: message')) {
      const dataLine = text.split('\n').find(line => line.startsWith('data: '));
      if (dataLine) {
        return JSON.parse(dataLine.replace('data: ', ''));
      }
    }
    throw new Error(`Invalid SSE response: ${text}`);
  }
}

async function testFullWorkflow() {
  console.log("=== Full MCP Integration Test: Google Places → R2 Storage ===\n");

  try {
    // Initialize Google Places client
    console.log("1. Initializing Google Places API client...");
    const placesClient = new MCPClient(
      "https://google-places-api-mcp.somotravel.workers.dev",
      "google-places-mcp-auth-key-2025"
    );

    await placesClient.initializeSession();
    console.log(`Places session ID: ${placesClient.sessionId}\n`);

    // Initialize the MCP connection
    const initResult = await placesClient.initialize();
    console.log("Places initialization result:", JSON.stringify(initResult, null, 2));

    // Initialize R2 Storage client
    console.log("\n2. Initializing R2 Storage client...");
    const storageClient = new MCPClient(
      "https://r2-storage-mcp.somotravel.workers.dev",
      "r2-mcp-auth-key-2025"
    );

    await storageClient.initializeSession();
    console.log(`Storage session ID: ${storageClient.sessionId}\n`);

    const storageInitResult = await storageClient.initialize();
    console.log("Storage initialization result:", JSON.stringify(storageInitResult, null, 2));

    // Step 3: Find Eiffel Tower
    console.log("\n3. Finding Eiffel Tower...");
    const findResult = await placesClient.callTool("find_place", {
      query: "Eiffel Tower Paris",
      max_results: 1
    });

    console.log("Find result:", JSON.stringify(findResult, null, 2));

    if (findResult.result && findResult.result.content) {
      const findContent = JSON.parse(findResult.result.content[0].text);

      if (findContent.candidates && findContent.candidates[0]) {
        const placeId = findContent.candidates[0].place_id;
        console.log(`\nFound place ID: ${placeId}`);

        // Step 4: Get place details
        console.log("\n4. Getting place details with photos...");
        const detailsResult = await placesClient.callTool("get_place_details", {
          place_id: placeId,
          fields: ["photos", "name", "formatted_address"]
        });

        console.log("Details result:", JSON.stringify(detailsResult, null, 2));

        if (detailsResult.result && detailsResult.result.content) {
          const detailsContent = JSON.parse(detailsResult.result.content[0].text);

          if (detailsContent.result && detailsContent.result.photos) {
            const photoRef = detailsContent.result.photos[0].photo_reference;
            console.log(`\nFound photo reference: ${photoRef}`);

            // Step 5: Get photo URL
            console.log("\n5. Getting photo URL...");
            const photoResult = await placesClient.callTool("get_place_photo_url", {
              photo_reference: photoRef,
              max_width: 400
            });

            console.log("Photo result:", JSON.stringify(photoResult, null, 2));

            // Step 6: Upload to R2 (with mock photo data)
            console.log("\n6. Uploading photo to R2 Storage...");
            const uploadResult = await storageClient.callTool("upload_object", {
              key: "test-photos/eiffel-tower-" + Date.now() + ".jpg",
              content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", // 1x1 PNG base64
              content_type: "image/jpeg"
            });

            console.log("Upload result:", JSON.stringify(uploadResult, null, 2));

            // Step 7: List objects to verify
            console.log("\n7. Listing objects to verify storage...");
            const listResult = await storageClient.callTool("list_objects", {
              prefix: "test-photos/"
            });

            console.log("List result:", JSON.stringify(listResult, null, 2));

            console.log("\n✅ Full workflow completed successfully!");
          } else {
            console.log("❌ No photos found for this place");
          }
        }
      } else {
        console.log("❌ No place found for query");
      }
    }

  } catch (error) {
    console.error("❌ Error in workflow:", error.message);
    console.error("Stack:", error.stack);
  }
}

testFullWorkflow();
