#!/usr/bin/env node

/**
 * Test workflow: Google Places MCP -> R2 Storage
 * 1. Search for a place using Google Places MCP
 * 2. Get place details and photo URLs
 * 3. Download photos and save to R2 storage
 * 4. Verify photos are stored in R2
 */

const https = require('https');

// Configuration
const GOOGLE_PLACES_MCP_URL = 'https://google-places-api-mcp.somotravel.workers.dev';
const R2_STORAGE_MCP_URL = 'https://r2-storage-mcp.somotravel.workers.dev';
const GOOGLE_AUTH = 'google-places-mcp-auth-key-2025';
const R2_AUTH = 'r2-mcp-auth-key-2025';

// Test place search query
const SEARCH_QUERY = 'Eiffel Tower Paris';

/**
 * Helper function to make MCP requests via SSE endpoint
 */
async function makeRequest(url, data, authKey) {
    const fetch = (await import('node-fetch')).default;

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

    // Parse SSE response
    if (text.includes('event: message')) {
        const dataLine = text.split('\n').find(line => line.startsWith('data: '));
        if (dataLine) {
            return JSON.parse(dataLine.replace('data: ', ''));
        }
    }

    return { error: 'Invalid response format', raw: text };
}

/**
 * Test Google Places MCP find_place tool
 */
