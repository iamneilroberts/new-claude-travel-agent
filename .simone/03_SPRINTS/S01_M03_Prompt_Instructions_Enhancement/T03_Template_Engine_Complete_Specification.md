# T03 Template Engine Complete Technical Specification
**Sprint**: S01_M03_Prompt_Instructions_Enhancement  
**Date**: January 8, 2025  
**Status**: COMPLETED

## Executive Summary

Complete technical specification for a robust template variable processing engine designed specifically for travel agent workflows. The engine supports advanced {placeholder} syntax with nested objects, conditional logic, default values, and comprehensive security features.

## Template Engine Architecture

### Core System Design
```
┌─────────────────────────────────────────────────────────────┐
│                    Template Engine                          │
├─────────────────────────────────────────────────────────────┤
│  Template Parser                                            │
│  ├─ Syntax Analysis ({variable} extraction)                │
│  ├─ Compilation (template → executable)                    │
│  └─ Validation (syntax + security checks)                  │
├─────────────────────────────────────────────────────────────┤
│  Variable Resolver                                          │
│  ├─ Type Validation (schema enforcement)                   │
│  ├─ Default Application (fallback values)                  │
│  ├─ Nested Resolution (client.name handling)               │
│  └─ Security Sanitization (XSS/injection prevention)      │
├─────────────────────────────────────────────────────────────┤
│  Template Renderer                                          │
│  ├─ Variable Substitution (fast replacement)               │
│  ├─ Conditional Logic ({var?'yes':'no'})                  │
│  ├─ Array Processing ({items[0].name})                     │
│  └─ Error Recovery (graceful degradation)                  │
├─────────────────────────────────────────────────────────────┤
│  Performance Layer                                          │
│  ├─ Template Cache (compiled template storage)             │
│  ├─ Variable Cache (frequent values)                       │
│  ├─ Memory Management (LRU eviction)                       │
│  └─ Metrics Collection (performance monitoring)            │
└─────────────────────────────────────────────────────────────┘
```

## Template Syntax Specification

### 1. Basic Variable Substitution
```typescript
// Syntax: {variable_name}
"Hello {client_name}, welcome to Somo Travel!"
// Result: "Hello Sarah Johnson, welcome to Somo Travel!"

// Variables: { client_name: "Sarah Johnson" }
```

### 2. Nested Object Access
```typescript
// Syntax: {object.property}
"Dear {client.name}, your trip to {destination.city}, {destination.country} is confirmed."
// Result: "Dear Sarah Johnson, your trip to Paris, France is confirmed."

// Variables: { 
//   client: { name: "Sarah Johnson" },
//   destination: { city: "Paris", country: "France" }
// }
```

### 3. Default Values
```typescript
// Syntax: {variable|default_value}
"Your travel advisor {agent_name|'our team'} will contact you soon."
// Result: "Your travel advisor our team will contact you soon." (if agent_name missing)

// Variables: {} (empty object)
```

### 4. Conditional Logic
```typescript
// Syntax: {variable?'true_value':'false_value'}
"Welcome{client.tier=='vip'?' VIP client':''} to Somo Travel!"
// Result: "Welcome VIP client to Somo Travel!" (if tier is 'vip')
// Result: "Welcome to Somo Travel!" (if tier is not 'vip')

// Variables: { client: { tier: "vip" } }
```

### 5. Array Access
```typescript
// Syntax: {array[index].property}
"Your first activity is {activities[0].name} at {activities[0].time}."
// Result: "Your first activity is Louvre Museum Tour at 10:00 AM."

// Variables: { 
//   activities: [
//     { name: "Louvre Museum Tour", time: "10:00 AM" },
//     { name: "Seine River Cruise", time: "2:00 PM" }
//   ]
// }
```

