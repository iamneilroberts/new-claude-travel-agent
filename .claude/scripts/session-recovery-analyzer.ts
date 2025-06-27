import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { createReadStream } from 'fs';

interface SessionData {
  branch: string;
  workingDir: string;
  lastActivity: Date;
  tasks: TaskInfo[];
  filesEdited: Set<string>;
  commandsRun: string[];
  searchTerms: Set<string>;
  errors: ErrorInfo[];
  todoItems: TodoItem[];
}

interface TaskInfo {
  description: string;
  status: 'started' | 'in_progress' | 'possibly_complete' | 'unknown';
  relatedFiles: string[];
  lastMention: Date;
}

interface ErrorInfo {
  type: string;
  message: string;
  context: string;
  timestamp: Date;
}

interface TodoItem {
  content: string;
  status: string;
  id: string;
}

export class SessionRecoveryAnalyzer {
  private chatHistoryDir: string;
  private recoveryDir: string;

  constructor() {
    const home = process.env.HOME || '';
    this.chatHistoryDir = path.join(home, '.claude/projects/-home-neil-dev-new-claude-travel-agent');
    this.recoveryDir = path.join(home, '.claude/recovery');
  }

  async analyzeAndRecover(hoursBack: number = 48): Promise<void> {
    // Ensure recovery directory exists
    await fs.mkdir(this.recoveryDir, { recursive: true });

    // Get recent chat files
    const recentFiles = await this.getRecentChatFiles(hoursBack);
    // Silent - no duplicate notification needed

    // Analyze sessions and group by branch
    const sessionsByBranch = await this.analyzeSessions(recentFiles);

    // Generate recovery files and show detailed info
    console.log('## Session Recovery Details\n');

    for (const [branch, sessionData] of sessionsByBranch.entries()) {
      await this.generateRecoveryFile(branch, sessionData);

      // Show session details
      console.log(`### Branch: ${branch}`);
      console.log(`**Last Activity**: ${sessionData.lastActivity.toLocaleString()}`);

      // Show recent files
      if (sessionData.filesEdited.size > 0) {
        console.log(`**Recent Files** (${sessionData.filesEdited.size} total):`);
        const recentFiles = Array.from(sessionData.filesEdited).slice(-5);
        recentFiles.forEach(file => console.log(`  - ${file}`));
      }

      // Show TODO status
      if (sessionData.todoItems.length > 0) {
        const completed = sessionData.todoItems.filter(t => t.status === 'completed').length;
        const inProgress = sessionData.todoItems.filter(t => t.status === 'in_progress').length;
        console.log(`**TODO Progress**: ${completed} completed, ${inProgress} in progress, ${sessionData.todoItems.length - completed - inProgress} pending`);

        // Show in-progress items
        const activeItems = sessionData.todoItems.filter(t => t.status === 'in_progress');
        if (activeItems.length > 0) {
          console.log(`**Active TODOs**:`);
          activeItems.forEach(item => console.log(`  - ${item.content}`));
        }
      }

      // Show recovery prompt
      const filename = this.getRecoveryFilename(branch);
      console.log(`\n**Recovery Prompt**: \`cat ~/.claude/recovery/${filename}\`\n`);

      // Create suggested continuation prompt
      console.log(`**Quick Recovery**: Copy this prompt to continue:\n`);
      console.log(this.createQuickRecoveryPrompt(branch, sessionData));
      console.log('\n---\n');
    }
  }

  private async getRecentChatFiles(hoursBack: number): Promise<string[]> {
    const files = await fs.readdir(this.chatHistoryDir);
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const recentFiles: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;

      const filePath = path.join(this.chatHistoryDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime.getTime() > cutoffTime) {
        recentFiles.push(filePath);
      }
    }

