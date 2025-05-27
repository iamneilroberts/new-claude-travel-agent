// Test script for Google Places → R2 Storage workflow
const GOOGLE_PLACES_URL = "https://google-places-api-mcp.somotravel.workers.dev";
const R2_STORAGE_URL = "https://r2-storage-mcp.somotravel.workers.dev";
const GOOGLE_AUTH = "google-places-mcp-auth-key-2025";
const R2_AUTH = "r2-mcp-auth-key-2025";

async function makeRequest(url, data, authKey) {
  const response = await fetch(`${url}/sse/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authKey}`
    },
    body: JSON.stringify(data)
  });

  const text = await response.text();
  console.log(`Response status: ${response.status}`);
  console.log(`Response body: ${text}`);

  // Parse SSE response
  if (text.includes('event: message')) {
    const dataLine = text.split('\n').find(line => line.startsWith('data: '));
    if (dataLine) {
      return JSON.parse(dataLine.replace('data: ', ''));
    }
  }

  return { error: 'Invalid response format', raw: text };
}

async function testWorkflow() {
  console.log("=== Testing Google Places to R2 Storage Workflow ===\n");

  // Step 1: Find a place
  console.log("1. Finding Eiffel Tower...");
  const findPlaceRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "find_place",
      arguments: {
        query: "Eiffel Tower Paris",
        max_results: 1
      }
    }
  };

  try {
    const findResult = await makeRequest(GOOGLE_PLACES_URL, findPlaceRequest, GOOGLE_AUTH);
    console.log("Find place result:", JSON.stringify(findResult, null, 2));

    if (findResult.result && findResult.result.content) {
      const content = JSON.parse(findResult.result.content[0].text);
      if (content.candidates && content.candidates.length > 0) {
        const placeId = content.candidates[0].place_id;
        console.log(`Found place ID: ${placeId}\n`);

        // Step 2: Get place details with photos
        console.log("2. Getting place details...");
        const detailsRequest = {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "get_place_details",
            arguments: {
              place_id: placeId,
              fields: ["photos", "name", "formatted_address"]
            }
          }
        };

        const detailsResult = await makeRequest(GOOGLE_PLACES_URL, detailsRequest, GOOGLE_AUTH);
        console.log("Place details result:", JSON.stringify(detailsResult, null, 2));

        if (detailsResult.result && detailsResult.result.content) {
          const detailsContent = JSON.parse(detailsResult.result.content[0].text);
          if (detailsContent.result && detailsContent.result.photos) {
            const photoRef = detailsContent.result.photos[0].photo_reference;
            console.log(`Found photo reference: ${photoRef}\n`);

            // Step 3: Get photo URL/data
            console.log("3. Getting photo URL...");
            const photoRequest = {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: {
                name: "get_place_photo_url",
                arguments: {
                  photo_reference: photoRef,
                  max_width: 400
                }
              }
            };

            const photoResult = await makeRequest(GOOGLE_PLACES_URL, photoRequest, GOOGLE_AUTH);
            console.log("Photo URL result:", JSON.stringify(photoResult, null, 2));

            // Step 4: Upload to R2 (mock data for now)
            console.log("\n4. Uploading to R2 Storage...");
            const uploadRequest = {
              jsonrpc: "2.0",
              id: 4,
              method: "tools/call",
              params: {
                name: "upload_object",
                arguments: {
                  key: "test-photos/eiffel-tower.jpg",
                  content: "base64_mock_photo_data_here",
                  content_type: "image/jpeg"
                }
              }
            };

            const uploadResult = await makeRequest(R2_STORAGE_URL, uploadRequest, R2_AUTH);
            console.log("Upload result:", JSON.stringify(uploadResult, null, 2));

            // Step 5: Verify retrieval
            console.log("\n5. Verifying R2 storage...");
            const listRequest = {
              jsonrpc: "2.0",
              id: 5,
              method: "tools/call",
              params: {
                name: "list_objects",
                arguments: {
                  prefix: "test-photos/"
                }
              }
            };

            const listResult = await makeRequest(R2_STORAGE_URL, listRequest, R2_AUTH);
            console.log("List objects result:", JSON.stringify(listResult, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in workflow:", error);
  }
}

testWorkflow();