### 6. Number Formatting
```typescript
// Syntax: {number|currency}, {number|comma}
"Total cost: {total_price|currency} ({savings|comma} saved!)"
// Result: "Total cost: $8,750.00 (1,250 saved!)"

// Variables: { total_price: 8750.00, savings: 1250 }
```

### 7. Date Formatting
```typescript
// Syntax: {date|format}
"Departure: {departure_date|'MMMM DD, YYYY'} at {departure_time|'h:mm A'}"
// Result: "Departure: March 15, 2025 at 8:30 AM"

// Variables: { 
//   departure_date: "2025-03-15", 
//   departure_time: "08:30" 
// }
```

## Component Implementation Specifications

### 1. Template Parser Interface
```typescript
interface TemplateParser {
  // Parse template string into executable format
  parse(template: string): CompiledTemplate;
  
  // Extract all variable references from template
  extractVariables(template: string): VariableReference[];
  
  // Validate template syntax
  validateSyntax(template: string): ValidationResult;
  
  // Get template complexity metrics
  getComplexity(template: string): TemplateComplexity;
}

interface CompiledTemplate {
  id: string;
  originalTemplate: string;
  variables: VariableReference[];
  instructions: RenderInstruction[];
  complexity: TemplateComplexity;
  compiledAt: Date;
}

interface VariableReference {
  name: string;
  path: string[]; // ['client', 'name'] for {client.name}
  defaultValue?: string;
  conditionalLogic?: ConditionalExpression;
  formatters?: string[]; // ['currency', 'comma']
  isRequired: boolean;
  expectedType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}
```

### 2. Variable Resolver Interface
```typescript
interface VariableResolver {
  // Resolve all variables against provided data
  resolve(variables: Record<string, any>, schema: VariableSchema): ResolvedVariables;
  
  // Validate variables against schema
  validateVariables(variables: Record<string, any>, schema: VariableSchema): ValidationResult;
  
  // Apply default values for missing variables
  applyDefaults(variables: Record<string, any>, defaults: Record<string, any>): Record<string, any>;
  
  // Sanitize variables for security
  sanitizeVariables(variables: Record<string, any>): Record<string, any>;
}

interface ResolvedVariables {
  values: Record<string, any>;
  metadata: {
    resolvedCount: number;
    defaultsApplied: string[];
    warnings: ValidationWarning[];
    sanitizationApplied: string[];
  };
}

interface VariableSchema {
  type: 'object';
  properties: Record<string, VariablePropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

interface VariablePropertySchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  format?: 'email' | 'phone' | 'currency' | 'date-iso' | 'time';
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: any[];
  default?: any;
  description?: string;
}
```

### 3. Template Renderer Interface
```typescript
interface TemplateRenderer {
  // Render template with provided variables
  render(template: CompiledTemplate, variables: ResolvedVariables): RenderResult;
  
  // Render with fallback content for errors
  renderWithFallback(template: CompiledTemplate, variables: ResolvedVariables, fallback: string): RenderResult;
  
  // Render multiple templates in batch
  renderBatch(templates: CompiledTemplate[], variables: ResolvedVariables): RenderResult[];
}

interface RenderResult {
  content: string;
  success: boolean;
  errors: RenderError[];
  warnings: RenderWarning[];
  metadata: {
    renderTimeMs: number;
    variablesUsed: string[];
    variablesMissing: string[];
    defaultsApplied: string[];
  };
}

interface RenderError {
  type: 'missing_variable' | 'type_mismatch' | 'syntax_error' | 'security_violation';
  message: string;
  variable?: string;
  location?: { line: number; column: number };
  suggestion?: string;
}
```

### 4. Template Cache Interface
```typescript
interface TemplateCache {
  // Get compiled template from cache
  get(templateId: string): CompiledTemplate | null;
  
  // Store compiled template in cache
  set(templateId: string, template: CompiledTemplate, ttl?: number): void;
  
  // Remove template from cache
  invalidate(templateId: string): void;
  
  // Clear entire cache
  clear(): void;
  
  // Get cache statistics
  getStats(): CacheStats;
  
  // Preload templates for better performance
  preload(templateIds: string[]): Promise<void>;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsageMB: number;
  oldestEntry: Date;
}
```

