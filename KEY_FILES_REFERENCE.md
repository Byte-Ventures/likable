# Likable Codebase - Key Files Reference

## Core Entry Points

### `/src/cli.ts` (77 lines)
- Main CLI entry point executed by `likable` command
- Handles three modes:
  1. `likable` → quick-start mode (minimal prompts, AI generates name)
  2. `likable "description"` → quick-start with description
  3. `likable --wizard` → full interactive wizard
- Auto-detects LIKABLE.md to determine new vs existing project

### `/src/index.ts` (7 lines)
- Package exports for npm usage
- Exports: wizard command, logger, prompts, services, sanitize

## Commands

### `/src/commands/wizard.ts` (762 lines) - MAIN ORCHESTRATOR
**Central nervous system of Likable**

Key functions:
- `wizardCommand(quickStart, description)` - Router function
- `createProjectWizard(quickStart, description)` - Creates new projects
  - Step 1: AI detection (Claude/Gemini)
  - Step 2: Prerequisites check (Docker, Git)
  - Step 3: Project configuration (name, description, features)
  - Step 5: Project scaffolding
  - Step 6: Supabase startup
  - Step 7: Dev server startup (Gemini) or instructions (Claude)
  - Step 8: Write context files (CLAUDE.md, GEMINI.md, LIKABLE.md)
  - Step 9: Launch AI with initial prompt
- `continueWorkingWizard()` - Resumes work on existing LIKABLE.md projects
- `detectProjectFeatures(projectPath)` - Scans package.json for features
- `detectDevPort(projectPath)` - Reads vite.config.ts for port

### `/src/commands/init.ts` (151 lines)
- Direct CLI init command (alternative to wizard)
- Simpler flow without AI involvement
- Manual Supabase/git setup required

### `/src/commands/deploy.ts` (65 lines)
- Deployment orchestration
- Currently only supports Vercel deployment
- Runs `npm run build` then `vercel --prod`

## AI Integration

### `/src/utils/ai-helper.ts` (536 lines)
**Handles all AI operations**

AI Detection:
- `checkClaudeCodeInstalled()` - Runs `claude --version`
- `checkGeminiInstalled()` - Runs `gemini --version`
- `installClaudeCode(projectPath)` - npm install global or local
- `installGemini(projectPath)` - npm install global or local

AI Launching:
- `launchClaudeCode()` - Executes: `claude [args] [initialPrompt]`
  - Permission mode: `--permission-mode acceptEdits` (YOLO)
  - Tools: `--allowedTools Bash(npm:*) Bash(supabase:*) Bash(git:*) ...`
  - stdio: inherit (fully interactive)
  
- `launchGeminiCode()` - Executes: `gemini --model gemini-2.5-flash [args]`
  - Permission mode: `--yolo` (YOLO)
  - Tools: `--allowed-tools bash,read,write,edit,glob,grep,supabase`
  - stdio: inherit (fully interactive)

AI Prompting:
- `generateProjectName()` - Uses AI to suggest 3 project names
- `generateSurpriseDescription()` - Uses AI to generate random app ideas
- `generateProjectSpecification()` - Generates detailed specs (not used in wizard but exported)

### `/src/utils/ai-context.ts` (375 lines)
**Generates AI instruction files**

Key outputs written to disk:
- `CLAUDE.md` - Claude-specific instructions
- `GEMINI.md` - Gemini-specific instructions  
- `LIKABLE.md` - Project-specific development guide
- Initial prompt passed to AI launch

Functions:
- `generateAIContextMd()` - Creates [AI].md content
- `generateAIInitialPrompt()` - Creates launch-time prompt
- `writeAIContextMd()` - Writes [AI].md to disk
- `writeLikableMd()` - Writes LIKABLE.md with 4-phase workflow

**Critical workflow defined in LIKABLE.md**:
- Phase 1: UI Skeleton (components, dummy data, no APIs)
- Phase 2: Visual Completeness (styling, loading/error states)
- Phase 3: Validation Checkpoint (TypeScript/build checks)
- Phase 4: Data Integration (real API calls, Supabase)