    return recentFiles.sort((a, b) => {
      // Sort by modification time, newest first
      return b.localeCompare(a);
    });
  }

  private async analyzeSessions(files: string[]): Promise<Map<string, SessionData>> {
    const sessionsByBranch = new Map<string, SessionData>();

    for (const file of files) {
      const sessionInfo = await this.extractSessionInfo(file);
      if (!sessionInfo) continue;

      const branch = sessionInfo.branch || 'unknown-branch';

      if (!sessionsByBranch.has(branch)) {
        sessionsByBranch.set(branch, sessionInfo);
      } else {
        // Merge session data if same branch
        this.mergeSessionData(sessionsByBranch.get(branch)!, sessionInfo);
      }
    }

    return sessionsByBranch;
  }

  private async extractSessionInfo(filePath: string): Promise<SessionData | null> {
    const sessionData: SessionData = {
      branch: '',
      workingDir: '',
      lastActivity: new Date(),
      tasks: [],
      filesEdited: new Set(),
      commandsRun: [],
      searchTerms: new Set(),
      errors: [],
      todoItems: []
    };

    try {
      const fileStream = createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let currentUserMessage = '';
      let lastGitBranch = '';
      let pendingBranchResult = false;

      for await (const line of rl) {
        if (line.length > 50000) continue; // Skip huge lines (images)

        try {
          const entry = JSON.parse(line);

          // Extract working directory and branch
          if (entry.cwd && !sessionData.workingDir) {
            sessionData.workingDir = entry.cwd;
          }

          // Update last activity time
          if (entry.timestamp) {
            sessionData.lastActivity = new Date(entry.timestamp);
          }

          // Process different entry types
          if (entry.type === 'user' && entry.message?.content) {
            currentUserMessage = this.extractText(entry.message.content);
            this.extractTaskInfo(currentUserMessage, sessionData);
          }

          // Handle Claude Code format where tool uses are inside assistant messages
          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content || []) {
              if (content.type === 'tool_use') {
                this.processToolUse(content, sessionData, lastGitBranch);
                // Check if this is a git branch or status command
                if (content.name === 'Bash' && (
                  content.input?.command?.includes('git branch --show-current') ||
                  content.input?.command?.includes('git status')
                )) {
                  pendingBranchResult = true;
                }
              } else if (content.type === 'text' && pendingBranchResult) {
                // Next text after git branch command might contain the branch
                // Look for branch name pattern in the output
                const lines = content.text?.split('\n') || [];
                for (const line of lines) {
                  const trimmed = line.trim();

                  // Match "On branch feature/xxx" from git status
                  const statusMatch = trimmed.match(/^On branch (.+)$/);
                  if (statusMatch) {
                    lastGitBranch = statusMatch[1].trim();
                    sessionData.branch = lastGitBranch;
                    pendingBranchResult = false;
                    break;
                  }

                  // Match branch name - could be on its own line or with * prefix
                  const branchMatch = trimmed.match(/^\*?\s*([a-zA-Z0-9\-_\/]+)$/);
                  if (branchMatch && trimmed.length < 100 && !trimmed.includes('error')) {
                    lastGitBranch = branchMatch[1].trim();
                    sessionData.branch = lastGitBranch;
                    pendingBranchResult = false;
                    break;
                  }
                }
              }
            }
          }

          // Check for errors in messages
          if (entry.isApiErrorMessage) {
            sessionData.errors.push({
              type: 'API Error',
              message: entry.message?.content?.[0]?.text || 'Unknown error',
              context: currentUserMessage.substring(0, 100),
              timestamp: new Date(entry.timestamp || Date.now())
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // If no branch found but we have meaningful data, still return it
      if (!sessionData.branch && sessionData.workingDir) {
        // Try to infer branch from working directory
        const dirMatch = sessionData.workingDir.match(/new-claude-travel-agent/);
        if (dirMatch) {
          sessionData.branch = 'unknown-branch';
        }
      }

      return (sessionData.branch || sessionData.tasks.length > 0) ? sessionData : null;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return null;
    }
  }

  private extractText(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .join(' ');
    }
    return '';
  }

  private extractTaskInfo(message: string, sessionData: SessionData): void {
    // Look for task-like phrases
    const taskPatterns = [
      /(?:working on|implementing|fixing|creating|debugging):\s*(.+)/i,
      /(?:help me|i need to|please|can you)\s+(.+)/i,
      /(?:task:|todo:)\s*(.+)/i
    ];

    for (const pattern of taskPatterns) {
      const match = message.match(pattern);
      if (match) {
        sessionData.tasks.push({
          description: match[1].substring(0, 200),
          status: 'started',
          relatedFiles: [],
          lastMention: new Date()
        });
        break;
      }
    }
  }

  private processToolUse(entry: any, sessionData: SessionData, currentBranch: string): void {
    const toolName = entry.toolName || entry.name;
    const params = entry.parameters || entry.params || entry.input;

    switch (toolName) {
      case 'Bash':
        if (params?.command) {
          sessionData.commandsRun.push(params.command);

          // Check for git operations
          if (params.command.includes('git')) {
            sessionData.commandsRun.push(params.command);
          }
        }
        break;

      case 'Read':
      case 'Edit':
      case 'Write':
      case 'MultiEdit':
        if (params?.file_path) {
          sessionData.filesEdited.add(params.file_path);

          // Associate file with current task
          if (sessionData.tasks.length > 0) {
            const lastTask = sessionData.tasks[sessionData.tasks.length - 1];
            if (!lastTask.relatedFiles.includes(params.file_path)) {
              lastTask.relatedFiles.push(params.file_path);
            }
          }
        }
        break;

      case 'Grep':
      case 'Task':
        if (params?.pattern || params?.query || params?.prompt) {
          sessionData.searchTerms.add(params.pattern || params.query || params.prompt);
        }
        break;

      case 'TodoWrite':
        if (params?.todos) {
          sessionData.todoItems = params.todos;
        }
        break;
    }
  }

  private processToolResult(entry: any, sessionData: SessionData): { branch?: string } {
    // This method is no longer needed in Claude Code format
    // Tool results are embedded in assistant messages
    return {};
  }

  private mergeSessionData(existing: SessionData, newData: SessionData): void {
    // Merge all data from multiple sessions on same branch
    existing.lastActivity = new Date(Math.max(
      existing.lastActivity.getTime(),
      newData.lastActivity.getTime()
    ));

    existing.tasks.push(...newData.tasks);
    newData.filesEdited.forEach(file => existing.filesEdited.add(file));
    existing.commandsRun.push(...newData.commandsRun);
    newData.searchTerms.forEach(term => existing.searchTerms.add(term));
    existing.errors.push(...newData.errors);

    // Keep the most recent todo items
    if (newData.todoItems.length > 0) {
      existing.todoItems = newData.todoItems;
    }
  }

  private async generateRecoveryFile(branch: string, sessionData: SessionData): Promise<void> {
    const filename = this.getRecoveryFilename(branch);
    const filePath = path.join(this.recoveryDir, filename);

    const content = await this.createRecoveryContent(branch, sessionData);
    await fs.writeFile(filePath, content);

    // Silent - recovery file creation is implicit
  }

  private getRecoveryFilename(branch: string): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedBranch = branch.replace(/\//g, '-');
    return `${date}-${sanitizedBranch}-recovery.md`;
  }

  private async createRecoveryContent(branch: string, sessionData: SessionData): Promise<string> {
    const recentError = sessionData.errors[sessionData.errors.length - 1];
    const wasTimeout = recentError?.type === 'API Timeout';

    let content = `# Session Recovery: ${branch}

## Recovery Context
- **Generated**: ${new Date().toISOString()}
- **Branch**: ${branch}
- **Working Directory**: ${sessionData.workingDir}
- **Last Activity**: ${sessionData.lastActivity.toISOString()}
${wasTimeout ? `- **Interrupted By**: API Timeout` : ''}

## Instructions for New Session

Please continue the work that was interrupted. Copy this entire message into a new Claude session.

### Active Tasks
`;

    // List tasks with completion analysis
    for (const task of sessionData.tasks) {
      const status = await this.analyzeTaskCompletion(task, sessionData);
      content += `\n**Task**: ${task.description}
**Status**: ${status.description}
**Related Files**: ${task.relatedFiles.join(', ') || 'None identified'}
`;
      if (status.nextSteps) {
        content += `**Next Steps**: ${status.nextSteps}\n`;
      }
    }

    // Add TODO items with status
    if (sessionData.todoItems.length > 0) {
      content += `\n### TODO Status Check
Please verify the completion status of these items:\n`;

      for (const todo of sessionData.todoItems) {
        const checkmark = todo.status === 'completed' ? 'x' : ' ';
        const statusNote = await this.guessTodoStatus(todo, sessionData);
        content += `- [${checkmark}] ${todo.content} ${statusNote}\n`;
      }
    }

    // Add recent file activity
    if (sessionData.filesEdited.size > 0) {
      content += `\n### Files to Review
These files were recently modified - please check their current state:\n`;
      for (const file of Array.from(sessionData.filesEdited).slice(-10)) {
        content += `- ${file}\n`;
      }
    }

    // Add recent commands
    if (sessionData.commandsRun.length > 0) {
      content += `\n### Recent Commands to Re-examine
\`\`\`bash\n`;
      const uniqueCommands = [...new Set(sessionData.commandsRun)].slice(-10);
      content += uniqueCommands.join('\n');
      content += `\n\`\`\`\n`;
    }

    // Add continuation instructions
    content += `\n### Continuation Instructions
1. First, check the current state with \`git status\`
2. Review the files listed above for incomplete changes
`;

    if (wasTimeout && recentError) {
      content += `3. The session was interrupted while: ${recentError.context}
4. Check if the last operation completed successfully
`;
    }

    // Add search context
    if (sessionData.searchTerms.size > 0) {
      content += `\n### Context from Previous Searches
The previous session was looking for:\n`;
      for (const term of Array.from(sessionData.searchTerms).slice(-5)) {
        content += `- "${term}"\n`;
      }
    }

    // Add specific recovery actions
    content += `\n### Recommended Recovery Actions
1. Run \`git diff\` to see uncommitted changes
2. Check if tests are passing with relevant test commands
3. ${wasTimeout ? 'Resume from the interrupted task' : 'Continue with remaining TODO items'}
4. Commit completed work before proceeding further
`;

    return content;
  }

  private async analyzeTaskCompletion(task: TaskInfo, sessionData: SessionData): Promise<{ description: string; nextSteps?: string }> {
    // Simple heuristics to guess task completion
    if (task.relatedFiles.length === 0) {
      return { description: 'NOT STARTED - No files were edited for this task' };
    }

    // Check if task mentions creating a file and file exists in edited files
    if (task.description.match(/create|add|implement/i) && task.relatedFiles.length > 0) {
      return {
        description: 'IN PROGRESS - Files were created/edited',
        nextSteps: 'Verify implementation is complete and tested'
      };
    }

    // Check for test-related tasks
    if (task.description.match(/test/i)) {
      const hasTestCommand = sessionData.commandsRun.some(cmd =>
        cmd.includes('test') || cmd.includes('jest') || cmd.includes('npm test')
      );

      if (hasTestCommand) {
        return {
          description: 'POSSIBLY COMPLETE - Test commands were run',
          nextSteps: 'Verify all tests are passing'
        };
      }
      return { description: 'NOT STARTED - No test commands found' };
    }

    return { description: 'UNKNOWN - Manual verification needed' };
  }

  private async guessTodoStatus(todo: TodoItem, sessionData: SessionData): Promise<string> {
    if (todo.status === 'completed') return '✓';

    // Check if files mentioned in todo were edited
    const todoLower = todo.content.toLowerCase();
    const wasWorkedOn = Array.from(sessionData.filesEdited).some(file =>
      todoLower.includes(path.basename(file).toLowerCase())
    );

    if (wasWorkedOn) return '(IN PROGRESS - files edited)';

    // Check if related commands were run
    const hadRelatedCommand = sessionData.commandsRun.some(cmd => {
      const cmdLower = cmd.toLowerCase();
      return todoLower.split(' ').some(word =>
        word.length > 4 && cmdLower.includes(word)
      );
    });

    if (hadRelatedCommand) return '(POSSIBLY STARTED)';

    return '(NOT STARTED)';
  }

  private createQuickRecoveryPrompt(branch: string, sessionData: SessionData): string {
    let prompt = `Continue work on branch ${branch}. `;

    // Add context about what was being worked on
    if (sessionData.tasks.length > 0) {
      const lastTask = sessionData.tasks[sessionData.tasks.length - 1];
      prompt += `I was ${lastTask.description}. `;
    }

    // Add active TODOs
    const activeTodos = sessionData.todoItems.filter(t => t.status === 'in_progress');
    if (activeTodos.length > 0) {
      prompt += `Currently working on: "${activeTodos[0].content}". `;
    }

    // Add recent files context
    if (sessionData.filesEdited.size > 0) {
      const recentFile = Array.from(sessionData.filesEdited).pop();
      prompt += `Last file edited: ${recentFile}. `;
    }

    // Add recovery instruction
    if (sessionData.errors.length > 0) {
      prompt += `The session was interrupted. Please check git status and continue where I left off.`;
    } else {
      prompt += `Please check the current state and continue with the remaining work.`;
    }

    return prompt;
  }
}

// Export a function that can be called from the command
export async function runRecovery(args?: string): Promise<void> {
  const analyzer = new SessionRecoveryAnalyzer();

  // Parse hours from arguments (default 48)
  const hours = args?.match(/\d+/) ? parseInt(args.match(/\d+/)![0]) : 48;

  // Silent - handled by the command itself
  await analyzer.analyzeAndRecover(hours);
}

// Run if called directly
if (require.main === module) {
  const args = process.argv[2];
  runRecovery(args).catch(error => {
    console.error('Error during recovery:', error);
    process.exit(1);
  });
}
