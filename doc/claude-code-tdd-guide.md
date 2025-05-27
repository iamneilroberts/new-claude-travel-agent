# Test-Driven Development (TDD) with Claude Code

## TDD Workflow with AI Pair Programming
**Red-Green-Refactor Cycle Enhanced with Claude Code:**

1. **RED Phase - Write Failing Tests**
   - Define comprehensive unit tests covering:
     * Happy path scenarios
     * Edge cases and boundary conditions
     * Error handling and validation
     * Input/output schemas
   - Include implementation assumptions (e.g., mocking dependencies)
   - Use descriptive test names that specify expected behavior

2. **GREEN Phase - AI-Assisted Implementation**
   - Provide complete test context to Claude Code
   - Use prompt: "Write [language] function that satisfies these unit tests"
   - Include test files and expected behavior in context
   - Expect 80% completion with AI, manual refinement for remaining 20%

3. **REFACTOR Phase - Iterative Improvement**
   - Run tests after each AI-generated code iteration
   - Provide test failure results back to Claude Code for refinement
   - Maintain conversation history for better context
   - Implement circuit-breaker to limit iteration cycles (max 5-7 attempts)

## TDD Communication Patterns with Claude Code

### Effective Test-First Prompts:
- "Write comprehensive unit tests for a function that [specific behavior]"
- "Generate tests covering happy path, edge cases, and error conditions for [feature]"
- "Create test suite for [component] with these specific scenarios: [list]"

### Implementation Request Patterns:
- "Implement function that passes all these unit tests: [paste tests]"
- "Write TypeScript class that satisfies this test specification: [tests]"
- "Generate code for [feature] using this test-driven specification: [tests]"

## TDD Quality Gates with Claude Code

### Pre-Implementation Validation:
- **Test completeness check**: Verify tests cover all requirements
- **Test clarity verification**: Ensure tests are self-documenting
- **Dependency isolation**: Confirm proper mocking strategies
- **Performance test inclusion**: Add timing/resource tests where needed

### Post-Implementation Validation:
- **Test execution**: All tests must pass before proceeding
- **Code coverage analysis**: Verify comprehensive test coverage
- **Integration testing**: Validate component interactions
- **Regression prevention**: Ensure existing functionality unchanged

## TDD Anti-Patterns to Avoid with AI

### Common AI-TDD Pitfalls:
- **Over-reliance on AI**: Always review and understand generated code
- **Insufficient test coverage**: AI may miss edge cases you haven't specified
- **Test coupling**: Avoid tests that are too tightly coupled to implementation
- **Missing human oversight**: AI cannot replace domain expertise and judgment

### Quality Assurance Strategies:
- **Human-defined design**: Let TDD tests drive architecture, not AI preferences
- **Explicit expectations**: Provide clear input-output specifications
- **Iterative refinement**: Use multiple rounds with test feedback
- **Context preservation**: Maintain conversation history for consistent AI responses

## TDD Integration with Project Workflows

### Commit Strategy for TDD:
- **Commit after RED phase**: Save failing tests as design documentation
- **Commit after GREEN phase**: Save working implementation with passing tests
- **Commit after REFACTOR phase**: Save optimized code with maintained test coverage
- **Commit message format**: `test: add comprehensive tests for [feature]` / `feat: implement [feature] with TDD approach`

### Testing Framework Integration:
- **Identify test frameworks**: Check `package.json` for existing test setup
- **Follow project patterns**: Mimic existing test structure and naming
- **Validate test commands**: Ensure `npm test` or equivalent works
- **CI/CD compatibility**: Verify tests run in automated pipelines

## Practical TDD Usage with Claude Code

### Start Every Feature with "Use TDD approach"
**Instead of:** "Add user authentication"  
**Say:** "Add user authentication using TDD approach"

Claude Code will automatically:
1. Write comprehensive tests first
2. Implement code to pass tests
3. Refactor while maintaining coverage
4. Commit at each phase

### Use Specific TDD Prompts
- "Write tests for a function that validates email addresses with these edge cases: empty string, invalid format, valid format"
- "Implement the email validator that passes all these tests: [paste tests]"
- "Refactor this code while keeping all tests green"

### TDD Debugging Pattern
When tests fail:
1. Copy the test failure output
2. Say: "These tests are failing: [paste output]. Fix the implementation"
3. Claude Code will analyze failures and adjust code
4. Repeat until green

## Common TDD Patterns

### Problem-Solution Documentation
When you solve a tricky issue:
"Add to CLAUDE.md: Problem: MCP authentication failing. Solution: Use Bearer token in headers. Context: Required for Cloudflare Workers."

### Failed Approach Learning
When something doesn't work:
"Document in CLAUDE.md: Tried direct database queries in worker, failed due to connection limits. Use D1 binding instead."

### Team Knowledge Sharing
"Update CLAUDE.md with this working OAuth flow for the team to use"

The key is treating TDD as a collaboration framework that guides AI-generated code while maintaining human oversight and design control.