import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { SearchState, SearchPlan } from '../types/index.js';

export class FileStorage {
  private storageDir: string;
  
  constructor() {
    this.storageDir = path.join(process.cwd(), '.search-results');
    this.ensureStorageDir();
  }
  
  private async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
    }
  }
  
  async saveSearchPlan(searchId: string, plan: SearchPlan): Promise<void> {
    try {
      const planPath = path.join(this.storageDir, `${searchId}.plan.json`);
      await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
      logger.debug(`Saved search plan: ${searchId}`);
    } catch (error) {
      logger.error(`Failed to save search plan ${searchId}:`, error);
      throw error;
    }
  }
  
  async loadSearchPlan(searchId: string): Promise<SearchPlan | null> {
    try {
      const planPath = path.join(this.storageDir, `${searchId}.plan.json`);
      const data = await fs.readFile(planPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.debug(`Search plan not found: ${searchId}`);
      return null;
    }
  }
  
  async saveSearchState(searchId: string, state: any): Promise<void> {
    try {
      const statePath = path.join(this.storageDir, `${searchId}.state.json`);
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
      logger.debug(`Saved search state: ${searchId}`);
    } catch (error) {
      logger.error(`Failed to save search state ${searchId}:`, error);
      throw error;
    }
  }
  
  async loadSearchState(searchId: string): Promise<any | null> {
    try {
      const statePath = path.join(this.storageDir, `${searchId}.state.json`);
      const data = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.debug(`Search state not found: ${searchId}`);
      return null;
    }
  }
  
  async saveSearchResults(searchId: string, results: any): Promise<void> {
    try {
      const resultsPath = path.join(this.storageDir, `${searchId}.results.json`);
      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
      logger.debug(`Saved search results: ${searchId}`);
    } catch (error) {
      logger.error(`Failed to save search results ${searchId}:`, error);
      throw error;
    }
  }
  
  async loadSearchResults(searchId: string): Promise<any | null> {
    try {
      const resultsPath = path.join(this.storageDir, `${searchId}.results.json`);
      const data = await fs.readFile(resultsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.debug(`Search results not found: ${searchId}`);
      return null;
    }
  }
  
  async saveHtml(searchId: string, html: string): Promise<void> {
    try {
      const htmlPath = path.join(this.storageDir, `${searchId}.html`);
      await fs.writeFile(htmlPath, html);
      logger.debug(`Saved HTML for search: ${searchId}`);
    } catch (error) {
      logger.error(`Failed to save HTML ${searchId}:`, error);
      throw error;
    }
  }
  
  async loadHtml(searchId: string): Promise<string | null> {
    try {
      const htmlPath = path.join(this.storageDir, `${searchId}.html`);
      return await fs.readFile(htmlPath, 'utf-8');
    } catch (error) {
      logger.debug(`HTML not found: ${searchId}`);
      return null;
    }
  }
  
  async hasHtml(searchId: string): Promise<boolean> {
    try {
      const htmlPath = path.join(this.storageDir, `${searchId}.html`);
      await fs.access(htmlPath);
      return true;
    } catch {
      return false;
    }
  }
  
  async listSearches(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      return files
        .filter(f => f.endsWith('.state.json'))
        .map(f => f.replace('.state.json', ''));
    } catch (error) {
      logger.error('Failed to list searches:', error);
      return [];
    }
  }
}