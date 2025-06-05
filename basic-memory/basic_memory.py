#!/usr/bin/env python3
"""
Basic Memory System for Claude Code
A local knowledge management system that stores knowledge in Markdown files
with frontmatter and enables semantic linking between topics.
"""

import os
import json
import sqlite3
import yaml
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import re

class BasicMemory:
    def __init__(self, knowledge_dir: str = "knowledge"):
        self.knowledge_dir = Path(knowledge_dir)
        self.knowledge_dir.mkdir(exist_ok=True)
        
        # Initialize SQLite database for indexing
        self.db_path = self.knowledge_dir / "index.db"
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for search indexing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT,
            content TEXT,
            created TEXT,
            modified TEXT,
            tags TEXT,  -- JSON array
            observations TEXT,  -- JSON array
            relations TEXT  -- JSON object
        )
        ''')
        
        cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            id, title, content, tags, observations, content=notes
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_note(self, title: str, content: str, note_type: str = "general", 
                   tags: List[str] = None, observations: List[str] = None) -> str:
        """Create a new knowledge note"""
        if tags is None:
            tags = []
        if observations is None:
            observations = []
            
        # Generate note ID from title
        note_id = re.sub(r'[^a-z0-9]', '-', title.lower()).strip('-')
        note_path = self.knowledge_dir / f"{note_id}.md"
        
        # Create note data
        now = datetime.now().isoformat()
        note_data = {
            'title': title,
            'created': now,
            'modified': now,
            'type': note_type,
            'tags': tags,
            'relations': {}
        }
        
        # Generate markdown content
        frontmatter = yaml.dump(note_data, default_flow_style=False)
        
        markdown_content = f"---\n{frontmatter}---\n\n{content}\n\n"
        
        if observations:
            markdown_content += "## Observations\n\n"
            for obs in observations:
                markdown_content += f"- {obs}\n"
            markdown_content += "\n"
        
        # Write to file
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        # Update database index
        self.update_index(note_id, note_data, content, observations)
        
        return note_id
    
    def read_note(self, note_id: str, format_type: str = "markdown") -> Optional[str]:
        """Read a knowledge note"""
        note_path = self.knowledge_dir / f"{note_id}.md"
        
        if not note_path.exists():
            return None
        
        with open(note_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if format_type == "json":
            # Parse frontmatter and return as JSON
            parts = content.split('---', 2)
            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                body = parts[2].strip()
                
                # Parse observations from markdown
                observations = []
                if "## Observations" in body:
                    obs_section = body.split("## Observations")[1].split("##")[0]
                    for line in obs_section.split('\n'):
                        if line.strip().startswith('- '):
                            observations.append(line.strip()[2:])
                
                return json.dumps({
                    'id': note_id,
                    'frontmatter': frontmatter,
                    'content': body,
                    'observations': observations
                }, indent=2)
        
        return content
    
    def search_notes(self, query: str, note_type: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Search knowledge notes"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if note_type:
            cursor.execute('''
            SELECT n.id, n.title, n.type, n.tags, n.created, n.modified
            FROM notes_fts fts
            JOIN notes n ON n.id = fts.id
            WHERE notes_fts MATCH ? AND n.type = ?
            ORDER BY rank
            LIMIT ?
            ''', (query, note_type, limit))
        else:
            cursor.execute('''
            SELECT n.id, n.title, n.type, n.tags, n.created, n.modified
            FROM notes_fts fts
            JOIN notes n ON n.id = fts.id
            WHERE notes_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            ''', (query, limit))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'title': row[1],
                'type': row[2],
                'tags': json.loads(row[3]) if row[3] else [],
                'created': row[4],
                'modified': row[5]
            })
        
        conn.close()
        return results
    
    def add_observation(self, note_id: str, observation: str, method: Optional[str] = None) -> bool:
        """Add an observation to an existing note"""
        note_path = self.knowledge_dir / f"{note_id}.md"
        
        if not note_path.exists():
            return False
        
        with open(note_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Format observation with method if provided
        formatted_obs = f"[{method}] {observation}" if method else observation
        
        # Add observation to markdown
        if "## Observations" in content:
            # Insert before the observations section
            parts = content.split("## Observations")
            observations_section = parts[1]
            new_obs_line = f"- {formatted_obs}\n"
            
            # Find the end of observations section
            lines = observations_section.split('\n')
            insert_index = 1  # After the header
            for i, line in enumerate(lines[1:], 1):
                if line.strip() and not line.startswith('- '):
                    break
                insert_index = i + 1
            
            lines.insert(insert_index, new_obs_line.rstrip())
            parts[1] = '\n'.join(lines)
            content = "## Observations".join(parts)
        else:
            # Add observations section
            content += f"\n## Observations\n\n- {formatted_obs}\n"
        
        # Update frontmatter modified time
        parts = content.split('---', 2)
        if len(parts) >= 3:
            frontmatter = yaml.safe_load(parts[1])
            frontmatter['modified'] = datetime.now().isoformat()
            updated_frontmatter = yaml.dump(frontmatter, default_flow_style=False)
            content = f"---\n{updated_frontmatter}---{parts[2]}"
        
        # Write back to file
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Update database index
        self.reindex_note(note_id)
        
        return True
    
    def create_relation(self, from_note_id: str, to_note_id: str, relation_type: str) -> bool:
        """Create a relation between two notes"""
        from_path = self.knowledge_dir / f"{from_note_id}.md"
        to_path = self.knowledge_dir / f"{to_note_id}.md"
        
        if not (from_path.exists() and to_path.exists()):
            return False
        
        # Update from_note
        self.add_relation_to_note(from_note_id, to_note_id, relation_type)
        
        # Update to_note with reverse relation
        reverse_relation = f"{relation_type}-reverse"
        self.add_relation_to_note(to_note_id, from_note_id, reverse_relation)
        
        return True
    
    def add_relation_to_note(self, note_id: str, target_id: str, relation_type: str):
        """Add a relation to a note's frontmatter"""
        note_path = self.knowledge_dir / f"{note_id}.md"
        
        with open(note_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse and update frontmatter
        parts = content.split('---', 2)
        if len(parts) >= 3:
            frontmatter = yaml.safe_load(parts[1])
            
            if 'relations' not in frontmatter:
                frontmatter['relations'] = {}
            
            if relation_type not in frontmatter['relations']:
                frontmatter['relations'][relation_type] = []
            
            if target_id not in frontmatter['relations'][relation_type]:
                frontmatter['relations'][relation_type].append(target_id)
            
            frontmatter['modified'] = datetime.now().isoformat()
            
            updated_frontmatter = yaml.dump(frontmatter, default_flow_style=False)
            content = f"---\n{updated_frontmatter}---{parts[2]}"
            
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Update database index
            self.reindex_note(note_id)
    
    def list_notes(self, note_type: Optional[str] = None, limit: int = 20) -> List[Dict]:
        """List all knowledge notes"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if note_type:
            cursor.execute('''
            SELECT id, title, type, tags, created, modified
            FROM notes
            WHERE type = ?
            ORDER BY modified DESC
            LIMIT ?
            ''', (note_type, limit))
        else:
            cursor.execute('''
            SELECT id, title, type, tags, created, modified
            FROM notes
            ORDER BY modified DESC
            LIMIT ?
            ''', (limit,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'title': row[1],
                'type': row[2],
                'tags': json.loads(row[3]) if row[3] else [],
                'created': row[4],
                'modified': row[5]
            })
        
        conn.close()
        return results
    
    def update_index(self, note_id: str, frontmatter: Dict, content: str, observations: List[str]):
        """Update search index for a note"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Prepare data
        tags_json = json.dumps(frontmatter.get('tags', []))
        observations_json = json.dumps(observations)
        relations_json = json.dumps(frontmatter.get('relations', {}))
        
        # Insert or replace in main table
        cursor.execute('''
        INSERT OR REPLACE INTO notes 
        (id, title, type, content, created, modified, tags, observations, relations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (note_id, frontmatter['title'], frontmatter['type'], content,
              frontmatter['created'], frontmatter['modified'], 
              tags_json, observations_json, relations_json))
        
        # Update FTS table
        cursor.execute('''
        INSERT OR REPLACE INTO notes_fts (id, title, content, tags, observations)
        VALUES (?, ?, ?, ?, ?)
        ''', (note_id, frontmatter['title'], content, 
              ' '.join(frontmatter.get('tags', [])), 
              ' '.join(observations)))
        
        conn.commit()
        conn.close()
    
    def reindex_note(self, note_id: str):
        """Reindex a specific note"""
        note_path = self.knowledge_dir / f"{note_id}.md"
        
        if not note_path.exists():
            return
        
        with open(note_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse frontmatter and content
        parts = content.split('---', 2)
        if len(parts) >= 3:
            frontmatter = yaml.safe_load(parts[1])
            body = parts[2].strip()
            
            # Parse observations from markdown
            observations = []
            if "## Observations" in body:
                obs_section = body.split("## Observations")[1].split("##")[0]
                for line in obs_section.split('\n'):
                    if line.strip().startswith('- '):
                        observations.append(line.strip()[2:])
            
            self.update_index(note_id, frontmatter, body, observations)


def main():
    parser = argparse.ArgumentParser(description='Basic Memory System for Claude Code')
    parser.add_argument('--knowledge-dir', default='knowledge', 
                       help='Directory to store knowledge files')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create note command
    create_parser = subparsers.add_parser('create', help='Create a new knowledge note')
    create_parser.add_argument('title', help='Title of the note')
    create_parser.add_argument('content', help='Content of the note')
    create_parser.add_argument('--type', default='general', 
                              choices=['project', 'concept', 'reference', 'insight', 'general'],
                              help='Type of note')
    create_parser.add_argument('--tags', nargs='*', default=[], help='Tags for the note')
    create_parser.add_argument('--observations', nargs='*', default=[], 
                              help='Initial observations')
    
    # Read note command
    read_parser = subparsers.add_parser('read', help='Read a knowledge note')
    read_parser.add_argument('note_id', help='ID of the note to read')
    read_parser.add_argument('--format', choices=['markdown', 'json'], default='markdown',
                            help='Output format')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search knowledge notes')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('--type', help='Filter by note type')
    search_parser.add_argument('--limit', type=int, default=10, help='Maximum results')
    
    # Add observation command
    obs_parser = subparsers.add_parser('observe', help='Add observation to a note')
    obs_parser.add_argument('note_id', help='ID of the note')
    obs_parser.add_argument('observation', help='Observation to add')
    obs_parser.add_argument('--method', help='Method of observation')
    
    # Create relation command
    rel_parser = subparsers.add_parser('relate', help='Create relation between notes')
    rel_parser.add_argument('from_note', help='Source note ID')
    rel_parser.add_argument('to_note', help='Target note ID')
    rel_parser.add_argument('relation_type', help='Type of relation')
    
    # List notes command
    list_parser = subparsers.add_parser('list', help='List knowledge notes')
    list_parser.add_argument('--type', help='Filter by note type')
    list_parser.add_argument('--limit', type=int, default=20, help='Maximum results')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize basic memory system
    bm = BasicMemory(args.knowledge_dir)
    
    if args.command == 'create':
        note_id = bm.create_note(args.title, args.content, args.type, 
                                args.tags, args.observations)
        print(f"Created note: {note_id}")
        
    elif args.command == 'read':
        content = bm.read_note(args.note_id, args.format)
        if content:
            print(content)
        else:
            print(f"Note '{args.note_id}' not found")
            
    elif args.command == 'search':
        results = bm.search_notes(args.query, args.type, args.limit)
        if results:
            print(f"Found {len(results)} notes:")
            for i, note in enumerate(results, 1):
                print(f"{i}. {note['title']} ({note['id']}) - {note['type']}")
                print(f"   Tags: {', '.join(note['tags'])}")
                print(f"   Modified: {note['modified']}")
                print()
        else:
            print("No notes found")
            
    elif args.command == 'observe':
        if bm.add_observation(args.note_id, args.observation, args.method):
            print(f"Added observation to {args.note_id}")
        else:
            print(f"Note '{args.note_id}' not found")
            
    elif args.command == 'relate':
        if bm.create_relation(args.from_note, args.to_note, args.relation_type):
            print(f"Created relation: {args.from_note} --[{args.relation_type}]--> {args.to_note}")
        else:
            print("One or both notes not found")
            
    elif args.command == 'list':
        results = bm.list_notes(args.type, args.limit)
        if results:
            print(f"Found {len(results)} notes:")
            for i, note in enumerate(results, 1):
                print(f"{i}. {note['title']} ({note['id']}) - {note['type']}")
                print(f"   Tags: {', '.join(note['tags'])}")
                print(f"   Modified: {note['modified']}")
                print()
        else:
            print("No notes found")


if __name__ == '__main__':
    main()