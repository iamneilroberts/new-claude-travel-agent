/**
 * Template Engine Enhanced Implementation
 * Sprint: S02_M03_Implementation - Phase 2: Enhancement
 * 
 * Implements advanced template features:
 * - Basic {variable} substitution with security features
 * - Conditional blocks: {{#if variable}}...{{/if}}
 * - Loop blocks: {{#each array}}...{{/each}}
 * - Nested object support: {client.contact.email}
 * - Advanced formatters and security
 */

export interface TemplateVariable {
  name: string;
  path: string[];
  defaultValue?: string;
  isRequired: boolean;
  formatters?: string[];
  type?: 'variable' | 'conditional' | 'loop';
}

export interface ConditionalBlock {
  condition: string;
  content: string;
  elseContent?: string;
  variables: TemplateVariable[];
}

export interface LoopBlock {
  arrayVariable: string;
  itemVariable: string;
  content: string;
  variables: TemplateVariable[];
}

export interface CompiledTemplate {
  id: string;
  originalTemplate: string;
  variables: TemplateVariable[];
  conditionals: ConditionalBlock[];
  loops: LoopBlock[];
  compiledAt: Date;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface RenderResult {
  content: string;
  success: boolean;
  variablesUsed: string[];
  variablesMissing: string[];
  warnings: string[];
  processingTimeMs: number;
  conditionalsProcessed: number;
  loopsProcessed: number;
  securityIssues: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class TemplateEngine {
  private templateCache = new Map<string, CompiledTemplate>();
  private maxCacheSize = 500;

  /**
   * Parse template string and extract variable references
   */
  extractVariables(template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const variableRegex = /\{([^}]+)\}/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const fullMatch = match[1];
      const parts = this.parseVariableExpression(fullMatch);
      
      variables.push({
        name: parts.name,
        path: parts.path,
        defaultValue: parts.defaultValue,
        isRequired: !parts.defaultValue,
        formatters: parts.formatters,
        type: 'variable'
      });
    }

    // Remove duplicates
    const uniqueVariables = variables.filter((variable, index, self) => 
      index === self.findIndex(v => v.name === variable.name)
    );

    return uniqueVariables;
  }

  /**
   * Extract conditional blocks from template
   */
  extractConditionals(template: string): ConditionalBlock[] {
    const conditionals: ConditionalBlock[] = [];
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    let match;

    while ((match = conditionalRegex.exec(template)) !== null) {
      const condition = match[1].trim();
      const content = match[2];
      const elseContent = match[3];
      
      conditionals.push({
        condition,
        content,
        elseContent,
        variables: this.extractVariables(content + (elseContent || ''))
      });
    }

    return conditionals;
  }

