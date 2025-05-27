#!/usr/bin/env node

/**
 * Robust Google Places MCP -> R2 Storage workflow test
 * Handles health check format differences and focuses on core functionality
 */

const fetch = require('node-fetch');

// Configuration
const GOOGLE_PLACES_URL = 'https://google-places-api-mcp.somotravel.workers.dev';
const R2_STORAGE_URL = 'https://r2-storage-mcp.somotravel.workers.dev';
const GOOGLE_AUTH = 'google-places-mcp-auth-key-2025';
const R2_AUTH = 'r2-mcp-auth-key-2025';

class RobustMCPClient {
    constructor(baseUrl, authKey, name) {
        this.baseUrl = baseUrl;
        this.authKey = authKey;
        this.name = name;
    }

    async healthCheck() {
        console.log(`🏥 Health check for ${this.name}...`);
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const contentType = response.headers.get('content-type');

            let result;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { status: 'unknown', message: text };
            }

            console.log(`✅ ${this.name} health:`, result);
            return response.ok;
        } catch (error) {
            console.error(`❌ ${this.name} health check failed:`, error.message);
            return false;
        }
    }

    async callTool(toolName, args) {
        console.log(`🔧 [${this.name}] Calling tool: ${toolName}`);
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
            const response = await fetch(`${this.baseUrl}/mcp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${this.authKey}`,
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [${this.name}] Tool completed successfully`);
            return result;
        } catch (error) {
            console.error(`❌ [${this.name}] Tool call failed:`, error.message);
            return null;
        }
    }

    async listTools() {
        console.log(`📋 [${this.name}] Listing available tools...`);

        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        };

        try {
            const response = await fetch(`${this.baseUrl}/mcp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${this.authKey}`,
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();

            if (result.result && result.result.tools) {
                console.log(`✅ [${this.name}] Found ${result.result.tools.length} tools:`);
                result.result.tools.forEach(tool => {
                    console.log(`  ✓ ${tool.name}: ${tool.description || 'No description'}`);
                });
            }

            return result;
        } catch (error) {
            console.error(`❌ [${this.name}] Failed to list tools:`, error.message);
            return null;
        }
    }
}

class RobustPlacesToR2Test {
    constructor() {
        this.googleClient = new RobustMCPClient(GOOGLE_PLACES_URL, GOOGLE_AUTH, 'Google Places API');
        this.r2Client = new RobustMCPClient(R2_STORAGE_URL, R2_AUTH, 'R2 Storage');
    }

    async testGooglePlacesOnly() {
        console.log('\n🎯 Testing Google Places API workflow...');
        console.log('='.repeat(60));

        try {
            // Step 1: Find a place
            console.log('\n1️⃣ Finding the Empire State Building...');
            const findResult = await this.googleClient.callTool('find_place', {
                query: 'Empire State Building New York',
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

            // Step 2: Get place details
            console.log('\n2️⃣ Getting detailed place information...');
            const detailsResult = await this.googleClient.callTool('get_place_details', {
                place_id: placeId,
                fields: ['photos', 'name', 'formatted_address', 'rating', 'website']
            });

            if (!detailsResult || !detailsResult.result || !detailsResult.result.content) {
                throw new Error('Failed to get place details');
            }

            const detailsData = JSON.parse(detailsResult.result.content[0].text);
            console.log(`✅ Place Details Retrieved:`);
            console.log(`   📍 Name: ${detailsData.result.name}`);
            console.log(`   🏠 Address: ${detailsData.result.formatted_address}`);
            console.log(`   ⭐ Rating: ${detailsData.result.rating || 'N/A'}`);
            console.log(`   🌐 Website: ${detailsData.result.website || 'N/A'}`);

            if (!detailsData.result.photos || detailsData.result.photos.length === 0) {
                console.log('⚠️ No photos available for this place');
                return {
                    success: true,
                    place: placeName,
                    hasPhotos: false,
                    message: 'Place found successfully but no photos available'
                };
            }

            console.log(`📸 Found ${detailsData.result.photos.length} photos`);

            // Step 3: Get photo data
            console.log('\n3️⃣ Downloading photo data...');
            const photoRef = detailsData.result.photos[0].photo_reference;
            const photoResult = await this.googleClient.callTool('get_place_photo_url', {
                photo_reference: photoRef,
                max_width: 400
            });

            if (!photoResult || !photoResult.result || !photoResult.result.content) {
                throw new Error('Failed to get photo data');
            }

            const photoData = JSON.parse(photoResult.result.content[0].text);
            console.log(`✅ Photo data retrieved:`);
            console.log(`   🌐 Photo URL: ${photoData.photo_url}`);
            console.log(`   📦 Has base64 data: ${photoData.base64_data ? 'Yes' : 'No'}`);

            if (photoData.base64_data) {
                console.log(`   📏 Base64 size: ${photoData.base64_data.length} characters`);
            }

            return {
                success: true,
                place: placeName,
                placeId: placeId,
                hasPhotos: true,
                photoRef: photoRef,
                photoUrl: photoData.photo_url,
                photoData: photoData.base64_data || null
            };

        } catch (error) {
            console.error('\n❌ Google Places test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async testR2StorageWithData(photoData, placeName) {
        console.log('\n🎯 Testing R2 Storage with photo data...');
        console.log('='.repeat(60));

        if (!photoData) {
            console.log('⚠️ No photo data available for R2 upload test');
            return { success: false, error: 'No photo data provided' };
        }

        try {
            // Step 1: Upload photo to R2
            console.log('\n1️⃣ Uploading photo to R2 Storage...');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${placeName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
            const objectKey = `test-photos/${filename}`;

            const uploadResult = await this.r2Client.callTool('upload_object', {
                key: objectKey,
                content: photoData,
                content_type: 'image/jpeg'
            });

            if (!uploadResult || !uploadResult.result || !uploadResult.result.content) {
                throw new Error('Failed to upload to R2');
            }

            const uploadData = JSON.parse(uploadResult.result.content[0].text);
            console.log(`✅ Photo uploaded successfully:`);
            console.log(`   📁 Filename: ${filename}`);
            console.log(`   🔑 Object key: ${objectKey}`);
            console.log(`   📊 Upload result:`, uploadData);

            // Step 2: Verify by listing objects
            console.log('\n2️⃣ Verifying upload by listing objects...');
            const listResult = await this.r2Client.callTool('list_objects', {
                prefix: 'test-photos/'
            });

            if (!listResult || !listResult.result || !listResult.result.content) {
                throw new Error('Failed to list R2 objects');
            }

            const listData = JSON.parse(listResult.result.content[0].text);
            const foundFile = listData.objects && listData.objects.some(obj => obj.key === objectKey);

            console.log(`✅ File verification: ${foundFile ? 'SUCCESS' : 'FAILED'}`);
            if (foundFile) {
                console.log(`   🗂️ Confirmed in R2: ${objectKey}`);
            }

            // Step 3: Test direct retrieval
            console.log('\n3️⃣ Testing direct file retrieval...');
            const getResult = await this.r2Client.callTool('get_object', {
                key: objectKey
            });

            if (!getResult || !getResult.result || !getResult.result.content) {
                console.log('⚠️ Could not retrieve object directly');
            } else {
                const getData = JSON.parse(getResult.result.content[0].text);
                console.log(`✅ Direct retrieval successful:`);
                console.log(`   📏 Content length: ${getData.content?.length || 'unknown'}`);
                console.log(`   📅 Last modified: ${getData.lastModified || 'unknown'}`);
            }

            return {
                success: true,
                filename: filename,
                objectKey: objectKey,
                verified: foundFile,
                uploadData: uploadData
            };

        } catch (error) {
            console.error('\n❌ R2 Storage test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async runCompleteTest() {
        console.log('🚀 COMPREHENSIVE GOOGLE PLACES → R2 STORAGE TEST');
        console.log('🕒 Started at:', new Date().toISOString());
        console.log('='.repeat(70));

        // Health checks (non-blocking)
        console.log('\n🏥 Running health checks...');
        const googleHealthy = await this.googleClient.healthCheck();
        const r2Healthy = await this.r2Client.healthCheck();

        // Tool discovery
        console.log('\n📋 Discovering available tools...');
        await this.googleClient.listTools();
        await this.r2Client.listTools();

        // Test Google Places workflow
        const googleResult = await this.testGooglePlacesOnly();

        if (!googleResult.success) {
            console.log('\n❌ Google Places test failed, cannot proceed to R2 test');
            return {
                success: false,
                phase: 'google_places',
                error: googleResult.error
            };
        }

        console.log('\n✅ Google Places workflow completed successfully!');

        // Test R2 Storage if we have photo data
        let r2Result = null;
        if (googleResult.photoData) {
            r2Result = await this.testR2StorageWithData(googleResult.photoData, googleResult.place);
        } else {
            console.log('\n⚠️ Skipping R2 Storage test - no photo data available');
            r2Result = { success: false, error: 'No photo data for upload' };
        }

        // Final summary
        console.log('\n🎉 TEST SUMMARY 🎉');
        console.log('='.repeat(70));
        console.log(`🏥 Google Places Health: ${googleHealthy ? '✅ Healthy' : '❌ Issues'}`);
        console.log(`🏥 R2 Storage Health: ${r2Healthy ? '✅ Healthy' : '❌ Issues'}`);
        console.log(`🔍 Place Search: ${googleResult.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`📸 Photo Retrieval: ${googleResult.hasPhotos ? '✅ Success' : '⚠️ No photos'}`);
        console.log(`☁️ R2 Upload: ${r2Result && r2Result.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`🔒 R2 Verification: ${r2Result && r2Result.verified ? '✅ Verified' : '❌ Not verified'}`);

        if (googleResult.success && r2Result && r2Result.success) {
            console.log('\n🏆 COMPLETE WORKFLOW SUCCESS!');
            console.log(`📍 Place: ${googleResult.place}`);
            console.log(`📸 Photo URL: ${googleResult.photoUrl}`);
            console.log(`☁️ R2 Object: ${r2Result.objectKey}`);
            console.log(`✅ Photo is accessible on R2 Storage`);
        }

        return {
            success: googleResult.success && (r2Result ? r2Result.success : false),
            googlePlaces: googleResult,
            r2Storage: r2Result
        };
    }
}

// Run the test
if (require.main === module) {
    const test = new RobustPlacesToR2Test();
    test.runCompleteTest()
        .then(result => {
            console.log('\n📋 FINAL TEST RESULT:');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}

module.exports = { RobustPlacesToR2Test };
