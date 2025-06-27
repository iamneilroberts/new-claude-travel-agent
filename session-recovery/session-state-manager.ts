import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

interface SessionRecoveryConfig {
  stateDir: string;
  maxSessionAge: number; // in hours
  autoSaveInterval: number; // in minutes
}

export class SessionStateManager {
  private config: SessionRecoveryConfig;
  private sessionStates: Map<string, SessionState> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: SessionRecoveryConfig) {
    this.config = config;
    this.ensureStateDirectory();
    this.startAutoSave();
  }

  private async ensureStateDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.stateDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create state directory:', error);
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      await this.saveAllSessions();
    }, this.config.autoSaveInterval * 60 * 1000);
  }

  async createSession(id: string, customContext: string): Promise<SessionState> {
    const session: SessionState = {
      id,
      timestamp: new Date(),
      workingDirectory: process.cwd(),
      openFiles: [],
      recentCommands: [],
      environmentVariables: this.captureEnvironment(),
      customContext,
    };

    // Capture git information
    try {
      const { stdout: branch } = await execAsync('git branch --show-current');
      session.gitBranch = branch.trim();

      const { stdout: status } = await execAsync('git status --porcelain');
      session.gitStatus = status;
    } catch (error) {
      // Not a git repository or git not available
    }

    this.sessionStates.set(id, session);
    await this.saveSession(session);

    return session;
  }

  async updateSession(id: string, updates: Partial<SessionState>): Promise<void> {
    const session = this.sessionStates.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    Object.assign(session, updates, { timestamp: new Date() });
    await this.saveSession(session);
  }

  async addCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessionStates.get(sessionId);
    if (!session) return;

    session.recentCommands.push(command);
    if (session.recentCommands.length > 50) {
      session.recentCommands.shift();
    }

    await this.saveSession(session);
  }

  async addOpenFile(sessionId: string, filePath: string): Promise<void> {
    const session = this.sessionStates.get(sessionId);
    if (!session) return;

    if (!session.openFiles.includes(filePath)) {
      session.openFiles.push(filePath);
    }

    await this.saveSession(session);
  }

  async recordError(sessionId: string, error: SessionState['lastError']): Promise<void> {
    const session = this.sessionStates.get(sessionId);
    if (!session) return;

    session.lastError = error;
    await this.saveSession(session);
  }

  private captureEnvironment(): Record<string, string> {
    const relevantVars = [
      'CRUISEPLANNER_LOGIN',
      'CRUISEPLANNER_PASSWORD',
      'DELTA_AGENCY_ID',
      'DELTA_USER_ID',
      'DELTA_PASSWORD',
      'DISPLAY',
      'PATH',
      'NODE_ENV',
    ];

    const env: Record<string, string> = {};
    for (const varName of relevantVars) {
      if (process.env[varName]) {
        env[varName] = varName.includes('PASSWORD') ? '***' : process.env[varName]!;
      }
    }

    return env;
  }

  private async saveSession(session: SessionState): Promise<void> {
    const filePath = path.join(this.config.stateDir, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  private async saveAllSessions(): Promise<void> {
    for (const session of this.sessionStates.values()) {
      await this.saveSession(session);
    }
  }

  async loadSessions(): Promise<SessionState[]> {
    const files = await fs.readdir(this.config.stateDir);
    const sessions: SessionState[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.config.stateDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(content) as SessionState;

        // Check if session is not too old
        const sessionAge = Date.now() - new Date(session.timestamp).getTime();
        const maxAge = this.config.maxSessionAge * 60 * 60 * 1000;

        if (sessionAge < maxAge) {
          sessions.push(session);
          this.sessionStates.set(session.id, session);
        } else {
          // Clean up old session files
          await fs.unlink(filePath);
        }
      } catch (error) {
        console.error(`Failed to load session ${file}:`, error);
      }
    }

    return sessions;
  }

  async getSession(id: string): Promise<SessionState | undefined> {
    return this.sessionStates.get(id);
  }

  async getAllSessions(): Promise<SessionState[]> {
    return Array.from(this.sessionStates.values());
  }

  async deleteSession(id: string): Promise<void> {
    this.sessionStates.delete(id);
    const filePath = path.join(this.config.stateDir, `${id}.json`);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }

  async cleanup(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    await this.saveAllSessions();
  }
}
