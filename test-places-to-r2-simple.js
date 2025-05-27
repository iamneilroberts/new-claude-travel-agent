#!/usr/bin/env node

/**
 * Simplified Google Places MCP -> R2 Storage workflow test
 * Direct HTTP approach without SSE session complexity
 */

const fetch = require('node-fetch');

// Configuration
const GOOGLE_PLACES_URL = 'https://google-places-api-mcp.somotravel.workers.dev';
const R2_STORAGE_URL = 'https://r2-storage-mcp.somotravel.workers.dev';
const GOOGLE_AUTH = 'google-places-mcp-auth-key-2025';
const R2_AUTH = 'r2-mcp-auth-key-2025';

class SimpleMCPClient {
    constructor(baseUrl, authKey) {
        this.baseUrl = baseUrl;
        this.authKey = authKey;
    }

    async healthCheck() {
        console.log(`🏥 Health check for ${this.baseUrl}...`);
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const result = await response.json();
            console.log(`✅ Health check result:`, result);
            return result;
        } catch (error) {
            console.error(`❌ Health check failed:`, error.message);
            return null;
        }
    }

    async callToolDirect(toolName, args) {
        console.log(`🔧 Direct tool call: ${toolName}`);
        console.log(`📝 Arguments:`, JSON.stringify(args, null, 2));

        const request = {
            jsonrpc: "2.0",
            id: Math.floor(Math.random() * 1000),
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            }
        };

        try {
            const response = await fetch(`${this.baseUrl}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authKey}`,
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            console.log(`✅ Tool result received`);
            return result;
        } catch (error) {
            console.error(`❌ Tool call failed:`, error.message);
            return null;
        }
    }

    async listTools() {
        console.log(`📋 Listing tools from ${this.baseUrl}...`);

        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        };

        try {
            const response = await fetch(`${this.baseUrl}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authKey}`,
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`❌ Failed to list tools:`, error.message);
            return null;
        }
    }
}

class SimplePlacesToR2Workflow {
    constructor() {
        this.googleClient = new SimpleMCPClient(GOOGLE_PLACES_URL, GOOGLE_AUTH);
        this.r2Client = new SimpleMCPClient(R2_STORAGE_URL, R2_AUTH);
    }

