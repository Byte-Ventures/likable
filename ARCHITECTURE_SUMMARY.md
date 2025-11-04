# Likable Architecture Summary

## Quick Navigation

- **`TECHNICAL_OVERVIEW.md`** - Complete technical deep dive (698 lines)
  - System architecture and design decisions
  - Detailed API integration patterns
  - Workflow orchestration flows
  - Security considerations
  
- **`KEY_FILES_REFERENCE.md`** - Quick file reference (337 lines)
  - Each source file's purpose
  - Key functions and their signatures
  - Generated files and their contents
  - Data flow diagrams

- **`README.md`** - User-facing documentation
  - Getting started guide
  - Feature overview
  - Installation instructions

## One-Line Summary

**Likable is a CLI that scaffolds React + Supabase projects and orchestrates AI (Claude Code or Gemini CLI) to build them autonomously with enforced validation workflows (TypeScript checks, build tests, git commits).**

## The Three Components

### 1. Claude/Gemini AI Integration
- **Detection**: Checks if Claude Code or Gemini CLI is installed globally
- **Installation**: Falls back to local npm install if needed
- **Launching**: Passes complete project context via markdown files + initial prompt
- **Permission Model**: YOLO mode (auto-accepts files) or Review mode (requires approval)
- **Tool Whitelisting**: npm, npx, supabase, git, node, open, read, glob, grep
- **Prompt Hierarchy**: Static context → Project context → Launch prompt

### 2. Supabase Integration
- **Port Allocation**: Intelligent allocation with conflict detection (default 54321-54329, alternatives at +100)
- **Setup**: Full initialization via `npx supabase init`, Docker startup, credential extraction
- **Client Generation**: Pre-configured `src/lib/supabase.ts` ready to import
- **Runtime Management**: ServiceManager handles Supabase lifecycle (start/stop)
- **Error Recovery**: Detects conflicts, offers automatic resolution or skip option
- **Database Migrations**: Not auto-generated; AI creates as needed

### 3. Git Integration
- **Initialization**: Detects git, initializes repo, creates .gitignore
- **Workflow Enforcement**: Git commits mandated as validation checkpoints in LIKABLE.md
- **Project Detection**: Checks LIKABLE.md to determine new vs existing project
- **Commit Format**: Conventional commits (feat:, fix:, refactor:, chore:)
- **Key Insight**: Commits are validation checkpoints, not just version control

## Core Workflow (10 Steps)

1. User runs `likable`
2. CLI detects AI (Claude Code or Gemini CLI)
3. Checks prerequisites (Docker, Git)
4. Gets project config from user
5. Scaffolds project (Vite + React + Supabase + Git)
6. Starts services (Supabase, dev server)
7. Writes AI context files (CLAUDE.md, GEMINI.md, LIKABLE.md)
8. Launches AI with initial prompt
9. AI builds 4 phases (UI skeleton → styling → validation → data)
10. Cleanup on exit (stops Supabase)

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/commands/wizard.ts` | 762 | Main orchestrator - the nervous system |
| `src/utils/ai-helper.ts` | 536 | AI detection, installation, launching |
| `src/utils/scaffold.ts` | 447 | Project scaffolding |
| `src/utils/services.ts` | 389 | ServiceManager for runtime orchestration |
| `src/utils/portManager.ts` | 287 | Port allocation and config |
| `src/utils/ai-context.ts` | 375 | Generates instruction files |
| `src/utils/prompts.ts` | 168 | User input prompts |
| `src/utils/sanitize.ts` | 112 | Security: input sanitization |

## Generated Files in New Projects

```
project/
├── LIKABLE.md                 # 4-phase workflow, validation rules
├── CLAUDE.md or GEMINI.md     # AI-specific instructions
├── .env.local                 # Supabase credentials
├── vite.config.ts             # Configured with allocated port
├── supabase/config.toml       # Configured with allocated ports
├── src/lib/supabase.ts        # Pre-configured client
├── .gitignore                 # Standard excludes
└── src/
    ├── components/
    ├── pages/
    ├── hooks/
    ├── types/
    └── utils/
```

## AI Development Phases

**Phase 1**: UI Skeleton (components + dummy data)
**Phase 2**: Visual Completeness (styling + states)
**Phase 3**: Validation Checkpoint (TypeScript/build checks)
**Phase 4**: Data Integration (real APIs + Supabase)

Mandatory validation after EVERY file:
- `npx tsc --noEmit` (TypeScript check)
- `npm run build` (build test)
- `git add && git commit` (if git available)

## Security Patterns

- **Input sanitization** at 3 levels: user input, CLI args, markdown files
- **ANSI escape code removal** to prevent injection
- **Subprocess safety** using execa() with array arguments
- **Configuration as code** to prevent manual errors
- **Graceful error handling** with fallbacks

## Architectural Innovations

1. **Prompt Engineering as Infrastructure**
   - Generates environments instead of generating code
   - Trusts AI to build autonomously within guardrails
   - 3-level prompt hierarchy for context

2. **Port Management**
   - No hardcoded ports (prevents collisions)
   - Adaptive allocation with conflict detection
   - Allows multiple instances simultaneously

3. **Validation as Workflow**
   - Git commits treated as validation checkpoints
   - TypeScript checks mandatory after every file
   - Build tests after every feature
   - Not optional - enforced in instructions

4. **Service Orchestration**
   - ServiceManager handles Supabase + dev server lifecycle
   - Background processes with graceful cleanup
   - SIGINT/SIGTERM handling

## How It All Works Together

```
┌─────────────────────────────────────────┐
│ User launches likable                   │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Likable Orchestrator                    │
│ - Detects AI (Claude/Gemini)            │
│ - Scaffolds project (Vite+React+SB)     │
│ - Allocates ports (smart conflict det.) │
│ - Starts services (Supabase+dev server) │
│ - Generates context files               │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ AI Launch (with complete context)       │
│ - CLAUDE.md / GEMINI.md (static)        │
│ - LIKABLE.md (project-specific)         │
│ - Initial prompt (launch-specific)      │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ AI Development (4 phases)               │
│ - Create SPEC.md for approval           │
│ - Build UI skeleton (with validation)   │
│ - Add styling + states (validate)       │
│ - Integrate real APIs (validate+commit) │
│ - Access: Supabase client, CLI tools    │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Cleanup on Exit                         │
│ - Stop Supabase containers              │
│ - Close dev server                      │
│ - Graceful shutdown                     │
└─────────────────────────────────────────┘
```

## Key Insights

1. **Likable doesn't generate code** - It generates environments and instructions
2. **Git commits are validation checkpoints** - Not just version control
3. **Validation is mandatory** - Enforced via context instructions, not optional
4. **AI is trusted but constrained** - Full autonomy with whitelisted tools
5. **Everything is configurable** - Port allocation, feature selection, component library

## Version Info

- Current: 0.5.4
- License: Apache 2.0
- Package: @byteventures/likable
- Repository: https://github.com/Byte-Ventures/likable

---

For complete details, see:
- **TECHNICAL_OVERVIEW.md** - Deep architectural analysis
- **KEY_FILES_REFERENCE.md** - File-by-file breakdown
