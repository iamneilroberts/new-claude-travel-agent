import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { createReadStream } from 'fs';

interface ChatMessage {
  type: string;
  role?: string;
  content?: any;
  toolName?: string;
  parameters?: any;
  result?: string;
  error?: string;
  timestamp?: string;
}

interface SessionContext {
  sessionId: string;
  lastActivity: Date;
  workingDirectory?: string;
  activeTask?: string;
  recentErrors: string[];
  keyActions: string[];
  openFiles: Set<string>;
  searchTerms: Set<string>;
  commandHistory: string[];
  todoItems: string[];
  gitOperations: string[];
}

export class ChatHistoryAnalyzer {
  private static readonly RELEVANCE_PATTERNS = {
    // High priority patterns
    TASK_DESCRIPTION: /(?:help me|i need|please|can you|create|implement|fix|debug|analyze)/i,
    ERROR_PATTERN: /(?:error|failed|timeout|exception|issue|problem)/i,
    FILE_OPERATION: /(?:created?|modified|edited|wrote|read|opened?)\s+(?:file|at:)?\s*([\w\-\/\.]+)/i,
    SEARCH_PATTERN: /(?:search(?:ing)?|find(?:ing)?|look(?:ing)?\s+for|grep|glob)\s+["']?([^"'\n]+)["']?/i,
    COMMAND_EXECUTION: /(?:bash|npm|git|cd|ls|cat)\s+([^\n]+)/i,
    TODO_PATTERN: /(?:todo|task):\s*([^\n]+)/i,
    GIT_OPERATION: /(?:git\s+(?:add|commit|push|pull|checkout|branch|status))/i,
    API_TIMEOUT: /API Error.*Request timed out/i,
  };

  static async analyzeRecentSessions(
    historyDir: string,
    maxSessions: number = 5
  ): Promise<Map<string, SessionContext>> {
    const files = await this.getRecentFiles(historyDir, maxSessions);
    const sessions = new Map<string, SessionContext>();

    for (const file of files) {
      const sessionId = path.basename(file, '.jsonl');
      const context = await this.extractSessionContext(file);
      if (context && this.isRelevantSession(context)) {
        sessions.set(sessionId, context);
      }
    }

    return sessions;
  }

