#!/usr/bin/env node

import { SessionStateManager } from './session-state-manager';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SESSION_STATE_DIR = path.join(process.env.HOME || '', '.claude-session-recovery');

async function main() {
  const manager = new SessionStateManager({
    stateDir: SESSION_STATE_DIR,
    maxSessionAge: 24,
    autoSaveInterval: 5
  });

  const sessions = await manager.loadSessions();

  if (sessions.length === 0) {
    console.log('No saved sessions found.');
    process.exit(0);
  }

  console.log('\n🔄 Claude Session Recovery Tool\n');
  console.log('Found the following sessions:\n');

  sessions.forEach((session, index) => {
    const timeSince = getTimeSince(new Date(session.timestamp));
    console.log(`[${index + 1}] Session: ${session.id}`);
    console.log(`    Created: ${timeSince} ago`);
    console.log(`    Directory: ${session.workingDirectory}`);
    console.log(`    Task: ${session.activeTask || 'No active task'}`);
    if (session.lastError) {
      console.log(`    ⚠️  Last Error: ${session.lastError.type} - ${getTimeSince(new Date(session.lastError.timestamp))} ago`);
    }
    console.log(`    Context: ${session.customContext.substring(0, 100)}...`);
    console.log('');
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Select a session to recover (number) or "q" to quit: ', resolve);
  });

  rl.close();

  if (answer.toLowerCase() === 'q') {
    process.exit(0);
  }

  const sessionIndex = parseInt(answer) - 1;
  if (sessionIndex < 0 || sessionIndex >= sessions.length) {
    console.error('Invalid selection.');
    process.exit(1);
  }

  const selectedSession = sessions[sessionIndex];

  console.log('\n📋 Generating recovery context...\n');

  const recoveryContext = await generateRecoveryContext(selectedSession);

  // Save recovery context to a file
  const recoveryFile = path.join(SESSION_STATE_DIR, 'recovery-context.md');
  await fs.writeFile(recoveryFile, recoveryContext);

  console.log(`✅ Recovery context saved to: ${recoveryFile}`);
  console.log('\n📋 Recovery Instructions:\n');
  console.log('1. Start Claude Desktop');
  console.log('2. Open a new conversation');
  console.log('3. Copy and paste the recovery context from the file above');
  console.log('4. Claude will restore your session state and continue where you left off\n');

  // Optionally copy to clipboard
  try {
    await execAsync(`cat "${recoveryFile}" | pbcopy`); // macOS
    console.log('✅ Recovery context copied to clipboard!');
  } catch {
    try {
      await execAsync(`cat "${recoveryFile}" | xclip -selection clipboard`); // Linux
      console.log('✅ Recovery context copied to clipboard!');
    } catch {
      console.log('ℹ️  Could not copy to clipboard automatically.');
    }
  }
}

async function generateRecoveryContext(session: SessionState): Promise<string> {
  let context = `# Session Recovery Context

## Session Information
- **Session ID**: ${session.id}
- **Original Timestamp**: ${new Date(session.timestamp).toISOString()}
- **Working Directory**: ${session.workingDirectory}
`;

  if (session.gitBranch) {
    context += `- **Git Branch**: ${session.gitBranch}\n`;
  }

  if (session.activeTask) {
    context += `\n## Active Task\n${session.activeTask}\n`;
  }

  context += `\n## Original Context\n${session.customContext}\n`;

  if (session.openFiles.length > 0) {
    context += `\n## Open Files\n`;
    for (const file of session.openFiles) {
      context += `- ${file}\n`;
    }
  }

  if (session.recentCommands.length > 0) {
    context += `\n## Recent Commands\n\`\`\`bash\n`;
    context += session.recentCommands.slice(-10).join('\n');
    context += `\n\`\`\`\n`;
  }

  if (session.lastError) {
    context += `\n## Last Error\n`;
    context += `- **Type**: ${session.lastError.type}\n`;
    context += `- **Message**: ${session.lastError.message}\n`;
    context += `- **Time**: ${new Date(session.lastError.timestamp).toISOString()}\n`;
    context += `\n**Note**: The session was interrupted due to API timeouts. Please continue from where we left off.\n`;
  }

  if (session.gitStatus) {
    context += `\n## Git Status at Time of Interruption\n\`\`\`\n${session.gitStatus}\`\`\`\n`;
  }

  context += `\n## Recovery Instructions
1. Change to the working directory: \`cd ${session.workingDirectory}\`
2. Verify the git branch if applicable
3. Review the open files and recent commands
4. Continue with the active task mentioned above
`;

  return context;
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

interface SessionState {
  id: string;
  timestamp: Date;
  workingDirectory: string;
  gitBranch?: string;
  gitStatus?: string;
  openFiles: string[];
  recentCommands: string[];
  environmentVariables: Record<string, string>;
  customContext: string;
  activeTask?: string;
  searchResults?: any[];
  lastError?: {
    type: string;
    message: string;
    timestamp: Date;
  };
}

main().catch(console.error);