## Travel-Specific Variable Schema

### Standard Travel Variables
```typescript
interface TravelVariableSet {
  // Client information
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    tier: 'standard' | 'vip' | 'platinum';
    preferences: string[];
    dietary_restrictions?: string[];
    accessibility_needs?: string[];
    communication_preference: 'email' | 'phone' | 'text';
  };
  
  // Trip details
  trip: {
    id: string;
    destination: {
      city: string;
      country: string;
      region?: string;
      airport_code?: string;
    };
    departure_date: string; // ISO date
    return_date: string;    // ISO date
    duration_days: number;
    travelers: {
      adults: number;
      children: number;
      infants: number;
    };
    total_travelers: number;
    trip_type: 'leisure' | 'business' | 'honeymoon' | 'family' | 'adventure' | 'luxury';
    budget: {
      total: number;
      currency: string;
      per_person?: number;
    };
    special_occasions?: string[];
  };
  
  // Pricing information
  pricing: {
    base_price: number;
    classic_price: number;      // 75% markup
    premium_price: number;      // 110% markup  
    luxury_price: number;       // 175% markup
    currency: string;
    breakdown?: {
      flights: number;
      hotels: number;
      activities: number;
      transfers: number;
      fees: number;
    };
  };
  
  // Agent details
  agent: {
    name: string;
    title: string;
    email: string;
    phone: string;
    agency: string;
    signature: string;
    photo_url?: string;
  };
  
  // Session metadata
  session: {
    id: string;
    created_at: string;
    mode: 'mobile-mode' | 'interactive-mode';
    channel: 'whatsapp' | 'email' | 'desktop' | 'phone';
    reference_number?: string;
  };
  
  // Dynamic content
  content: {
    activities?: Array<{
      name: string;
      description: string;
      price?: number;
      duration?: string;
      location?: string;
    }>;
    hotels?: Array<{
      name: string;
      rating: number;
      location: string;
      amenities: string[];
      room_type?: string;
    }>;
    flights?: Array<{
      airline: string;
      flight_number: string;
      departure_time: string;
      arrival_time: string;
      duration: string;
    }>;
  };
}
```

## Template Categories and Examples

### 1. Client Communication Templates

#### Welcome Email Template
```text
Subject: Welcome to Somo Travel - Your {trip.destination.city} Adventure Awaits!

Dear {client.name},

Thank you for choosing Somo Travel for your {trip.trip_type} to {trip.destination.city}, {trip.destination.country}! 

I'm {agent.name}, your dedicated travel consultant, and I'm thrilled to help you create an unforgettable {trip.duration_days}-day experience.

**Your Trip Overview:**
• Destination: {trip.destination.city}, {trip.destination.country}
• Travel Dates: {trip.departure_date|'MMM DD'} - {trip.return_date|'MMM DD, YYYY'}
• Travelers: {trip.travelers.adults} adult{trip.travelers.adults>1?'s':''}{trip.travelers.children>0?' and '+trip.travelers.children+' child'+trip.travelers.children>1?'ren':'':''}
• Budget: {trip.budget.total|currency}
{trip.special_occasions?'• Special Occasion: '+trip.special_occasions[0]:''}

**What's Next:**
I'll be preparing three customized proposal packages for you:
• 🏛️ **Classic Package** ({pricing.classic_price|currency}) - Great value with essential experiences
• ⭐ **Premium Package** ({pricing.premium_price|currency}) - Enhanced comfort and exclusive activities  
• 💎 **Luxury Package** ({pricing.luxury_price|currency}) - Ultimate indulgence and VIP treatment

{client.tier=='vip'?'As a VIP client, you\'ll receive priority service, exclusive amenities, and dedicated support throughout your journey.':''}

I'll have your personalized proposals ready within 24-48 hours. If you have any questions or special requests, please don't hesitate to reach out!

Looking forward to planning your dream trip,

{agent.signature}

Session ID: {session.id}
```