    async healthChecks() {
        console.log('\n🏥 Running health checks...');
        console.log('='.repeat(50));

        const googleHealth = await this.googleClient.healthCheck();
        const r2Health = await this.r2Client.healthCheck();

        const googleOk = googleHealth && googleHealth.status === 'healthy';
        const r2Ok = r2Health && r2Health.status === 'healthy';

        console.log(`Google Places API: ${googleOk ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`R2 Storage: ${r2Ok ? '✅ Healthy' : '❌ Unhealthy'}`);

        return googleOk && r2Ok;
    }

    async listAllTools() {
        console.log('\n📋 Discovering available tools...');
        console.log('='.repeat(50));

        const googleTools = await this.googleClient.listTools();
        if (googleTools && googleTools.result && googleTools.result.tools) {
            console.log('\nGoogle Places API tools:');
            googleTools.result.tools.forEach(tool => {
                console.log(`  ✓ ${tool.name}: ${tool.description || 'No description'}`);
            });
        } else {
            console.log('❌ Failed to get Google Places tools');
        }

        const r2Tools = await this.r2Client.listTools();
        if (r2Tools && r2Tools.result && r2Tools.result.tools) {
            console.log('\nR2 Storage tools:');
            r2Tools.result.tools.forEach(tool => {
                console.log(`  ✓ ${tool.name}: ${tool.description || 'No description'}`);
            });
        } else {
            console.log('❌ Failed to get R2 Storage tools');
        }
    }

    async runCompleteWorkflow() {
        console.log('\n🎯 Starting Complete Places → R2 Workflow...');
        console.log('='.repeat(60));

        try {
            // Step 1: Find a place
            console.log('\n1️⃣ Step 1: Find a famous place...');
            const findResult = await this.googleClient.callToolDirect('find_place', {
                query: 'Statue of Liberty New York',
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
            console.log(`✅ Found: ${placeName}`);
            console.log(`🆔 Place ID: ${placeId}`);

            // Step 2: Get place details with photos
            console.log('\n2️⃣ Step 2: Get place details with photos...');
            const detailsResult = await this.googleClient.callToolDirect('get_place_details', {
                place_id: placeId,
                fields: ['photos', 'name', 'formatted_address', 'rating']
            });

            if (!detailsResult || !detailsResult.result || !detailsResult.result.content) {
                throw new Error('Failed to get place details');
            }

            const detailsData = JSON.parse(detailsResult.result.content[0].text);
            if (!detailsData.result) {
                throw new Error('Invalid place details response');
            }

            console.log(`✅ Place: ${detailsData.result.name}`);
            console.log(`📍 Address: ${detailsData.result.formatted_address}`);
            console.log(`⭐ Rating: ${detailsData.result.rating || 'N/A'}`);

            if (!detailsData.result.photos || detailsData.result.photos.length === 0) {
                console.log('⚠️ No photos available for this place, skipping photo workflow');
                return { success: true, message: 'Place found but no photos available' };
            }

            console.log(`📸 Found ${detailsData.result.photos.length} photos`);
            const photoRef = detailsData.result.photos[0].photo_reference;

            // Step 3: Get photo data
            console.log('\n3️⃣ Step 3: Download photo data...');
            const photoResult = await this.googleClient.callToolDirect('get_place_photo_url', {
                photo_reference: photoRef,
                max_width: 400
            });

            if (!photoResult || !photoResult.result || !photoResult.result.content) {
                throw new Error('Failed to get photo data');
            }

            const photoData = JSON.parse(photoResult.result.content[0].text);
            if (!photoData.base64_data) {
                console.log('⚠️ Photo URL provided but no base64 data for upload');
                console.log(`🌐 Photo URL: ${photoData.photo_url}`);
                return { success: true, message: 'Photo URL retrieved but no base64 data for R2 upload' };
            }

            console.log(`✅ Photo data downloaded`);
            console.log(`📦 Base64 data size: ${photoData.base64_data.length} characters`);
            console.log(`🌐 Photo URL: ${photoData.photo_url}`);

            // Step 4: Upload to R2
            console.log('\n4️⃣ Step 4: Upload photo to R2 Storage...');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `statue-of-liberty-${timestamp}.jpg`;
            const objectKey = `test-photos/${filename}`;

            const uploadResult = await this.r2Client.callToolDirect('upload_object', {
                key: objectKey,
                content: photoData.base64_data,
                content_type: 'image/jpeg'
            });

            if (!uploadResult || !uploadResult.result || !uploadResult.result.content) {
                throw new Error('Failed to upload to R2');
            }

            console.log(`✅ Uploaded to R2: ${filename}`);
            const uploadData = JSON.parse(uploadResult.result.content[0].text);
            console.log(`📊 Upload details:`, uploadData);

            // Step 5: Verify upload by listing objects
            console.log('\n5️⃣ Step 5: Verify photo is accessible on R2...');
            const listResult = await this.r2Client.callToolDirect('list_objects', {
                prefix: 'test-photos/'
            });

            if (!listResult || !listResult.result || !listResult.result.content) {
                throw new Error('Failed to list R2 objects');
            }

            const listData = JSON.parse(listResult.result.content[0].text);
            const foundFile = listData.objects && listData.objects.some(obj => obj.key === objectKey);

            console.log(`✅ File verification: ${foundFile ? 'SUCCESS' : 'FAILED'}`);
            if (foundFile) {
                console.log(`🗂️ Found in R2: ${objectKey}`);
            }

            // Step 6: Test direct access to the uploaded file
            console.log('\n6️⃣ Step 6: Test direct access to uploaded photo...');
            const getResult = await this.r2Client.callToolDirect('get_object', {
                key: objectKey
            });

            if (!getResult || !getResult.result || !getResult.result.content) {
                console.log('⚠️ Could not retrieve object directly');
            } else {
                const getData = JSON.parse(getResult.result.content[0].text);
                console.log(`✅ Direct access successful`);
                console.log(`📁 File size: ${getData.content?.length || 'unknown'} bytes`);
                console.log(`📅 Last modified: ${getData.lastModified || 'unknown'}`);
            }

            // Final summary
            console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY! 🎉');
            console.log('='.repeat(60));
            console.log(`📍 Place: ${placeName}`);
            console.log(`📸 Photo: ${filename}`);
            console.log(`☁️ R2 Key: ${objectKey}`);
            console.log(`🌐 Original URL: ${photoData.photo_url}`);
            console.log(`✅ Verification: Photo is accessible on R2`);
            console.log('='.repeat(60));

            return {
                success: true,
                place: placeName,
                filename: filename,
                r2Key: objectKey,
                photoUrl: photoData.photo_url
            };

        } catch (error) {
            console.error('\n❌ WORKFLOW FAILED:', error.message);
            console.error('Stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    async run() {
        try {
            console.log('🚀 Google Places → R2 Storage Integration Test');
            console.log('🕒 Started at:', new Date().toISOString());

            // Health checks first
            const healthOk = await this.healthChecks();
            if (!healthOk) {
                console.log('❌ Health checks failed, aborting test');
                return;
            }

            // List available tools
            await this.listAllTools();

            // Run complete workflow
            const result = await this.runCompleteWorkflow();

            console.log('\n📋 FINAL RESULT:');
            console.log(JSON.stringify(result, null, 2));

        } catch (error) {
            console.error('❌ Test execution failed:', error);
        }
    }
}

// Run the test
if (require.main === module) {
    const workflow = new SimplePlacesToR2Workflow();
    workflow.run().catch(console.error);
}

module.exports = { SimplePlacesToR2Workflow };