  private static async getRecentFiles(dir: string, limit: number): Promise<string[]> {
    const files = await fs.readdir(dir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      jsonlFiles.map(async (file) => {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        return { path: filePath, mtime: stats.mtime };
      })
    );

    return fileStats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit)
      .map(f => f.path);
  }

  private static async extractSessionContext(filePath: string): Promise<SessionContext | null> {
    const sessionId = path.basename(filePath, '.jsonl');
    const context: SessionContext = {
      sessionId,
      lastActivity: new Date(),
      recentErrors: [],
      keyActions: [],
      openFiles: new Set(),
      searchTerms: new Set(),
      commandHistory: [],
      todoItems: [],
      gitOperations: [],
    };

    try {
      const fileStream = createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lineCount = 0;
      let lastUserMessage = '';

      for await (const line of rl) {
        lineCount++;

        // Skip very large lines (likely base64 images)
        if (line.length > 10000) continue;

        try {
          const entry = JSON.parse(line);
          this.processEntry(entry, context, lastUserMessage);

          if (entry.type === 'user' && entry.message?.content) {
            lastUserMessage = this.extractTextContent(entry.message.content);
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }

      // Only process files with meaningful content
      if (lineCount < 10) return null;

      return context;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return null;
    }
  }

  private static processEntry(entry: any, context: SessionContext, lastUserMessage: string): void {
    // Extract working directory
    if (entry.cwd && !context.workingDirectory) {
      context.workingDirectory = entry.cwd;
    }

    // Process based on entry type
    switch (entry.type) {
      case 'user':
        this.processUserMessage(entry, context);
        break;
      case 'assistant':
        this.processAssistantMessage(entry, context, lastUserMessage);
        break;
      case 'tool_use':
        this.processToolUse(entry, context);
        break;
      case 'tool_result':
        this.processToolResult(entry, context);
        break;
    }
  }

  private static processUserMessage(entry: any, context: SessionContext): void {
    const content = this.extractTextContent(entry.message?.content);
    if (!content) return;

    // Check for task descriptions
    const taskMatch = content.match(this.RELEVANCE_PATTERNS.TASK_DESCRIPTION);
    if (taskMatch && !context.activeTask) {
      context.activeTask = content.substring(0, 200);
    }

    // Extract search terms
    const searchMatch = content.match(this.RELEVANCE_PATTERNS.SEARCH_PATTERN);
    if (searchMatch) {
      context.searchTerms.add(searchMatch[1]);
    }

    // Check for error mentions
    if (this.RELEVANCE_PATTERNS.ERROR_PATTERN.test(content)) {
      context.recentErrors.push(content.substring(0, 150));
    }
  }

  private static processAssistantMessage(entry: any, context: SessionContext, lastUserMessage: string): void {
    const content = this.extractTextContent(entry.message?.content);
    if (!content || content.length < 50) return;

    // Look for key actions mentioned
    if (lastUserMessage && content.length < 500) {
      context.keyActions.push(`Q: ${lastUserMessage.substring(0, 100)}... A: ${content.substring(0, 150)}...`);
    }
  }

  private static processToolUse(entry: any, context: SessionContext): void {
    const toolName = entry.toolName || entry.name;
    const params = entry.parameters || entry.params;

    switch (toolName) {
      case 'Bash':
        if (params?.command) {
          context.commandHistory.push(params.command);

          // Check for git operations
          if (this.RELEVANCE_PATTERNS.GIT_OPERATION.test(params.command)) {
            context.gitOperations.push(params.command);
          }
        }
        break;

      case 'Read':
      case 'Edit':
      case 'Write':
        if (params?.file_path) {
          context.openFiles.add(params.file_path);
        }
        break;

      case 'Grep':
      case 'Task':
        if (params?.pattern || params?.prompt) {
          context.searchTerms.add(params.pattern || params.prompt);
        }
        break;

      case 'TodoWrite':
        if (params?.todos) {
          params.todos.forEach((todo: any) => {
            if (todo.content) {
              context.todoItems.push(todo.content);
            }
          });
        }
        break;
    }
  }

  private static processToolResult(entry: any, context: SessionContext): void {
    const result = entry.result || entry.content;
    if (!result) return;

    // Check for API timeouts
    if (typeof result === 'string' && this.RELEVANCE_PATTERNS.API_TIMEOUT.test(result)) {
      context.recentErrors.push('API Timeout Error detected');
    }
  }

  private static extractTextContent(content: any): string {
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .join(' ');
    }

    return '';
  }

  private static isRelevantSession(context: SessionContext): boolean {
    // Consider a session relevant if it has meaningful activity
    return (
      context.keyActions.length > 0 ||
      context.openFiles.size > 0 ||
      context.commandHistory.length > 0 ||
      context.todoItems.length > 0
    );
  }

  static generateRecoveryContext(sessions: Map<string, SessionContext>): string {
    let context = `# Session Recovery Analysis\n\n`;

    // Find the most recent session with API timeout
    const timeoutSession = Array.from(sessions.values()).find(s =>
      s.recentErrors.some(e => e.includes('API Timeout'))
    );

    if (timeoutSession) {
      context += `## Last Session Before Timeout (${timeoutSession.sessionId})\n\n`;
      context += this.formatSessionContext(timeoutSession);
    }

    // Include other recent sessions briefly
    const otherSessions = Array.from(sessions.entries())
      .filter(([id, _]) => id !== timeoutSession?.sessionId)
      .slice(0, 2);

    if (otherSessions.length > 0) {
      context += `\n## Other Recent Sessions\n\n`;
      otherSessions.forEach(([id, session]) => {
        context += `### Session ${id.substring(0, 8)}...\n`;
        context += `- Active Task: ${session.activeTask || 'Not identified'}\n`;
        context += `- Open Files: ${Array.from(session.openFiles).slice(0, 3).join(', ')}\n`;
        context += `- Recent Commands: ${session.commandHistory.slice(-3).join('; ')}\n\n`;
      });
    }

    return context;
  }

  private static formatSessionContext(context: SessionContext): string {
    let formatted = '';

    if (context.workingDirectory) {
      formatted += `**Working Directory**: ${context.workingDirectory}\n\n`;
    }

    if (context.activeTask) {
      formatted += `**Active Task**: ${context.activeTask}\n\n`;
    }

    if (context.todoItems.length > 0) {
      formatted += `**TODO Items**:\n`;
      context.todoItems.slice(-5).forEach(item => {
        formatted += `- ${item}\n`;
      });
      formatted += '\n';
    }

    if (context.openFiles.size > 0) {
      formatted += `**Open Files**:\n`;
      Array.from(context.openFiles).slice(-10).forEach(file => {
        formatted += `- ${file}\n`;
      });
      formatted += '\n';
    }

    if (context.searchTerms.size > 0) {
      formatted += `**Recent Searches**:\n`;
      Array.from(context.searchTerms).slice(-5).forEach(term => {
        formatted += `- ${term}\n`;
      });
      formatted += '\n';
    }

    if (context.commandHistory.length > 0) {
      formatted += `**Recent Commands**:\n\`\`\`bash\n`;
      context.commandHistory.slice(-10).forEach(cmd => {
        formatted += `${cmd}\n`;
      });
      formatted += `\`\`\`\n\n`;
    }

    if (context.gitOperations.length > 0) {
      formatted += `**Git Operations**:\n\`\`\`bash\n`;
      context.gitOperations.slice(-5).forEach(cmd => {
        formatted += `${cmd}\n`;
      });
      formatted += `\`\`\`\n\n`;
    }

    if (context.recentErrors.length > 0) {
      formatted += `**Recent Errors**:\n`;
      context.recentErrors.slice(-3).forEach(error => {
        formatted += `- ${error}\n`;
      });
      formatted += '\n';
    }

    return formatted;
  }
}