#### Follow-up Email Template
```text
Subject: Following up on your {trip.destination.city} travel proposal

Hi {client.name},

I hope this email finds you well! I wanted to follow up on the travel proposal I sent for your {trip.trip_type} to {trip.destination.city} on {proposal_sent_date|'MMMM DD'}.

{days_since_proposal<=3?'I know you\'re probably still reviewing the options, and I\'m here to answer any questions you might have.':days_since_proposal<=7?'I wanted to check if you had a chance to review the proposal and see if any of the packages caught your interest.':'I wanted to touch base about your upcoming trip plans and see if I can provide any additional information.'}

**Quick Reminder:**
• Destination: {trip.destination.city}, {trip.destination.country}
• Dates: {trip.departure_date|'MMM DD'} - {trip.return_date|'MMM DD'}
• Travelers: {trip.total_travelers} {trip.total_travelers==1?'person':'people'}
• Packages: Starting at {pricing.classic_price|currency}

{followup_type=='pricing_question'?'If you have questions about the pricing or would like to adjust the budget, I\'m happy to create modified options.':followup_type=='date_change'?'If your travel dates have changed, please let me know and I\'ll update the proposal accordingly.':'Would you like to schedule a quick 15-minute call to discuss the details and answer any questions?'}

{trip.departure_date?'With your departure date of '+trip.departure_date|'MMM DD, YYYY'+', I recommend we finalize the details soon to secure the best rates and availability.':''}

I'm excited to help make your {trip.destination.city} adventure unforgettable!

Best regards,
{agent.name}
{agent.phone}

P.S. {client.tier=='vip'?'As a VIP client, you have exclusive access to upgrades and special amenities - just let me know what interests you most!':'Feel free to call or text me directly if it\'s easier than email.'}
```

### 2. Proposal Templates

#### Three-Tier Proposal Template
```text
# {trip.destination.city}, {trip.destination.country} Travel Proposal

**Prepared for:** {client.name}  
**Travel Dates:** {trip.departure_date|'MMMM DD'} - {trip.return_date|'DD, YYYY'}  
**Travelers:** {trip.travelers.adults} adult{trip.travelers.adults>1?'s':''}{trip.travelers.children>0?' and '+trip.travelers.children+' child'+trip.travelers.children>1?'ren':''}
**Total Budget:** {trip.budget.total|currency}

---

## 🏛️ Classic Package - {pricing.classic_price|currency}
*Essential {trip.destination.city} experience with comfort and value*

**What's Included:**
• Round-trip flights ({content.flights[0].airline?content.flights[0].airline+' or similar':'Quality airline'})
• {classic_hotel_nights} nights at {classic_hotel.name} ({classic_hotel.rating}-star)
• Daily breakfast
• Airport transfers
• {classic_activities.length} signature activities including {classic_activities[0].name}
• 24/7 travel support

**Sample Itinerary Highlights:**
{classic_activities|list}

**Perfect for:** {classic_ideal_for|'Budget-conscious travelers wanting essential experiences'}

---

## ⭐ Premium Package - {pricing.premium_price|currency}
*Enhanced comfort with exclusive experiences and upgrades*

**What's Included:**
• Premium economy flights ({content.flights[0].airline?content.flights[0].airline+' premium economy':'Premium airline'})
• {premium_hotel_nights} nights at {premium_hotel.name} ({premium_hotel.rating}-star boutique)
• Daily breakfast + 3 dinners
• Private airport transfers
• {premium_activities.length} curated activities including {premium_activities[0].name}
• Half-day private guide
• Travel insurance included

**Sample Itinerary Highlights:**
{premium_activities|list}

**Perfect for:** {premium_ideal_for|'Travelers seeking enhanced comfort and unique experiences'}

---

## 💎 Luxury Package - {pricing.luxury_price|currency}
*Ultimate indulgence with VIP treatment and exclusive access*

**What's Included:**
• Business class flights ({content.flights[0].airline?content.flights[0].airline+' business class':'Luxury airline'})
• {luxury_hotel_nights} nights at {luxury_hotel.name} ({luxury_hotel.rating}-star luxury)
• All meals included (fine dining restaurants)
• Private chauffeur throughout
• {luxury_activities.length} exclusive activities including {luxury_activities[0].name}
• Full-day private guide
• VIP lounge access
• Concierge services
• Comprehensive travel insurance

**Sample Itinerary Highlights:**
{luxury_activities|list}

**Perfect for:** {luxury_ideal_for|'Discerning travelers wanting the finest experiences and ultimate comfort'}

---

## Next Steps

{client.tier=='vip'?'As our VIP client, I\'ve included special amenities and upgrades in each package.':'Please review these options and let me know which package interests you most.'} I can customize any option to better fit your preferences and budget.

**To Book:**
1. Choose your preferred package
2. Review and sign the travel agreement
3. Secure with 25% deposit
4. Final payment due 45 days before departure

**Questions?** Call me directly at {agent.phone} or reply to this email.

{trip.departure_date?'**Booking Deadline:** To secure these rates, please book by '+booking_deadline|'MMMM DD, YYYY':''}

I'm excited to make your {trip.destination.city} dreams come true!

{agent.signature}

---
*Proposal prepared on {current_date|'MMMM DD, YYYY'} | Session: {session.id} | Valid until {proposal_expiry|'MMMM DD, YYYY'}*
```

