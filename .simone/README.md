# .simone - Project Management Documentation

## ⚠️ CRITICAL FILES - DO NOT DELETE

This directory contains essential project management documentation including:
- Sprint plans and task specifications
- Architecture decisions and design documents
- Project state tracking and progress reports

## Protection Measures

1. **Git Tracking**: All files are tracked in git
2. **Git Attributes**: Protected with `.gitattributes` settings
3. **Git Ignore**: Explicitly included in `.gitignore` with `!.simone/`
4. **Backup Strategy**: Recoverable from git history if deleted

## Directory Structure

```
.simone/
├── 03_SPRINTS/           # Sprint planning and task tracking
│   └── S06_M01_Automated_Testing_System/  # Current sprint
├── 05_ARCHITECTURE_DECISIONS/  # Technical decisions
└── 10_STATE_OF_PROJECT/        # Project status
```

## Recovery Instructions

If files are accidentally deleted:
```bash
# Find the last commit containing .simone files
git log --name-status -- ".simone/*" | head -20

# Restore from specific commit (replace COMMIT_HASH)
git checkout COMMIT_HASH -- .simone/

# Or restore all .simone files from HEAD
git checkout HEAD -- .simone/
```

## Sprint S06 Status

- **Current Sprint**: S06 - Automated Testing System
- **Progress**: T01-T04 Complete, T05-T07 Pending
- **Next Task**: T05 - Web Dashboard Implementation