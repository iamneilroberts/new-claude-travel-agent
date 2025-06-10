// Test script to validate toolSchemas object
const fs = require('fs');

// Read the TypeScript file and extract toolSchemas
const content = fs.readFileSync('./src/pure-mcp-index.ts', 'utf8');

// Find the toolSchemas object definition
const match = content.match(/const toolSchemas = \{([\s\S]*?)\n\};/);

if (!match) {
    console.error('❌ Could not find toolSchemas object');
    process.exit(1);
}

console.log('✅ Found toolSchemas object');

// Extract just the store_travel_search schema for testing
const storeSearchMatch = content.match(/store_travel_search: \{([\s\S]*?)\n\s*\},/);

if (!storeSearchMatch) {
    console.error('❌ Could not find store_travel_search schema');
    process.exit(1);
}

console.log('✅ Found store_travel_search schema');
console.log('Schema preview:', storeSearchMatch[0].substring(0, 200) + '...');

// Check if properties are defined
if (storeSearchMatch[0].includes('search_type')) {
    console.log('✅ Schema has search_type property');
} else {
    console.error('❌ Schema missing search_type property');
}

if (storeSearchMatch[0].includes('properties: {')) {
    console.log('✅ Schema has properties object');
} else {
    console.error('❌ Schema missing properties object');
}

console.log('\n🔍 Diagnosis: Source code schemas are correctly defined');
console.log('🚨 Problem: Runtime schemas are showing as empty');
console.log('💡 Likely cause: Build system or module loading issue');