## Supabase Integration

### `/src/utils/scaffold.ts` (447 lines)
**Project scaffolding including Supabase setup**

Main function:
- `scaffoldProject(options)` - Complete project creation

Detailed steps:
1. `allocateDevPort()` - Get random available port
2. Create project directory
3. `npm create vite@latest . --template react-ts` - Initialize React
4. Update package.json with dependencies
5. `npm install`
6. `setupSupabase(projectPath)` - Run Supabase init
7. `createSupabaseClient()` - Generate src/lib/supabase.ts
8. `setupTailwind()` - Configure Tailwind if selected
9. `createViteConfig()` - Generate vite.config.ts with port
10. `createEnvFile()` - Create .env.local template
11. `createProjectStructure()` - Create src/ directories
12. `initGitRepository()` - Run git init

### `/src/utils/services.ts` (389 lines)
**ServiceManager class for runtime service orchestration**

ServiceManager:
- `startSupabase()` - Runs `npx supabase start --yes`, extracts credentials
- `stopSupabase()` - Runs `npx supabase stop --no-backup`
- `startDevServer()` - Starts `npm run dev --port` in background
- `updateEnvFile()` - Updates .env.local with live credentials
- `extractSupabaseCredentials()` - Parses JSON or regex extraction
- `keepAlive()` - Handles SIGINT/SIGTERM cleanup

Error handling:
- Detects port conflicts ("port is already allocated")
- Offers to stop conflicting Supabase instances
- Allows user to skip Supabase and continue with dev-only

### `/src/utils/portManager.ts` (287 lines)
**Port allocation and config management**

Port allocation:
- `isPortAvailable(port)` - TCP socket check
- `allocateSupabasePorts()` - Allocate 6 ports for Supabase services
  - Default: api(54321), db(54322), studio(54323), inbucket(54324), analytics(54327), pooler(54329)
  - Alternative: Jump 100 ports if conflicts detected
  - Max 50 attempts
- `allocateDevPort()` - Random port 13337-65535

Configuration:
- `updateSupabaseConfig()` - Regex-based updates to config.toml
- `cleanupSupabaseConfig()` - Remove deprecated keys, disable analytics
- `updateEnvWithPorts()` - Update .env.local with allocated ports

## User Input & Configuration

### `/src/utils/prompts.ts` (168 lines)
**Inquirer prompts for user input**

Prompts:
- `promptProjectConfig()` - Full interactive config:
  - Project name (validation: lowercase, alphanumeric, hyphens only)
  - Description (min 10 chars)
  - User story (optional)
  - Features (checkbox: auth-email, auth-oauth, database, uploads, stripe, realtime)
  - Component library (shadcn, chakra, mui, none)

- `promptFeatureConfig()` - Feature-specific options
- `confirmAction()` - Yes/no confirmation

Config object:
```typescript
interface ProjectConfig {
  name: string;
  description: string;
  userStory?: string;
  features: string[];
  componentLibrary: string;
  typescript: boolean;  // Always true
}
```

## Utilities

### `/src/utils/sanitize.ts` (112 lines)
**Security-focused input sanitization**

Functions:
- `sanitizeUserInput()` - Remove ANSI codes, control chars, normalize whitespace
- `sanitizeForCLI()` - CLI-safe: removes newlines, collapses spaces
- `sanitizeForMarkdown()` - Markdown-safe: preserves newlines

Prevents:
- ANSI escape code injection
- Control character injection
- Zero-width character obfuscation

### `/src/utils/logger.ts` (66 lines)
**Colored terminal logging**

Logger class (singleton):
- `info()`, `success()`, `warning()`, `error()` - Colored logs
- `startSpinner()`, `succeedSpinner()`, `failSpinner()` - Progress spinners
- `header()`, `section()` - Formatted headers
- `code()` - Monospace code formatting
- `blank()` - Empty line