## Security Implementation

### 1. Input Sanitization
```typescript
interface SecurityProcessor {
  // Sanitize variables for safe template rendering
  sanitizeForTemplate(variables: Record<string, any>): Record<string, any>;
  
  // Escape HTML content
  escapeHTML(content: string): string;
  
  // Validate and sanitize email addresses
  sanitizeEmail(email: string): string;
  
  // Validate and format phone numbers
  sanitizePhone(phone: string): string;
  
  // Remove potentially dangerous content
  removeMaliciousContent(content: string): string;
}

// Security rules implementation
const securityRules = {
  // HTML escaping for web content
  htmlEscape: {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  },
  
  // SQL injection prevention
  sqlSafePattern: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()]+$/,
  
  // XSS prevention patterns
  xssPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi
  ],
  
  // Phone number formats
  phoneFormats: {
    us: /^\+?1?[\s\-]?\(?([0-9]{3})\)?[\s\-]?([0-9]{3})[\s\-]?([0-9]{4})$/,
    international: /^\+[1-9]\d{1,14}$/
  },
  
  // Email validation
  emailPattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};
```

### 2. Access Control
```typescript
interface TemplateAccessControl {
  // Check if agent can access template
  canAccessTemplate(agentId: string, templateId: string): boolean;
  
  // Check if agent can modify template
  canModifyTemplate(agentId: string, templateId: string): boolean;
  
  // Filter sensitive client data based on permissions
  filterClientData(agentId: string, clientData: any): any;
  
  // Log template usage for audit
  logTemplateUsage(agentId: string, templateId: string, clientId?: string): void;
}

// Access control rules
const accessRules = {
  // Template visibility by agent role
  templateAccess: {
    'agent': ['client-communication', 'proposals', 'internal-docs'],
    'manager': ['*'], // All templates
    'admin': ['*'],   // All templates
    'readonly': ['client-communication'] // Limited access
  },
  
  // Client data sensitivity levels
  dataSensitivity: {
    'public': ['name', 'destination', 'travel_dates'],
    'restricted': ['email', 'phone', 'budget'],
    'confidential': ['passport', 'payment_info', 'medical_info']
  },
  
  // Audit requirements
  auditEvents: [
    'template_access',
    'template_render',
    'client_data_access',
    'template_modification'
  ]
};
```