  /**
   * Extract loop blocks from template
   */
  extractLoops(template: string): LoopBlock[] {
    const loops: LoopBlock[] = [];
    const loopRegex = /\{\{#each\s+(\w+)\s+as\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    let match;

    while ((match = loopRegex.exec(template)) !== null) {
      const arrayVariable = match[1];
      const itemVariable = match[2];
      const content = match[3];
      
      loops.push({
        arrayVariable,
        itemVariable,
        content,
        variables: this.extractVariables(content)
      });
    }

    return loops;
  }

  /**
   * Parse variable expression like "client.name|default" or "price|currency"
   */
  private parseVariableExpression(expression: string): {
    name: string;
    path: string[];
    defaultValue?: string;
    formatters: string[];
  } {
    let name = expression.trim();
    let defaultValue: string | undefined;
    let formatters: string[] = [];

    // Handle default values: {variable|default}
    if (name.includes('|')) {
      const parts = name.split('|');
      name = parts[0].trim();
      
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (i === 1 && (part.startsWith('"') || part.startsWith("'"))) {
          // This is a default value
          defaultValue = part.slice(1, -1); // Remove quotes
        } else {
          // This is a formatter
          formatters.push(part);
        }
      }
    }

    // Handle nested objects: client.name
    const path = name.split('.');

    return {
      name,
      path,
      defaultValue,
      formatters
    };
  }

  /**
   * Compile template for efficient reuse
   */
  compile(template: string): CompiledTemplate {
    const templateId = this.generateTemplateId(template);
    
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const variables = this.extractVariables(template);
    const conditionals = this.extractConditionals(template);
    const loops = this.extractLoops(template);
    
    // Determine complexity
    const complexity = this.determineComplexity(variables, conditionals, loops);
    
    const compiled: CompiledTemplate = {
      id: templateId,
      originalTemplate: template,
      variables,
      conditionals,
      loops,
      compiledAt: new Date(),
      complexity
    };

    // Cache with LRU eviction
    if (this.templateCache.size >= this.maxCacheSize) {
      const firstKey = this.templateCache.keys().next().value;
      if (firstKey) {
        this.templateCache.delete(firstKey);
      }
    }
    
    this.templateCache.set(templateId, compiled);
    
    return compiled;
  }

  /**
   * Determine template complexity
   */
  private determineComplexity(variables: TemplateVariable[], conditionals: ConditionalBlock[], loops: LoopBlock[]): 'simple' | 'medium' | 'complex' {
    const totalElements = variables.length + conditionals.length + loops.length;
    
    if (loops.length > 0 || conditionals.length > 3 || totalElements > 15) {
      return 'complex';
    } else if (conditionals.length > 0 || totalElements > 5) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Render template with variables
   */
  render(template: string | CompiledTemplate, variables: Record<string, any>): RenderResult {
    const startTime = Date.now();
    
    try {
      const compiled = typeof template === 'string' ? this.compile(template) : template;
      
      let content = compiled.originalTemplate;
      const variablesUsed: string[] = [];
      const variablesMissing: string[] = [];
      const warnings: string[] = [];
      const securityIssues: string[] = [];
      let conditionalsProcessed = 0;
      let loopsProcessed = 0;

      // STEP 1: Process conditional blocks first (they can contain variables)
      for (const conditional of compiled.conditionals) {
        const conditionResult = this.evaluateCondition(conditional.condition, variables);
        const contentToUse = conditionResult ? conditional.content : (conditional.elseContent || '');
        
        // Process variables in the selected content
        let processedContent = contentToUse;
        for (const variable of conditional.variables) {
          const value = this.resolveVariable(variables, variable);
          if (value !== undefined && value !== null) {
            const formattedValue = this.applyFormatters(value, variable.formatters || []);
            const sanitizedValue = this.sanitizeValue(formattedValue);
            const placeholder = `{${variable.name}}`;
            processedContent = processedContent.replace(new RegExp(this.escapeRegex(placeholder), 'g'), sanitizedValue);
            if (!variablesUsed.includes(variable.name)) {
              variablesUsed.push(variable.name);
            }
          }
        }
        
        // Replace the entire conditional block
        const blockRegex = new RegExp(`\\{\\{#if\\s+${this.escapeRegex(conditional.condition)}\\}\\}[\\s\\S]*?\\{\\{\\/if\\}\\}`, 'g');
        content = content.replace(blockRegex, processedContent);
        conditionalsProcessed++;
      }

      // STEP 2: Process loop blocks
      for (const loop of compiled.loops) {
        const arrayValue = variables[loop.arrayVariable];
        let processedLoop = '';
        
        if (Array.isArray(arrayValue)) {
          for (const item of arrayValue) {
            let itemContent = loop.content;
            
            // Create context with loop item
            const loopContext = { ...variables, [loop.itemVariable]: item };
            
            // Process variables in loop content
            for (const variable of loop.variables) {
              const value = this.resolveVariable(loopContext, variable);
              if (value !== undefined && value !== null) {
                const formattedValue = this.applyFormatters(value, variable.formatters || []);
                const sanitizedValue = this.sanitizeValue(formattedValue);
                const placeholder = `{${variable.name}}`;
                itemContent = itemContent.replace(new RegExp(this.escapeRegex(placeholder), 'g'), sanitizedValue);
                if (!variablesUsed.includes(variable.name)) {
                  variablesUsed.push(variable.name);
                }
              }
            }
            
            processedLoop += itemContent;
          }
        } else if (arrayValue === undefined) {
          variablesMissing.push(loop.arrayVariable);
        } else {
          warnings.push(`Variable ${loop.arrayVariable} is not an array for loop processing`);
        }
        
        // Replace the entire loop block
        const blockRegex = new RegExp(`\\{\\{#each\\s+${loop.arrayVariable}\\s+as\\s+${loop.itemVariable}\\}\\}[\\s\\S]*?\\{\\{\\/each\\}\\}`, 'g');
        content = content.replace(blockRegex, processedLoop);
        loopsProcessed++;
      }

      // STEP 3: Process remaining simple variables
      for (const variable of compiled.variables) {
        const value = this.resolveVariable(variables, variable);
        
        if (value !== undefined && value !== null) {
          // Apply formatters
          const formattedValue = this.applyFormatters(value, variable.formatters || []);
          
          // Sanitize for security
          const sanitizedValue = this.sanitizeValue(formattedValue);
          
          // Replace in content
          const placeholder = `{${variable.name}}`;
          content = content.replace(new RegExp(this.escapeRegex(placeholder), 'g'), sanitizedValue);
          
          if (!variablesUsed.includes(variable.name)) {
            variablesUsed.push(variable.name);
          }
        } else if (variable.defaultValue) {
          // Use default value
          const sanitizedDefault = this.sanitizeValue(variable.defaultValue || '');
          const placeholder = `{${variable.name}}`;
          content = content.replace(new RegExp(this.escapeRegex(placeholder), 'g'), sanitizedDefault);
          
          warnings.push(`Used default value for variable: ${variable.name}`);
        } else if (variable.isRequired) {
          if (!variablesMissing.includes(variable.name)) {
            variablesMissing.push(variable.name);
          }
        } else {
          // Remove optional variable placeholder
          const placeholder = `{${variable.name}}`;
          content = content.replace(new RegExp(this.escapeRegex(placeholder), 'g'), '');
          warnings.push(`Removed empty placeholder: ${variable.name}`);
        }
      }

      // STEP 4: Security check for remaining unprocessed blocks
      if (content.includes('{{') || content.includes('}}')) {
        securityIssues.push('Unprocessed template blocks detected - potential injection risk');
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        content,
        success: variablesMissing.length === 0 && securityIssues.length === 0,
        variablesUsed,
        variablesMissing,
        warnings,
        processingTimeMs,
        conditionalsProcessed,
        loopsProcessed,
        securityIssues
      };

    } catch (error) {
      return {
        content: template.toString(),
        success: false,
        variablesUsed: [],
        variablesMissing: [],
        warnings: [`Template processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processingTimeMs: Date.now() - startTime,
        conditionalsProcessed: 0,
        loopsProcessed: 0,
        securityIssues: [`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Evaluate conditional expression for template logic
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Handle various condition types
      
      // Simple truthiness: {variable}
      if (condition.match(/^[a-zA-Z_][a-zA-Z0-9_.]*$/)) {
        const value = this.resolveVariableByPath(condition, variables);
        return !!value;
      }
      
      // Equality checks: variable == 'value' or variable === 'value'
      if (condition.includes('==')) {
        const [left, right] = condition.split(/===?/).map(s => s.trim());
        const leftValue = this.resolveVariableByPath(left, variables);
        const rightValue = right.replace(/^['"]|['"]$/g, ''); // Remove quotes
        return leftValue == rightValue;
      }
      
      // Inequality checks: variable != 'value'
      if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(s => s.trim());
        const leftValue = this.resolveVariableByPath(left, variables);
        const rightValue = right.replace(/^['"]|['"]$/g, '');
        return leftValue != rightValue;
      }
      
      // Greater than: variable > value
      if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        const leftValue = parseFloat(this.resolveVariableByPath(left, variables));
        const rightValue = parseFloat(right);
        return !isNaN(leftValue) && !isNaN(rightValue) && leftValue > rightValue;
      }
      
      // Less than: variable < value
      if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        const leftValue = parseFloat(this.resolveVariableByPath(left, variables));
        const rightValue = parseFloat(right);
        return !isNaN(leftValue) && !isNaN(rightValue) && leftValue < rightValue;
      }
      
      // Array contains: array.includes(value)
      if (condition.includes('.includes(')) {
        const match = condition.match(/([a-zA-Z_][a-zA-Z0-9_.]*)\.includes\(['"]([^'"]*)['"]\)/);
        if (match) {
          const arrayValue = this.resolveVariableByPath(match[1], variables);
          const searchValue = match[2];
          return Array.isArray(arrayValue) && arrayValue.includes(searchValue);
        }
      }
      
      // Array length: array.length > 0
      if (condition.includes('.length')) {
        const match = condition.match(/([a-zA-Z_][a-zA-Z0-9_.]*)\.length\s*([><=!]+)\s*(\d+)/);
        if (match) {
          const arrayValue = this.resolveVariableByPath(match[1], variables);
          const operator = match[2];
          const compareValue = parseInt(match[3]);
          const length = Array.isArray(arrayValue) ? arrayValue.length : 0;
          
          switch (operator) {
            case '>': return length > compareValue;
            case '<': return length < compareValue;
            case '>=': return length >= compareValue;
            case '<=': return length <= compareValue;
            case '==': return length == compareValue;
            case '!=': return length != compareValue;
          }
        }
      }
      
      // Default: try to evaluate as simple boolean
      return !!variables[condition];
      
    } catch (error) {
      console.warn(`Condition evaluation failed: ${condition}`, error);
      return false; // Fail safe
    }
  }

  /**
   * Resolve variable by path string (for conditions)
   */
  private resolveVariableByPath(path: string, variables: Record<string, any>): any {
    const segments = path.split('.');
    let value = variables;
    
    for (const segment of segments) {
      if (value && typeof value === 'object' && segment in value) {
        value = value[segment];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Resolve variable value from nested object
   */
  private resolveVariable(variables: Record<string, any>, variable: TemplateVariable): any {
    let value = variables;
    
    for (const pathSegment of variable.path) {
      if (value && typeof value === 'object' && pathSegment in value) {
        value = value[pathSegment];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Apply formatters to value
   */
  private applyFormatters(value: any, formatters: string[]): string {
    let result = String(value);
    
    for (const formatter of formatters) {
      switch (formatter.toLowerCase()) {
        case 'currency':
          result = this.formatCurrency(parseFloat(result) || 0);
          break;
        case 'comma':
          result = this.formatNumber(parseFloat(result) || 0);
          break;
        case 'uppercase':
          result = result.toUpperCase();
          break;
        case 'lowercase':
          result = result.toLowerCase();
          break;
        case 'capitalize':
          result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
          break;
        case 'titlecase':
          result = result.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          break;
        case 'trim':
          result = result.trim();
          break;
        case 'truncate':
          result = result.length > 100 ? result.substring(0, 97) + '...' : result;
          break;
        case 'date':
          const dateValue = new Date(result);
          result = isNaN(dateValue.getTime()) ? result : dateValue.toLocaleDateString();
          break;
        case 'time':
          const timeValue = new Date(result);
          result = isNaN(timeValue.getTime()) ? result : timeValue.toLocaleTimeString();
          break;
        case 'datetime':
          const datetimeValue = new Date(result);
          result = isNaN(datetimeValue.getTime()) ? result : datetimeValue.toLocaleString();
          break;
        case 'encode':
          result = encodeURIComponent(result);
          break;
        case 'length':
          result = result.length.toString();
          break;
        case 'reverse':
          result = result.split('').reverse().join('');
          break;
        case 'json':
          try {
            result = JSON.stringify(JSON.parse(result), null, 2);
          } catch {
            // If not valid JSON, leave as-is
          }
          break;
        default:
          // Unknown formatter, leave as-is
          break;
      }
    }
    
    return result;
  }

  /**
   * Format number as currency
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  /**
   * Format number with commas
   */
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Sanitize value for security (basic XSS prevention)
   */
  private sanitizeValue(value: string): string {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Escape string for regex
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate unique ID for template
   */
  private generateTemplateId(template: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `tpl_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Validate template syntax
   */
  validateSyntax(template: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for balanced braces
      let braceCount = 0;
      for (let i = 0; i < template.length; i++) {
        if (template[i] === '{') {
          braceCount++;
        } else if (template[i] === '}') {
          braceCount--;
          if (braceCount < 0) {
            errors.push(`Unmatched closing brace at position ${i}`);
            break;
          }
        }
      }
      
      if (braceCount > 0) {
        errors.push(`${braceCount} unclosed brace(s)`);
      }

      // Check for empty variables
      const emptyVariables = template.match(/\{\s*\}/g);
      if (emptyVariables) {
        warnings.push(`Found ${emptyVariables.length} empty variable placeholder(s)`);
      }

      // Validate conditional blocks
      const conditionalMatches = template.match(/\{\{#if\s+[^}]+\}\}/g);
      const conditionalEndMatches = template.match(/\{\{\/if\}\}/g);
      if (conditionalMatches && conditionalEndMatches) {
        if (conditionalMatches.length !== conditionalEndMatches.length) {
          errors.push(`Unmatched conditional blocks: ${conditionalMatches.length} opens, ${conditionalEndMatches.length} closes`);
        }
      } else if (conditionalMatches && !conditionalEndMatches) {
        errors.push(`Unclosed conditional blocks: ${conditionalMatches.length} {{#if}} without {{/if}}`);
      } else if (!conditionalMatches && conditionalEndMatches) {
        errors.push(`Orphaned conditional closes: ${conditionalEndMatches.length} {{/if}} without {{#if}}`);
      }

      // Validate loop blocks
      const loopMatches = template.match(/\{\{#each\s+\w+\s+as\s+\w+\}\}/g);
      const loopEndMatches = template.match(/\{\{\/each\}\}/g);
      if (loopMatches && loopEndMatches) {
        if (loopMatches.length !== loopEndMatches.length) {
          errors.push(`Unmatched loop blocks: ${loopMatches.length} opens, ${loopEndMatches.length} closes`);
        }
      } else if (loopMatches && !loopEndMatches) {
        errors.push(`Unclosed loop blocks: ${loopMatches.length} {{#each}} without {{/each}}`);
      } else if (!loopMatches && loopEndMatches) {
        errors.push(`Orphaned loop closes: ${loopEndMatches.length} {{/each}} without {{#each}}`);
      }

      // Check for invalid loop syntax
      const invalidLoops = template.match(/\{\{#each\s+[^}]+\}\}/g);
      if (invalidLoops) {
        for (const loop of invalidLoops) {
          if (!loop.match(/\{\{#each\s+\w+\s+as\s+\w+\}\}/)) {
            errors.push(`Invalid loop syntax: ${loop}. Use {{#each array as item}}`);
          }
        }
      }

      // Enhanced security checks
      const securityPatterns = [
        { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, message: 'Script tags detected' },
        { pattern: /javascript:/gi, message: 'JavaScript protocol detected' },
        { pattern: /on\w+\s*=/gi, message: 'Event handlers detected' },
        { pattern: /data:text\/html/gi, message: 'Data URL HTML detected' },
        { pattern: /eval\s*\(/gi, message: 'Eval function detected' },
        { pattern: /Function\s*\(/gi, message: 'Function constructor detected' },
        { pattern: /\{\{[^}]*[<>'"&].*?\}\}/g, message: 'Potential XSS in template block' }
      ];

      for (const { pattern, message } of securityPatterns) {
        if (pattern.test(template)) {
          errors.push(`Security risk: ${message}`);
        }
      }

      // Check template complexity
      const totalBlocks = (conditionalMatches?.length || 0) + (loopMatches?.length || 0);
      const variableCount = (template.match(/\{[^{][^}]*\}/g) || []).length;
      const totalComplexity = totalBlocks * 2 + variableCount;

      if (totalComplexity > 50) {
        warnings.push(`High template complexity (${totalComplexity}). Consider breaking into smaller templates.`);
      } else if (totalComplexity > 25) {
        warnings.push(`Medium template complexity (${totalComplexity}). Monitor performance.`);
      }

      // Check for suspicious variable names
      const suspiciousVariables = template.match(/\{[\w.]*(?:password|secret|key|token|auth)[\w.]*\}/gi);
      if (suspiciousVariables) {
        warnings.push(`Potentially sensitive variable names: ${suspiciousVariables.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Syntax validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.templateCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine();