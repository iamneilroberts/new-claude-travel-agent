/**
 * Template Engine Validation Test Suite
 * S03 Phase 3: Comprehensive testing of template functionality
 */

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log('🧪 Starting Template Engine Test Suite\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✅ ${name}`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
        if (this.failed === 0) {
            console.log('🎉 All template engine tests passed!');
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
}

// Import the template engine
const { TemplateEngine } = require('./dist/template-engine.js');

const runner = new TestRunner();
const engine = new TemplateEngine();

// Test 1: Basic Variable Substitution
runner.test('Basic variable substitution', () => {
    const template = 'Hello {name}, welcome to {destination}!';
    const variables = { name: 'John', destination: 'Paris' };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content === 'Hello John, welcome to Paris!', 'Content should match expected');
    runner.assert(result.variablesUsed.includes('name'), 'Should track name variable');
    runner.assert(result.variablesUsed.includes('destination'), 'Should track destination variable');
});

// Test 2: Nested Object Variables
runner.test('Nested object variable resolution', () => {
    const template = 'Contact {client.name} at {client.contact.email}';
    const variables = { 
        client: { 
            name: 'Sarah Johnson', 
            contact: { email: 'sarah@example.com' } 
        } 
    };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content === 'Contact Sarah Johnson at sarah@example.com', 'Nested variables should resolve');
});

// Test 3: Variable Formatters
runner.test('Variable formatters functionality', () => {
    const template = 'Price: {price|currency}, Name: {name|uppercase}, Date: {date|date}';
    const variables = { 
        price: 1234.56, 
        name: 'john doe',
        date: '2025-01-15'
    };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content.includes('$1,234.56'), 'Currency formatter should work');
    runner.assert(result.content.includes('JOHN DOE'), 'Uppercase formatter should work');
});

// Test 4: Conditional Blocks
runner.test('Conditional blocks processing', () => {
    const template = '{{#if has_upgrade}}Upgrade available for {client_name}{{else}}Standard package for {client_name}{{/if}}';
    
    // Test with condition true
    let variables = { has_upgrade: true, client_name: 'Alice' };
    let result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content === 'Upgrade available for Alice', 'True condition should show if block');
    
    // Test with condition false
    variables = { has_upgrade: false, client_name: 'Bob' };
    result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content === 'Standard package for Bob', 'False condition should show else block');
});

// Test 5: Loop Blocks
runner.test('Loop blocks processing', () => {
    const template = 'Destinations: {{#each cities as city}}{city.name} ({city.country}) {{/each}}';
    const variables = { 
        cities: [
            { name: 'Paris', country: 'France' },
            { name: 'Tokyo', country: 'Japan' },
            { name: 'New York', country: 'USA' }
        ]
    };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(result.content.includes('Paris (France)'), 'Should process first city');
    runner.assert(result.content.includes('Tokyo (Japan)'), 'Should process second city');
    runner.assert(result.content.includes('New York (USA)'), 'Should process third city');
});

// Test 6: Security Validation
runner.test('Security sanitization', () => {
    const template = 'Message: {user_input}';
    const variables = { user_input: '<script>alert("xss")</script>' };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(!result.content.includes('<script>'), 'Script tags should be sanitized');
    runner.assert(result.content.includes('&lt;script&gt;'), 'Content should be HTML escaped');
});

// Test 7: Template Compilation and Caching
runner.test('Template compilation and caching', () => {
    const template = 'Hello {name}!';
    
    // First compilation
    const compiled1 = engine.compile(template);
    runner.assert(compiled1.id, 'Should have template ID');
    runner.assert(compiled1.variables.length === 1, 'Should extract one variable');
    runner.assert(compiled1.variables[0].name === 'name', 'Should extract name variable');
    
    // Second compilation should use cache
    const compiled2 = engine.compile(template);
    runner.assert(compiled1.id === compiled2.id, 'Should return cached version');
});

// Test 8: Variable Extraction
runner.test('Variable extraction functionality', () => {
    const template = 'Client: {client_name}, Budget: {budget|currency}, Special: {special_requests|"None provided"}';
    
    const variables = engine.extractVariables(template);
    
    runner.assert(variables.length === 3, 'Should extract three variables');
    runner.assert(variables.some(v => v.name === 'client_name'), 'Should extract client_name');
    runner.assert(variables.some(v => v.name === 'budget'), 'Should extract budget');
    runner.assert(variables.some(v => v.name === 'special_requests'), 'Should extract special_requests');
    
    const specialVar = variables.find(v => v.name === 'special_requests');
    runner.assert(specialVar.defaultValue === 'None provided', 'Should extract default value');
});

// Test 9: Template Syntax Validation
runner.test('Template syntax validation', () => {
    // Valid template
    const validTemplate = 'Hello {name}! {{#if premium}}Premium{{/if}}';
    const validResult = engine.validateSyntax(validTemplate);
    
    runner.assert(validResult.valid, 'Valid template should pass validation');
    runner.assert(validResult.errors.length === 0, 'Valid template should have no errors');
    
    // Invalid template
    const invalidTemplate = 'Hello {name! {{#if premium}}Premium{{/else}}';
    const invalidResult = engine.validateSyntax(invalidTemplate);
    
    runner.assert(!invalidResult.valid, 'Invalid template should fail validation');
    runner.assert(invalidResult.errors.length > 0, 'Invalid template should have errors');
});

// Test 10: Complex Template Integration
runner.test('Complex template with all features', () => {
    const template = `# Travel Proposal for {client.name}

**Destination:** {destination}
**Budget:** {budget|currency}

{{#if client.vip}}
🌟 VIP Client - Special Perks Included!
{{/if}}

**Activities:**
{{#each activities as activity}}
- {activity.name} ({activity.price|currency})
{{/each}}

**Total:** {total|currency}
**Contact:** {agent.email|lowercase}`;
    
    const variables = {
        client: { name: 'Jennifer Smith', vip: true },
        destination: 'Santorini, Greece',
        budget: 8500,
        activities: [
            { name: 'Wine Tasting Tour', price: 125 },
            { name: 'Sunset Sailing', price: 85 }
        ],
        total: 8710,
        agent: { email: 'SARAH@SOMOTRAVEL.COM' }
    };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Complex template should render successfully');
    runner.assert(result.content.includes('Jennifer Smith'), 'Should include client name');
    runner.assert(result.content.includes('VIP Client'), 'Should show VIP section');
    runner.assert(result.content.includes('Wine Tasting Tour'), 'Should include activities');
    runner.assert(result.content.includes('sarah@somotravel.com'), 'Should lowercase email');
    runner.assert(result.conditionalsProcessed === 1, 'Should process one conditional');
    runner.assert(result.loopsProcessed === 1, 'Should process one loop');
});

// Test 11: Performance Metrics
runner.test('Performance tracking', () => {
    const template = 'Simple template with {variable}';
    const variables = { variable: 'test value' };
    
    const result = engine.render(template, variables);
    
    runner.assert(result.success, 'Render should succeed');
    runner.assert(typeof result.processingTimeMs === 'number', 'Should track processing time');
    runner.assert(result.processingTimeMs >= 0, 'Processing time should be positive');
});

// Test 12: Error Handling
runner.test('Error handling for invalid data', () => {
    const template = 'Hello {name}!';
    
    // Test with null variables
    let result = engine.render(template, null);
    runner.assert(!result.success, 'Should fail with null variables');
    
    // Test with missing required variables
    result = engine.render(template, {});
    runner.assert(result.variablesMissing.includes('name'), 'Should track missing variables');
});

// Run all tests
runner.run().catch(console.error);