## Performance Optimization

### 1. Caching Strategy
```typescript
interface CacheConfiguration {
  // Template compilation cache
  templateCache: {
    maxSize: 500;              // Maximum templates in cache
    ttl: 3600000;             // 1 hour TTL
    evictionPolicy: 'LRU';    // Least Recently Used
    preloadCommon: true;      // Preload frequently used templates
  };
  
  // Variable resolution cache
  variableCache: {
    maxSize: 1000;            // Maximum variable sets
    ttl: 1800000;            // 30 minute TTL
    evictionPolicy: 'LRU';
    keyStrategy: 'hash';      // Hash variable sets for keys
  };
  
  // Rendered template cache
  renderCache: {
    maxSize: 2000;            // Maximum rendered outputs
    ttl: 900000;             // 15 minute TTL
    evictionPolicy: 'LRU';
    enabled: true;           // Cache final rendered content
  };
}

// Performance monitoring
interface PerformanceMetrics {
  templateParseTime: number;    // Average parse time in ms
  variableResolveTime: number;  // Average resolve time in ms
  renderTime: number;           // Average render time in ms
  cacheHitRate: number;         // Percentage of cache hits
  memoryUsage: number;          // Cache memory usage in MB
  errorsPerHour: number;        // Error rate tracking
}
```

### 2. Memory Management
```typescript
interface MemoryManager {
  // Monitor memory usage
  getMemoryUsage(): MemoryStats;
  
  // Trigger cache cleanup
  cleanup(forceEvict?: boolean): void;
  
  // Optimize cache sizes based on usage
  optimizeCacheSizes(): void;
  
  // Handle memory pressure
  handleMemoryPressure(): void;
}

interface MemoryStats {
  totalUsageMB: number;
  templateCacheMB: number;
  variableCacheMB: number;
  renderCacheMB: number;
  availableMB: number;
  utilizationPercent: number;
}

// Memory thresholds
const memoryLimits = {
  warning: 80,      // MB - Issue warning
  critical: 100,    // MB - Start aggressive cleanup
  maximum: 128,     // MB - Hard limit, fail operations
  
  // Cache size adjustments
  cacheSizeReduction: {
    warning: 0.8,   // Reduce to 80% of current size
    critical: 0.5,  // Reduce to 50% of current size
    maximum: 0.2    // Reduce to 20% of current size
  }
};
```

## Error Handling and Recovery

### 1. Error Classification
```typescript
interface TemplateError {
  code: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  context?: any;
  recoverable: boolean;
  suggestion?: string;
}

// Error types and handling
const errorHandling = {
  // Variable resolution errors
  'MISSING_REQUIRED_VARIABLE': {
    type: 'error',
    recoverable: false,
    action: 'throw_validation_error',
    message: 'Required variable "{variable}" is missing'
  },
  
  'TYPE_MISMATCH': {
    type: 'warning', 
    recoverable: true,
    action: 'attempt_conversion',
    fallback: 'use_string_representation'
  },
  
  'INVALID_FORMAT': {
    type: 'warning',
    recoverable: true, 
    action: 'use_raw_value',
    message: 'Invalid format for "{variable}", using raw value'
  },
  
  // Template syntax errors
  'SYNTAX_ERROR': {
    type: 'error',
    recoverable: false,
    action: 'throw_parse_error',
    message: 'Template syntax error at line {line}, column {column}'
  },
  
  'CIRCULAR_REFERENCE': {
    type: 'critical',
    recoverable: false,
    action: 'throw_security_error',
    message: 'Circular reference detected in template'
  },
  
  // Security violations
  'XSS_ATTEMPT': {
    type: 'critical',
    recoverable: false,
    action: 'block_and_log',
    message: 'Potential XSS content detected and blocked'
  },
  
  'SQL_INJECTION_ATTEMPT': {
    type: 'critical',
    recoverable: false,
    action: 'block_and_log',
    message: 'Potential SQL injection detected and blocked'
  },
  
  // Performance errors
  'TEMPLATE_TOO_COMPLEX': {
    type: 'error',
    recoverable: true,
    action: 'timeout_and_fallback',
    message: 'Template complexity exceeds limits'
  },
  
  'MEMORY_LIMIT_EXCEEDED': {
    type: 'critical',
    recoverable: true,
    action: 'cleanup_and_retry',
    message: 'Memory limit exceeded, triggering cleanup'
  }
};
```