async function testFindPlace(query) {
    console.log(`\n🔍 Searching for place: "${query}"`);

    const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "find_place",
            arguments: {
                query: query,
                max_results: 1
            }
        }
    };

    try {
        const response = await makeRequest(GOOGLE_PLACES_MCP_URL, requestBody, GOOGLE_AUTH);

        console.log(`✅ Find place response received`);

        if (response.result && response.result.content) {
            const content = JSON.parse(response.result.content[0].text);
            console.log(`📍 Found place data:`, JSON.stringify(content, null, 2));

            if (content.candidates && content.candidates.length > 0) {
                const placeId = content.candidates[0].place_id;
                const placeName = content.candidates[0].name;
                console.log(`📍 Place ID: ${placeId}, Name: ${placeName}`);

                return { success: true, placeId, placeName, result: content };
            } else {
                console.log('❌ No candidates found in response');
                return { success: false };
            }
        } else {
            console.log('❌ No place found or unexpected response format');
            console.log('Response:', JSON.stringify(response, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error finding place:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test Google Places MCP get_place_details tool
 */
async function testGetPlaceDetails(placeId) {
    console.log(`\n📋 Getting place details for: ${placeId}`);

    const requestBody = {
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

    try {
        const response = await makeRequest(GOOGLE_PLACES_MCP_URL, requestBody, GOOGLE_AUTH);

        console.log(`✅ Place details response received`);

        if (response.result && response.result.content) {
            const content = JSON.parse(response.result.content[0].text);
            console.log(`📋 Details:`, JSON.stringify(content, null, 2));

            if (content.result && content.result.photos) {
                const photoRefs = content.result.photos.map(photo => photo.photo_reference);
                console.log(`📸 Found ${photoRefs.length} photo references`);
                return { success: true, photoRefs, result: content };
            } else {
                console.log('❌ No photos found in place details');
                return { success: false };
            }
        } else {
            console.log('❌ No place details found or unexpected response format');
            console.log('Response:', JSON.stringify(response, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error getting place details:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test Google Places MCP get_place_photo_url tool
 */
async function testGetPhotoUrl(photoRef, maxWidth = 400) {
    console.log(`\n📷 Getting photo URL for reference: ${photoRef.substring(0, 20)}...`);

    const requestBody = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
            name: "get_place_photo_url",
            arguments: {
                photo_reference: photoRef,
                max_width: maxWidth
            }
        }
    };

    try {
        const response = await makeRequest(GOOGLE_PLACES_MCP_URL, requestBody, GOOGLE_AUTH);

        console.log(`✅ Photo URL response received`);

        if (response.result && response.result.content) {
            const content = JSON.parse(response.result.content[0].text);
            console.log(`📷 Photo data:`, JSON.stringify(content, null, 2));

            // Check if we have base64 data for R2 upload
            if (content.base64_data) {
                console.log(`📷 Base64 data available (${content.base64_data.length} characters)`);
                return {
                    success: true,
                    photoUrl: content.photo_url,
                    base64Data: content.base64_data,
                    result: content
                };
            } else {
                console.log('❌ No base64 data found in photo response');
                return { success: false };
            }
        } else {
            console.log('❌ No photo URL found or unexpected response format');
            console.log('Response:', JSON.stringify(response, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error getting photo URL:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test R2 Storage MCP upload_object tool
 */
async function testUploadToR2(base64Data, filename) {
    console.log(`\n☁️ Uploading image to R2: ${filename}`);

    const requestBody = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
            name: "upload_object",
            arguments: {
                key: `test-photos/${filename}`,
                content: base64Data,
                content_type: "image/jpeg"
            }
        }
    };

    try {
        const response = await makeRequest(R2_STORAGE_MCP_URL, requestBody, R2_AUTH);

        console.log(`✅ R2 upload response received`);

        if (response.result && response.result.content) {
            const result = response.result.content[0];
            console.log(`☁️ Upload result: ${result.text}`);

            return {
                success: true,
                objectKey: `test-photos/${filename}`,
                result: result.text
            };
        } else {
            console.log('❌ Upload failed or unexpected response format');
            console.log('Response:', JSON.stringify(response, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error uploading to R2:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test R2 Storage MCP list_objects tool to verify upload
 */
async function testVerifyR2Upload(objectKey) {
    console.log(`\n🔍 Verifying R2 upload: ${objectKey}`);

    const requestBody = {
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

    try {
        const response = await makeRequest(R2_STORAGE_MCP_URL, requestBody, R2_AUTH);

        console.log(`✅ R2 verification response received`);

        if (response.result && response.result.content) {
            const result = response.result.content[0];
            console.log(`🔍 Verification result: ${result.text}`);

            // Check if our object is listed
            const resultText = result.text;
            const isFound = resultText.includes(objectKey);

            return {
                success: isFound,
                result: resultText
            };
        } else {
            console.log('❌ Verification failed or unexpected response format');
            console.log('Response:', JSON.stringify(response, null, 2));
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error verifying R2 upload:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Main test workflow
 */
async function runWorkflowTest() {
    console.log('🚀 Starting Google Places -> R2 Storage workflow test');
    console.log('=' * 60);

    // Step 1: Search for a place
    const findResult = await testFindPlace(SEARCH_QUERY);
    if (!findResult.success) {
        console.log('❌ Workflow failed at place search step');
        return;
    }

    // Step 2: Get place details with photos
    const detailsResult = await testGetPlaceDetails(findResult.placeId);
    if (!detailsResult.success || detailsResult.photoRefs.length === 0) {
        console.log('❌ Workflow failed at place details step or no photos found');
        return;
    }

    // Step 3: Get photo URL and base64 data (use first photo)
    const photoRef = detailsResult.photoRefs[0];
    const photoResult = await testGetPhotoUrl(photoRef);
    if (!photoResult.success || !photoResult.base64Data) {
        console.log('❌ Workflow failed at photo URL step');
        return;
    }

    // Step 4: Upload to R2
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eiffel-tower-${timestamp}.jpg`;
    const uploadResult = await testUploadToR2(photoResult.base64Data, filename);
    if (!uploadResult.success) {
        console.log('❌ Workflow failed at R2 upload step');
        return;
    }

    // Step 5: Verify upload
    const verifyResult = await testVerifyR2Upload(uploadResult.objectKey);
    if (!verifyResult.success) {
        console.log('❌ Workflow failed at R2 verification step');
        return;
    }

    console.log('\n🎉 Workflow completed successfully!');
    console.log('=' * 60);
    console.log(`📍 Place: ${SEARCH_QUERY}`);
    console.log(`📸 Photo uploaded: ${filename}`);
    console.log(`☁️ R2 Object Key: ${uploadResult.objectKey}`);
    console.log(`🌐 Public URL: ${uploadResult.publicUrl}`);
    console.log('=' * 60);
}

// Run the test
if (require.main === module) {
    runWorkflowTest().catch(console.error);
}

module.exports = { runWorkflowTest };
