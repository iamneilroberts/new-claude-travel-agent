# Basic Memory System for Claude Code

A local knowledge management system inspired by [basicmachines-co/basic-memory](https://github.com/basicmachines-co/basic-memory) that stores knowledge in Markdown files with frontmatter and enables semantic linking between topics.

## Features

- **Markdown Storage**: Knowledge stored in standard Markdown files with YAML frontmatter
- **Semantic Search**: SQLite FTS (Full-Text Search) for fast content discovery
- **Bidirectional Relations**: Create relationships between knowledge notes
- **Observations**: Track insights with categorized observation methods
- **Local-First**: All data stored locally in files and SQLite database
- **Claude Code Integration**: Designed to work seamlessly with Claude Code workflows

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. The system is ready to use! The convenience script `./bm` will automatically create the knowledge directory and database.

## Usage

### Basic Commands

```bash
# Create a new knowledge note
./bm create "Python Best Practices" "Guidelines for writing clean Python code" --type concept --tags python coding

# Read a knowledge note
./bm read python-best-practices

# Search for notes
./bm search "python coding"

# List all notes
./bm list

# Add an observation to a note
./bm observe python-best-practices "Always use type hints for function parameters" --method experience

# Create a relation between notes
./bm relate python-best-practices clean-code related-to
```

### Note Types

- `project`: Project-specific knowledge
- `concept`: Programming concepts and theories
- `reference`: Reference material and documentation
- `insight`: Personal insights and learnings
- `general`: General knowledge (default)

### Observation Methods

- `experience`: Personal experience or practice
- `research`: From research or documentation
- `discussion`: From conversations or meetings
- `experiment`: From experimentation or testing

## File Structure

```
basic-memory/
├── knowledge/           # Markdown files storage
│   ├── note-id.md      # Individual knowledge notes
│   └── index.db        # SQLite search index
├── basic_memory.py     # Core Python implementation
├── bm                  # Convenience script
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Markdown Format

Each knowledge note is stored as a Markdown file with YAML frontmatter:

```markdown
---
title: "Python Best Practices"
created: 2025-06-04T10:30:00
modified: 2025-06-04T10:30:00
type: concept
tags: ["python", "coding"]
relations:
  related-to: ["clean-code", "software-engineering"]
---

Guidelines for writing clean Python code.

## Key Principles

- Use descriptive variable names
- Follow PEP 8 style guide
- Write docstrings for functions

## Observations

- [experience] Always use type hints for function parameters
- [research] PEP 8 recommends 79 character line limit

## Relations

**related-to**: [[clean-code]], [[software-engineering]]
```

## Integration with Claude Code

This system is designed to work with Claude Code for knowledge management:

1. **Project Knowledge**: Store insights about your codebase
2. **Learning Notes**: Capture new concepts as you learn
3. **Problem Solutions**: Document solutions to coding problems
4. **Code Patterns**: Record useful patterns and practices

### Example Workflow

```bash
# Document a new insight about your project
./bm create "React Component Patterns" "Common patterns for React components in this project" --type project --tags react typescript

# Add observations as you work
./bm observe react-component-patterns "Custom hooks should be prefixed with 'use'" --method experience

# Create relationships between concepts
./bm relate react-component-patterns typescript-patterns related-to

# Search when you need to recall something
./bm search "react hooks"
```

## API Reference

The `BasicMemory` class can also be imported and used directly in Python scripts:

```python
from basic_memory import BasicMemory

bm = BasicMemory("my-knowledge")

# Create a note
note_id = bm.create_note(
    title="My Note",
    content="Note content here",
    note_type="concept",
    tags=["tag1", "tag2"],
    observations=["Initial observation"]
)

# Search notes
results = bm.search_notes("search query")

# Read note content
content = bm.read_note(note_id, format_type="markdown")
```

## Contributing

This is a project-specific implementation of basic-memory concepts. Feel free to extend and modify for your needs.

## License

MIT License - Feel free to use and modify as needed.