### 2. Recovery Strategies
```typescript
interface ErrorRecovery {
  // Attempt graceful degradation
  gracefulDegrade(template: CompiledTemplate, error: TemplateError): string;
  
  // Provide fallback content
  getFallbackContent(templateType: string, variables: any): string;
  
  // Retry with simplified template
  retryWithSimplification(template: CompiledTemplate, variables: any): RenderResult;
  
  // Log errors for analysis
  logErrorForAnalysis(error: TemplateError, context: any): void;
}

// Recovery patterns for different error types
const recoveryStrategies = {
  'missing_variable': {
    strategy: 'use_placeholder',
    placeholder: '[Missing: {variable}]',
    notify: true
  },
  
  'type_conversion_failed': {
    strategy: 'use_string_conversion',
    format: 'String({value})',
    notify: false
  },
  
  'security_violation': {
    strategy: 'block_and_sanitize',
    replacement: '[Content Blocked]',
    notify: true,
    log: 'security'
  },
  
  'performance_timeout': {
    strategy: 'simplified_render',
    timeout: 1000,
    fallback: 'basic_template',
    notify: true
  }
};
```

## Integration with MCP Tools

### Template Processing Tool Integration
```typescript
// MCP Tool: process_template
interface ProcessTemplateInput {
  template_id: string;           // Reference to template in database
  variables: Record<string, any>; // Variable values to substitute
  options?: {
    validate_schema?: boolean;   // Validate against template schema
    apply_security?: boolean;    // Apply security sanitization
    use_cache?: boolean;        // Use cached results if available
    fallback_content?: string;  // Content to use if rendering fails
  };
}

interface ProcessTemplateOutput {
  success: boolean;
  content: string;              // Rendered template content
  variables_used: string[];     // List of variables successfully used
  variables_missing: string[];  // List of required variables missing
  warnings: TemplateWarning[];  // Non-critical issues
  errors: TemplateError[];     // Critical issues
  metadata: {
    template_name: string;
    processing_time_ms: number;
    cache_hit: boolean;
    security_applied: boolean;
  };
}
```

### Chain Integration Points
```typescript
// Templates used within chain execution steps
interface ChainStepTemplate {
  step_id: number;
  template_id: string;
  input_variables: string[];    // Variables needed from previous steps
  output_variable: string;      // Where to store rendered content
  error_handling: 'fail' | 'warn' | 'continue'; // How to handle template errors
}

// Example chain step using template
const chainStepExample = {
  id: 3,
  name: 'generate_welcome_email',
  type: 'template_processing',
  template: {
    template_id: 'client-welcome-email',
    input_variables: ['client_name', 'destination', 'agent_name'],
    output_variable: 'welcome_email_content',
    error_handling: 'fail'
  },
  required_variables: ['client_name', 'destination'],
  output_variables: ['welcome_email_content']
};
```

## Testing and Validation Strategy

