#!/usr/bin/env node

/**
 * Session Summary Extraction from Claude Code Trace Files
 * 
 * Parses .jsonl trace files from Claude Code sessions and extracts
 * meaningful summaries and metadata for storage in basic-memory.
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract session title from trace file
 */
function extractSessionTitle(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        // Look for summary entries first (Claude Code trace format)
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                
                // Look for summary entries
                if (entry.type === 'summary' && entry.summary) {
                    return {
                        hasTitle: true,
                        title: entry.summary,
                        confidence: 3,
                        source: 'claude_summary'
                    };
                }
            } catch (e) {
                // Skip invalid JSON lines
                continue;
            }
        }
        
        // Fallback: Look for user messages that might contain the session topic
        let bestTitle = null;
        let confidence = 0;
        
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                
                // Look for user messages
                if (entry.type === 'user_message' && entry.content) {
                    const text = entry.content;
                    
                    // Skip very short messages
                    if (text.length < 10) continue;
                    
                    // Look for descriptive first messages
                    if (!bestTitle && text.length > 20 && text.length < 200) {
                        bestTitle = text.substring(0, 100).replace(/\n/g, ' ').trim();
                        confidence = 1;
                    }
                    
                    // Look for messages that start with action words
                    const actionWords = ['implement', 'create', 'fix', 'add', 'update', 'build', 'setup', 'configure'];
                    for (const word of actionWords) {
                        if (text.toLowerCase().startsWith(word)) {
                            bestTitle = text.substring(0, 100).replace(/\n/g, ' ').trim();
                            confidence = 2;
                            break;
                        }
                    }
                    
                    // Break early if we found a high-confidence title
                    if (confidence >= 2) break;
                }
            } catch (e) {
                // Skip invalid JSON lines
                continue;
            }
        }
        
        return {
            hasTitle: !!bestTitle,
            title: bestTitle || `Session ${path.basename(filePath, '.jsonl')}`,
            confidence,
            source: 'user_message'
        };
        
    } catch (error) {
        return {
            hasTitle: false,
            title: `Session ${path.basename(filePath, '.jsonl')}`,
            confidence: 0,
            error: error.message
        };
    }
}

/**
 * Extract metadata from trace file
 */
function extractSessionMetadata(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        let userMessages = 0;
        let assistantMessages = 0;
        let toolCalls = 0;
        let errors = 0;
        let firstMessage = null;
        let lastMessage = null;
        
        // Parse each line to gather statistics
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                
                if (entry.type === 'user_message') {
                    userMessages++;
                    if (!firstMessage) firstMessage = entry.timestamp;
                    lastMessage = entry.timestamp;
                }
                
                if (entry.type === 'assistant_message') {
                    assistantMessages++;
                    if (!firstMessage) firstMessage = entry.timestamp;
                    lastMessage = entry.timestamp;
                }
                
                if (entry.type === 'tool_call') {
                    toolCalls++;
                }
                
                if (entry.type === 'error') {
                    errors++;
                }
                
            } catch (e) {
                // Skip invalid JSON lines
                continue;
            }
        }
        
        // Extract preview from first few user messages
        let preview = '';
        let previewLines = 0;
        for (const line of lines) {
            if (previewLines >= 3) break;
            
            try {
                const entry = JSON.parse(line);
                if (entry.type === 'user_message' && entry.content) {
                    if (preview) preview += ' ... ';
                    preview += entry.content.substring(0, 100).replace(/\n/g, ' ').trim();
                    previewLines++;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (preview.length > 300) {
            preview = preview.substring(0, 300) + '...';
        }
        
        return {
            filename: path.basename(filePath),
            filepath: filePath,
            fileSize: stats.size,
            lastModified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
            lineCount: lines.length,
            userMessages,
            assistantMessages,
            toolCalls,
            errors,
            firstMessage,
            lastMessage,
            preview: preview || 'No preview available'
        };
        
    } catch (error) {
        return {
            filename: path.basename(filePath),
            filepath: filePath,
            error: error.message,
            preview: 'Error reading file'
        };
    }
}

/**
 * Generate session summary combining title and metadata
 */
function generateSessionSummary(sessionData, titleData) {
    // Create timestamp from filename or metadata
    let timestamp = 'unknown';
    
    // Try to extract timestamp from filename (format: uuid.jsonl)
    const filenameMatch = sessionData.filename.match(/^([a-f0-9-]+)\.jsonl$/);
    if (filenameMatch) {
        timestamp = filenameMatch[1];
    }
    
    // If we have actual message timestamps, use the first one
    if (sessionData.firstMessage) {
        const date = new Date(sessionData.firstMessage);
        if (!isNaN(date.getTime())) {
            timestamp = date.toISOString().replace(/[:.]/g, '-').replace('T', '-').substring(0, 19);
        }
    }
    
    // Generate tags based on content analysis
    const tags = ['auto-extracted', 'claude-code-session'];
    
    if (sessionData.toolCalls > 0) tags.push('tool-usage');
    if (sessionData.errors > 0) tags.push('contains-errors');
    if (sessionData.userMessages > 10) tags.push('long-session');
    if (titleData.title.toLowerCase().includes('fix')) tags.push('bug-fix');
    if (titleData.title.toLowerCase().includes('implement')) tags.push('implementation');
    if (titleData.title.toLowerCase().includes('create')) tags.push('creation');
    
    return {
        title: titleData.title,
        timestamp,
        filename: sessionData.filename,
        fileSize: sessionData.fileSize,
        lastModified: sessionData.lastModified,
        preview: sessionData.preview,
        tags,
        source: 'claude-trace-jsonl',
        stats: {
            userMessages: sessionData.userMessages,
            assistantMessages: sessionData.assistantMessages,
            toolCalls: sessionData.toolCalls,
            errors: sessionData.errors,
            lineCount: sessionData.lineCount
        }
    };
}

module.exports = {
    extractSessionTitle,
    extractSessionMetadata,
    generateSessionSummary
};

// CLI interface for testing
if (require.main === module) {
    const filePath = process.argv[2];
    
    if (!filePath) {
        console.log('Usage: node extract-session-summary.js <trace-file.jsonl>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
    }
    
    console.log('Extracting session summary from:', filePath);
    
    const titleData = extractSessionTitle(filePath);
    const sessionData = extractSessionMetadata(filePath);
    const summary = generateSessionSummary(sessionData, titleData);
    
    console.log('\nTitle Data:', JSON.stringify(titleData, null, 2));
    console.log('\nSession Data:', JSON.stringify(sessionData, null, 2));
    console.log('\nSummary:', JSON.stringify(summary, null, 2));
}