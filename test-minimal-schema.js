// Minimal test to reproduce the schema issue

const toolSchemas = {
	test_tool: {
		type: 'object',
		properties: {
			param1: {
				type: 'string',
				description: 'Test parameter'
			}
		},
		required: ['param1']
	}
};

console.log('Direct access to toolSchemas.test_tool:');
console.log(JSON.stringify(toolSchemas.test_tool, null, 2));

console.log('\nObject.keys(toolSchemas):');
console.log(Object.keys(toolSchemas));

console.log('\nAccessing via variable reference:');
const schemaRef = toolSchemas.test_tool;
console.log(JSON.stringify(schemaRef, null, 2));

// Test if the issue is with how we're accessing it in the array context
const toolsArray = [
	{
		name: 'test_tool',
		description: 'Test tool',
		inputSchema: toolSchemas.test_tool
	}
];

console.log('\nIn array context:');
console.log(JSON.stringify(toolsArray[0].inputSchema, null, 2));