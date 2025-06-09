#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Memory cache for performance
const noteCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds cache for debugging
const SEARCH_DEBOUNCE = 1000; // 1 second debounce
let lastSearchTime = 0;

// Cache helper functions
function getCachedData(key) {
    const cached = noteCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    noteCache.delete(key); // Remove expired cache
    return null;
}

function setCachedData(key, data) {
    noteCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (noteCache.size > 100) {
        const now = Date.now();
        for (const [k, v] of noteCache.entries()) {
            if (now - v.timestamp > CACHE_TTL) {
                noteCache.delete(k);
            }
        }
    }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Utility function to execute basic-memory commands
function executeBasicMemoryCommand(args) {
    return new Promise((resolve, reject) => {
        const process = spawn('uvx', ['basic-memory', 'tool', ...args]);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });
    });
}

// Note: Removed memory-bank functionality - now using basic-memory exclusively

// API Routes

// Get list of notes
app.get('/api/notes', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const query = req.query.q || 'travel';  // Use 'travel' as default to get relevant results
        const preview = req.query.preview === 'true'; // Lazy loading flag
        
        // Check cache first
        const cacheKey = `notes:${query}:${limit}:${preview}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Use basic-memory search with pagination
        const output = await executeBasicMemoryCommand(['search-notes', query, '--page-size', limit.toString()]);
        const data = JSON.parse(output);
        
        // Transform the results to match our interface
        const notes = data.results.map(result => {
            let created = null;
            let modified = null;
            
            // Try to get file timestamps since basic-memory doesn't provide them
            if (result.file_path) {
                try {
                    const fullPath = path.join('/home/neil/dev/new-claude-travel-agent/basic-memory/knowledge', result.file_path);
                    if (fs.existsSync(fullPath)) {
                        const stats = fs.statSync(fullPath);
                        created = stats.birthtime.toISOString();
                        modified = stats.mtime.toISOString();
                    }
                } catch (error) {
                    // Ignore file system errors, dates will remain null
                }
            }
            
            return {
                id: result.permalink,
                title: result.title,
                type: result.type,
                tags: [], // basic-memory doesn't expose tags in search results
                created,
                modified: modified || created || new Date().toISOString(),
                preview: preview ? result.content.substring(0, 200) : result.content.substring(0, 100), // Shorter preview for list view
                score: result.score,
                file_path: result.file_path,
                hasFullContent: preview ? false : result.content.length > 100 // Flag for lazy loading
            };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified)); // Sort by modification date descending
        
        // Cache the results
        setCachedData(cacheKey, notes);
        
        res.json(notes);
    } catch (error) {
        console.error('Error loading notes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search notes with caching and debouncing
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        
        // Debounce search requests
        const now = Date.now();
        if (now - lastSearchTime < SEARCH_DEBOUNCE) {
            return res.status(429).json({ error: 'Search too frequent, please wait' });
        }
        lastSearchTime = now;
        
        const limit = parseInt(req.query.limit) || 20;
        
        // Check cache first
        const cacheKey = `search:${query}:${limit}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Use basic-memory search
        const output = await executeBasicMemoryCommand(['search-notes', query, '--page-size', limit.toString()]);
        const data = JSON.parse(output);
        
        // Transform the results to match our interface
        const searchResults = data.results.map(result => {
            let created = null;
            let modified = null;
            
            // Try to get file timestamps since basic-memory doesn't provide them
            if (result.file_path) {
                try {
                    const fullPath = path.join('/home/neil/dev/new-claude-travel-agent/basic-memory/knowledge', result.file_path);
                    if (fs.existsSync(fullPath)) {
                        const stats = fs.statSync(fullPath);
                        created = stats.birthtime.toISOString();
                        modified = stats.mtime.toISOString();
                    }
                } catch (error) {
                    // Ignore file system errors, dates will remain null
                }
            }
            
            return {
                id: result.permalink,
                title: result.title,
                type: result.type,
                tags: [], // basic-memory doesn't expose tags in search results
                created,
                modified,
                preview: result.content.substring(0, 200),
                score: result.score,
                file_path: result.file_path
            };
        });
        
        // Cache search results
        setCachedData(cacheKey, searchResults);
        
        res.json(searchResults);
    } catch (error) {
        console.error('Error searching notes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific note
app.get('/api/notes/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        const format = req.query.format || 'markdown';
        
        // Use basic-memory to read the note (returns markdown, not JSON)
        const output = await executeBasicMemoryCommand(['read-note', noteId]);
        
        if (format === 'json') {
            // Try to parse as JSON, but fallback to markdown content
            try {
                const data = JSON.parse(output);
                res.json(data);
            } catch {
                // If not JSON, return the markdown content wrapped in JSON
                res.json({ content: output, format: 'markdown' });
            }
        } else {
            // Return as plain text markdown
            res.type('text/plain').send(output || 'Note content not available');
        }
    } catch (error) {
        if (error.message.includes('not found')) {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Create new note
app.post('/api/notes', async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        // Add tags to content if provided
        let finalContent = content;
        if (tags && tags.length > 0) {
            finalContent += `\n\nTags: ${tags.join(', ')}`;
        }
        
        // Use basic-memory to create the note
        const output = await executeBasicMemoryCommand(['write-note', '--title', title, '--folder', 'notes', '--content', finalContent]);
        const data = JSON.parse(output);
        
        res.json({ 
            id: data.permalink || data.entity, 
            message: 'Note created successfully',
            permalink: data.permalink
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import session summaries from daemon output (deprecated - auto-import handles this)
app.post('/api/import-sessions', async (req, res) => {
    try {
        // Check for any unimported files
        const sessionDir = '/tmp/claude-sessions';
        
        if (!fs.existsSync(sessionDir)) {
            return res.json({ 
                imported: 0, 
                errors: [],
                message: 'All sessions are already auto-imported by the session watcher. No manual import needed.'
            });
        }
        
        const unimportedFiles = fs.readdirSync(sessionDir)
            .filter(file => file.startsWith('mcp-ready-') && file.endsWith('.txt') && !file.includes('.auto-imported') && !file.includes('.imported'));
        
        if (unimportedFiles.length === 0) {
            return res.json({ 
                imported: 0, 
                errors: [],
                message: 'All sessions are already auto-imported by the session watcher. No manual import needed.'
            });
        }
        
        // If there are actually unimported files, process them
        let imported = 0;
        const errors = [];
        
        for (const filename of unimportedFiles) {
            try {
                const filePath = path.join(sessionDir, filename);
                const content = fs.readFileSync(filePath, 'utf8');
                const sessionData = JSON.parse(content);
                
                if (sessionData.action === 'create_note') {
                    // Import the session summary
                    const output = await executeBasicMemoryCommand([
                        'write-note', 
                        '--title', sessionData.title, 
                        '--folder', 'sessions',
                        '--content', sessionData.content
                    ]);
                    imported++;
                    
                    // Mark file as imported by renaming
                    const importedPath = filePath.replace('.txt', '.imported.txt');
                    fs.renameSync(filePath, importedPath);
                }
            } catch (error) {
                errors.push(`Error importing ${filename}: ${error.message}`);
            }
        }
        
        res.json({ 
            imported, 
            errors,
            message: imported > 0 ? `Successfully imported ${imported} session summaries` : 'All sessions are already auto-imported.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update existing note
app.put('/api/notes/:id', async (req, res) => {
    try {
        const noteId = req.params.id;
        const { title, content, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        // Add tags to content if provided
        let finalContent = content;
        if (tags && tags.length > 0) {
            finalContent += `\n\nTags: ${tags.join(', ')}`;
        }
        
        // Use basic-memory to update the note
        const output = await executeBasicMemoryCommand(['write-note', '--title', title, '--folder', 'notes', '--content', finalContent]);
        const data = JSON.parse(output);
        
        res.json({ 
            id: data.permalink || data.entity, 
            message: 'Note updated successfully',
            permalink: data.permalink
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get session summaries from basic-memory
app.get('/api/session-summaries', async (req, res) => {
    try {
        // Search basic-memory for session summaries (unlimited)
        const output = await executeBasicMemoryCommand(['search-notes', 'Session Summary', '--page-size', '500']);
        const data = JSON.parse(output);
        
        // Transform results to match the interface expected by the UI
        const summaries = data.results.map(result => {
            let created = null;
            let modified = null;
            
            // Try to get file timestamps 
            if (result.file_path) {
                try {
                    const fullPath = path.join('/home/neil/dev/new-claude-travel-agent/basic-memory/knowledge', result.file_path);
                    if (fs.existsSync(fullPath)) {
                        const stats = fs.statSync(fullPath);
                        created = stats.birthtime.toISOString();
                        modified = stats.mtime.toISOString();
                    }
                } catch (error) {
                    // Ignore file system errors, dates will remain null
                }
            }
            
            // Extract size and timestamp from content if available
            let fileSize = 0;
            let timestamp = 'unknown';
            let sessionDate = null;
            
            if (result.content) {
                const sizeMatch = result.content.match(/\*\*File Size:\*\* (\d+)KB/);
                if (sizeMatch) {
                    fileSize = parseInt(sizeMatch[1]) * 1024;
                }
                
                const timestampMatch = result.content.match(/\*\*Timestamp:\*\* (.+)/);
                if (timestampMatch) {
                    timestamp = timestampMatch[1].trim();
                }
                
                // Try to extract the actual session date from Last Modified field in content
                const lastModMatch = result.content.match(/\*\*Last Modified:\*\* (.+)/);
                if (lastModMatch) {
                    try {
                        const dateStr = lastModMatch[1].trim();
                        sessionDate = new Date(dateStr).toISOString();
                    } catch (e) {
                        console.log(`Failed to parse session date: ${lastModMatch[1]}`);
                        // If parsing fails, use file modification date
                    }
                }
            }
            
            return {
                id: result.permalink,
                title: result.title,
                filename: `session-${timestamp}.json`,
                size: fileSize,
                lastModified: sessionDate || modified || created || new Date().toISOString(),
                status: '✅ Available', // All basic-memory sessions are available
                ready_for_import: false, // Already imported
                preview: result.content.substring(0, 200),
                score: result.score
            };
        })
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        res.json({ 
            summaries: summaries,
            available: summaries.length
        });
    } catch (error) {
        console.error('Error loading session summaries from basic-memory:', error);
        res.status(500).json({ error: error.message });
    }
});

// Note: Removed observation and relation endpoints - basic-memory handles these through file editing

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Memory Browser Server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /               - Web interface');
    console.log('  GET  /api/notes      - List notes');
    console.log('  GET  /api/search     - Search notes');
    console.log('  GET  /api/notes/:id  - Get specific note');
    console.log('  POST /api/notes      - Create new note');
    console.log('  PUT  /api/notes/:id  - Update existing note');
    console.log('  GET  /api/session-summaries - Get available session summaries');
    console.log('  POST /api/import-sessions   - Import session summaries from daemon');
});