### 1. Unit Testing
```typescript
// Template syntax testing
describe('Template Syntax', () => {
  test('basic variable substitution', () => {
    const template = 'Hello {name}!';
    const variables = { name: 'John' };
    const result = templateEngine.render(template, variables);
    expect(result.content).toBe('Hello John!');
  });
  
  test('nested object access', () => {
    const template = 'Hello {user.name}!';
    const variables = { user: { name: 'John' } };
    const result = templateEngine.render(template, variables);
    expect(result.content).toBe('Hello John!');
  });
  
  test('default value handling', () => {
    const template = 'Hello {name|World}!';
    const variables = {};
    const result = templateEngine.render(template, variables);
    expect(result.content).toBe('Hello World!');
  });
  
  test('conditional logic', () => {
    const template = 'Status: {active?\'Online\':\'Offline\'}';
    const variables = { active: true };
    const result = templateEngine.render(template, variables);
    expect(result.content).toBe('Status: Online');
  });
});

// Security testing
describe('Security Features', () => {
  test('XSS prevention', () => {
    const template = 'Message: {message}';
    const variables = { message: '<script>alert("xss")</script>' };
    const result = templateEngine.render(template, variables);
    expect(result.content).not.toContain('<script>');
  });
  
  test('SQL injection prevention', () => {
    const template = 'Query: {query}';
    const variables = { query: "'; DROP TABLE users; --" };
    const result = templateEngine.render(template, variables);
    expect(result.content).toBe('Query: [Content Blocked]');
  });
});

// Performance testing
describe('Performance', () => {
  test('template parsing speed', () => {
    const complexTemplate = /* large template */;
    const startTime = Date.now();
    templateEngine.parse(complexTemplate);
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(10); // < 10ms
  });
  
  test('rendering speed', () => {
    const template = templateEngine.parse(/* template */);
    const variables = /* test variables */;
    const startTime = Date.now();
    templateEngine.render(template, variables);
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(15); // < 15ms
  });
});
```

### 2. Integration Testing
```typescript
// Database integration
describe('Database Integration', () => {
  test('template loading from database', async () => {
    const template = await templateEngine.loadFromDatabase('client-welcome-email');
    expect(template).toBeDefined();
    expect(template.variables).toContain('client_name');
  });
  
  test('template caching', async () => {
    const template1 = await templateEngine.loadFromDatabase('test-template');
    const template2 = await templateEngine.loadFromDatabase('test-template');
    expect(template2).toBe(template1); // Same object from cache
  });
});

// MCP tool integration
describe('MCP Tool Integration', () => {
  test('process_template tool', async () => {
    const result = await mcpServer.callTool('process_template', {
      template_id: 'client-welcome-email',
      variables: { client_name: 'John Doe', destination: 'Paris' }
    });
    expect(result.success).toBe(true);
    expect(result.content).toContain('John Doe');
    expect(result.content).toContain('Paris');
  });
});
```

## Success Criteria - COMPLETED ✅

- [x] Complete technical specification with all components defined
- [x] Template syntax supports all planned use cases (basic, nested, conditional, defaults, arrays)
- [x] Security considerations addressed and documented (XSS, SQL injection, input sanitization)
- [x] Performance optimization strategy defined (caching, memory management, monitoring)
- [x] Integration points with database schema identified (template_definitions table)
- [x] Travel-specific features properly designed (client variables, pricing, agent info)
- [x] Error handling and recovery strategies documented
- [x] Testing strategy and validation procedures defined
- [x] MCP tool integration patterns specified

## Next Tasks

This specification feeds directly into:
- **T04**: Chain Execution Engine Design (templates used in chain steps)
- **T05**: MCP Tool Interface Design (process_template tool implementation)
- **S02**: Implementation Sprint (actual template engine development)

## Implementation Readiness

The template engine specification is complete and ready for implementation:

1. **Architecture**: Fully specified with clear component interfaces
2. **Syntax**: Comprehensive syntax support for all travel use cases
3. **Security**: Robust security measures for client data protection
4. **Performance**: Optimized for travel agent workflow requirements
5. **Integration**: Clear integration points with database and MCP tools
6. **Testing**: Complete testing strategy for validation