### `/src/utils/first-run.ts` (57 lines)
**First-run welcome message**

Functions:
- `isFirstRun()` - Checks ~/.likable/welcomed flag
- `markWelcomeShown()` - Creates flag file
- `showWelcomeIfNeeded()` - Shows welcome banner on first run

### `/src/utils/constants.ts` (6 lines)
**Shared constants**

- `DEFAULT_DEV_PORT = 13337` - Default Vite dev server port

---

## Generated Files (Created During Scaffolding)

In each new project created by Likable:

### `/LIKABLE.md` (370 lines)
- Project name and description
- Development environment info
- 10 Design & UI/UX principles
- 4-phase development workflow (mandatory for AI)
- Validation workflow (TypeScript checks, build tests, git commits)
- "Build autonomously after SPEC approval" instruction

### `/CLAUDE.md` or `/GEMINI.md`
- AI-specific setup instructions
- Permission mode (YOLO vs Review)
- Dev server info
- Mandatory validation workflow
- Tool whitelisting reminder

### `/.env.local`
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<key-from-supabase-status>
```

### `/vite.config.ts`
- Configured with allocated port (from `allocateDevPort()`)

### `/supabase/config.toml`
- Configured with allocated ports (from `allocateSupabasePorts()`)
- Analytics disabled
- Deprecated keys removed

### `/src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(url, anonKey);
```

### `/.gitignore`
- Excludes: node_modules/, dist/, .env.local, .branches, .temp, etc.

### `/package.json` Updates
- Adds dependencies:
  - @supabase/supabase-js
  - react-router-dom
  - react-markdown
  - Component library (shadcn/chakra/mui)
  - Tailwind (if needed)

---

## Data Flow Summary

```
User Input (via Inquirer)
    ↓
Project Config Object
    ↓
scaffoldProject()
    ├─ Vite initialization
    ├─ Port allocation (portManager)
    ├─ Supabase setup (scaffold + services)
    ├─ Git init
    └─ Context files (ai-context)
    ↓
ServiceManager startup
    ├─ startSupabase() → npx supabase start
    └─ startDevServer() → npm run dev (Gemini only)
    ↓
launchClaudeCode() or launchGeminiCode()
    ├─ CLAUDE.md / GEMINI.md (static)
    ├─ LIKABLE.md (project config)
    └─ Initial prompt (launch-specific)
    ↓
AI Development Loop (inside Claude/Gemini)
    ├─ Create SPEC.md
    ├─ Await user approval
    ├─ Build 4 phases (with mandatory validation)
    ├─ Run: npx tsc --noEmit (after every file)
    ├─ Run: npm run build (after features)
    ├─ Run: git add + commit (mandatory with git)
    └─ Access: Supabase client, npm CLI, git CLI
    ↓
AI exit → ServiceManager cleanup
    └─ stopSupabase()
```

---

## Key Implementation Details

### Prompt Hierarchy
1. **Static Context** (CLAUDE.md / GEMINI.md) - Same for all projects
2. **Project Context** (LIKABLE.md) - Generated per project
3. **Launch Prompt** - One-time initialization instruction
4. **User Feedback** - During SPEC review phase

### Validation Mandatory in LIKABLE.md
```
"After EVERY file change:
- npx tsc --noEmit (TypeScript validation)

After completing a component/feature:
- npm run build (production build validation)
- git add <files> && git commit (version control)"
```

This is **enforced in the context instructions** and treated as part of validation workflow, not optional.

### Feature Detection
- Reads generated package.json to detect which features are installed
- Maps features → tool whitelists (e.g., if supabase feature → allow supabase CLI)
- Both Claude and Gemini receive same feature list for tool consistency

### Port Allocation Strategy
- Avoids hardcoding ports
- Handles conflicts gracefully (jump 100 ports)
- Allows multiple Supabase instances simultaneously
- Random dev server port prevents collisions

