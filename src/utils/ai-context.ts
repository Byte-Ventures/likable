import { ProjectConfig } from './prompts.js';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { sanitizeForMarkdown } from './sanitize.js';

export type AIType = 'claude' | 'gemini';

/**
 * Generate AI context markdown content (CLAUDE.md or GEMINI.md) based on project configuration
 */
export function generateAIContextMd(
  aiType: AIType,
  config: ProjectConfig,
  port: number = 13337,
  autoAccept: boolean = true,
  hasGit: boolean = false
): string {
  const aiName = aiType === 'claude' ? 'Claude Code' : 'Gemini CLI';
  const permissionMode = autoAccept ? 'YOLO mode' : 'Review mode';

  const devServerInstructions = aiType === 'claude'
    ? `- **Development Server:** Run \`npm run dev\` to start the server on http://localhost:${port}`
    : `- **Development Server:** Already running at http://localhost:${port}`;

  return `# ${aiName} Context for ${config.name}

**Load these files to understand the project:**

1. 📄 **README.md** - Project overview and description
2. 🛠️ **LIKABLE.md** - Technical guide and best practices

## Quick Info

- **Permission Mode:** ${permissionMode}${autoAccept ? ' (freely create, edit, delete files - no confirmation needed)' : ' (user confirms each file change)'}
${devServerInstructions}
- **Project Type:** React + ${config.typescript ? 'TypeScript' : 'JavaScript'} + Supabase

## Your Mission

Read README.md and LIKABLE.md to understand what to build, then start implementing based on the project requirements.

## Development Approach

**CRITICAL: Build UI-first, then add functionality.**

Do NOT implement business logic before UI. Follow this sequence:
1. Layout skeleton with dummy data → visually complete UI → data integration
2. This catches errors early and lets the user see progress
3. Use TypeScript interfaces for dummy data (not throwaway code)
4. See LIKABLE.md for detailed phase breakdown

${hasGit ? `## Git Version Control

The project has been initialized with git. Use version control appropriately:

**When to commit:**
- After completing each major feature or component
- After fixing bugs
- Before making significant refactors
- At logical checkpoints in your work

**Commit workflow:**
1. \`git add <files>\` - Stage files you modified
2. \`git commit -m "descriptive message"\` - Commit with clear message
3. Use conventional commit format: "feat:", "fix:", "refactor:", etc.

**Don't commit:**
- \`.env.local\` files (already in .gitignore)
- \`node_modules/\` (already in .gitignore)
- Temporary or generated files

` : ''}## Validation (MANDATORY - NOT OPTIONAL!)

${aiType === 'claude' ? `**YOU MUST RUN THESE COMMANDS:**

After EVERY file change:
- \`npx tsc --noEmit\` - TypeScript validation

After completing a component/feature:
- \`npm run build\` - Verify production build works${hasGit ? `
- \`git add <files>\` - Stage your changes
- \`git commit -m "feat: description"\` - Commit with conventional format` : ''}

**CRITICAL RULES:**
- Run TypeScript validation after EVERY file you create or modify
- Run build check after completing each component or feature${hasGit ? `
- Commit your work after each completed feature/component` : ''}
- Watch your dev server terminal for compilation errors
- If you see errors, STOP and fix them immediately

**Expected Warnings (can be ignored):**
- Tailwind "no utility classes detected" during Phase 1 (before styling)` : `**YOU MUST RUN THESE COMMANDS:**

After EVERY file change:
1. \`npx tsc --noEmit\` - TypeScript validation
2. \`tail -20 dev-server.log\` - Check compilation

After completing a component/feature:
3. \`npm run build\` - Verify production build works${hasGit ? `
4. \`git add <files>\` - Stage your changes
5. \`git commit -m "feat: description"\` - Commit with conventional format` : ''}

**CRITICAL RULES:**
- Run TypeScript validation after EVERY file you create or modify
- Run build check after completing each component or feature${hasGit ? `
- Commit your work after each completed feature/component` : ''}
- If you see errors, STOP and fix them immediately

**Expected Warnings (can be ignored):**
- Tailwind "no utility classes detected" during Phase 1 (before styling)`}

${autoAccept ? '**YOLO MODE ACTIVE** - You can run npm, npx, supabase, git, and node commands WITHOUT ASKING. Just do it!' : '**REVIEW MODE ACTIVE** - Ask before making file changes or running commands.'}
`;
}

/**
 * Generate initial command-line prompt for AI assistant (for NEW projects)
 */
export function generateAIInitialPrompt(
  aiType: AIType,
  config: ProjectConfig,
  port: number = 13337,
  hasSupabase: boolean = true
): string {
  const devServerCmd = aiType === 'claude'
    ? `Start the dev server with \`npm run dev\`.`
    : `Dev server will be started in the approval workflow.`;

  return `${devServerCmd}

Read README.md and LIKABLE.md, then follow this workflow:

${hasSupabase ? `**Step 1: Start Supabase (if needed)**
Check if .env.local contains "your-anon-key-here" as the VITE_SUPABASE_ANON_KEY value.

If it does (placeholder detected):
1. Run \`npx supabase start\` in the background
2. Wait for it to complete (this may take 2-3 minutes on first run)
3. Run \`npx supabase status\` to get the credentials
4. Update .env.local with the real API URL and anon key from the output
5. Confirm Supabase is running

If .env.local already has real credentials, skip this step.

**Step 2: Create SPEC.md**` : `**Step 1: Create SPEC.md**`}
Create a simple specification covering:
1. What the user should be able to do (3-5 core features, from user perspective)
2. How it should look and feel (lovable, fresh, modern, appealing)

Keep it high-level - NO technical implementation details. Save to SPEC.md.

${hasSupabase ? `**Step 3: Get User Approval for SPEC.md**` : `**Step 2: Get User Approval for SPEC.md**`}
CRITICAL: You MUST get user approval before building anything!

1. Create \`src/pages/SpecReview.tsx\`:
   - Import SPEC.md as a module: \`import specContent from '/SPEC.md?raw'\`
   - Import and use react-markdown to render the imported content
   - Display content in a clean, centered layout with good typography
   - Add a header "Project Specification - Review"
   - Style it nicely with Tailwind (if using Tailwind) or component library
   - IMPORTANT: Use the import approach (not fetch) so Vite HMR auto-refreshes when SPEC.md changes

2. Update \`src/App.tsx\`:
   - Import and render the SpecReview component
   - Make it the only thing displayed initially

3. ${aiType === 'claude'
     ? 'The dev server is already running. Open the browser:'
     : 'Start the dev server with \`npm run dev\` in the background, then:'}
   - Run: \`open http://localhost:${port}\` (to launch browser)
   - Display in terminal: "📋 Please review the specification in your browser"
   - Display in terminal: "✓ Type 'approved' to continue building"
   - Display in terminal: "✎ Or provide feedback for changes"

4. Wait for user input:
   - If user types "approved": Remove SpecReview component, restore App.tsx to default, ${hasSupabase ? 'proceed to Step 4' : 'proceed to Step 3'}
   - If user provides feedback: Update SPEC.md based on feedback (Vite HMR will auto-refresh the browser), ask again
   - Repeat until approved

${hasSupabase ? `**Step 4: Build UI-FIRST (only after SPEC approval)**` : `**Step 3: Build UI-FIRST (only after SPEC approval)**`}
IMPORTANT: Once SPEC is approved, DO NOT pause to ask the user for permission or if you should continue. Just build the entire application autonomously according to the approved specification. Work through all phases systematically until the MVP is complete.

Follow these phases:
1. Create the visual layout with typed dummy data (${hasSupabase ? 'NO Supabase calls yet' : 'NO API calls yet'})
2. Make it visually complete with loading/error/empty states
3. Validate exports and run \`npx tsc --noEmit\` to check for errors
4. Wire up real ${hasSupabase ? 'Supabase integration (Supabase is running with credentials in .env.local)' : 'business logic and data integration'}

Start with Phase 1 - the UI skeleton and continue through all phases without stopping.

CRITICAL: After EVERY file you create or modify, you MUST run \`npx tsc --noEmit\` and fix any errors before continuing. No exceptions. If you skip this, your code WILL break.`;
}

/**
 * Write AI context file (CLAUDE.md or GEMINI.md) to project directory
 */
export async function writeAIContextMd(
  aiType: AIType,
  projectPath: string,
  config: ProjectConfig,
  port: number = 13337,
  autoAccept: boolean = true,
  hasGit: boolean = false
): Promise<void> {
  try {
    const content = generateAIContextMd(aiType, config, port, autoAccept, hasGit);
    const fileName = aiType.toUpperCase() + '.md';
    const filePath = path.join(projectPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
    logger.success(`Created ${fileName} with project context`);
  } catch (error) {
    const fileName = aiType.toUpperCase() + '.md';
    logger.warning(`Could not create ${fileName} file`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}

/**
 * Write LIKABLE.md with build instructions for AI assistant
 */
export async function writeLikableMd(
  aiType: AIType,
  projectPath: string,
  config: ProjectConfig,
  port: number = 13337,
  hasGit: boolean = false
): Promise<void> {
  try {
    // Sanitize user input to prevent escape code issues in markdown files
    const sanitizedDescription = sanitizeForMarkdown(config.description);
    const sanitizedUserStory = config.userStory ? sanitizeForMarkdown(config.userStory) : '';

    const content = `# ${config.name} - Development Guide

## Project Description

${sanitizedDescription}${sanitizedUserStory && sanitizedUserStory.trim().length > 0 ? `\n\n**Additional Requirements:** ${sanitizedUserStory}` : ''}

## Development Environment

- **Dev Server:** http://localhost:${port}
- **Browser:** Open http://localhost:${port} to see the app as you work

## Working Guidelines

**Communication:**
- Be verbose! Explain what you're doing at each step so the user understands your progress
- Throughout the build process, explain what you're creating and why
- Keep the user informed of your progress

**Specification:**
- A simple user-focused specification is in SPEC.md (created during initialization)
- SPEC.md describes what users should be able to do and how it should look/feel
- NO technical details - just user perspective and style guidelines

**Design & UI/UX Principles:**

1. **Design System First** - Use theme tokens (colors, spacing, typography) consistently. Never override with inline styles.

2. **Responsive Layout** - Mobile-first with breakpoints (≥768px tablets, ≥1024px desktops). Use consistent container padding.

3. **Visual Hierarchy** - Primary actions prominent, secondary subdued, destructive in danger color. One H1 per page.

4. **Accessibility (A11y)** - AA contrast ratios, rem-based fonts, keyboard navigation, focus states. Never remove outline without replacement.

5. **User Feedback** - Loading, success, error states for ALL async actions. Confirm destructive actions with modals.

6. **Form Design** - Group related inputs, consistent label alignment, required field indicators, inline validation on blur/submit.

7. **Navigation** - Limited items, active state styling, consistent placement. Use library nav components.

8. **React Structure** - Organize by feature, containers handle data, presentational components stateless. Use memoization sparingly.

9. **Library-First** - Use built-in components before custom. Extend theme via library's theming API.

10. **Prohibited Practices:**
    - Hard-coded colors/spacing/fonts bypassing theme
    - Missing alt text, aria labels on images/icons/buttons
    - Supabase calls in render without useEffect guards
    - Omitting loading/empty states
    - Using \`any\` types or ignoring TypeScript errors

**Development Phases (Follow This Order!):**

**CRITICAL: Build UI-first, then add functionality. Do NOT implement business logic before UI.**

**IMPORTANT: Once SPEC.md is approved, work through ALL phases autonomously without pausing to ask for permission or if you should continue. Complete the entire MVP according to the approved specification.**

1. **Phase 1 - UI Skeleton:** Create layout and component structure
   - Build all React components with static/typed dummy data
   - Set up routing and navigation
   - NO API calls or business logic yet
   - **Note:** Tailwind "no utility classes" warning is expected - you'll add styling in Phase 2
   - **MUST VALIDATE:** Run \`npx tsc --noEmit\` after EVERY file you create
   - **STOP:** Do not proceed to Phase 2 until all TypeScript errors are fixed

2. **Phase 2 - Visual Completeness:** Make it look real with mock data
   - Use properly typed mock data matching expected API shapes
   - Add Tailwind classes for styling (warning will disappear)
   - Add loading states, error states, empty states
   - Ensure all interactive elements have placeholder handlers (e.g., \`onClick={() => console.log('TODO')}\`)
   - **MUST VALIDATE:** Run \`npx tsc --noEmit\` after adding each state
   - **Fix errors IMMEDIATELY** before adding more code

3. **Phase 3 - Validation Checkpoint:** Verify before wiring data
   - All components export/import correctly
   - TypeScript interfaces defined for all data
   - **MANDATORY:** Run \`npx tsc --noEmit\` - MUST show zero errors
   - **MANDATORY:** Run \`npm run build\` - MUST complete without errors
   - **STOP:** If ANY errors exist, fix them before Phase 4
   - Open browser and manually test UI flow

4. **Phase 4 - Data Integration:** Wire up real functionality
   - Replace dummy data with real API calls (Supabase, REST APIs, etc.)
   - Implement real event handlers
   - Add form submission and business logic
   - **MUST VALIDATE:** Run \`npx tsc --noEmit\` after each integration
   - Test each integration as you go

**Implementation Guidelines:**
- **Follow the phases** - Complete each phase fully before moving to the next
- **Validate constantly** - Run \`npx tsc --noEmit\` after EVERY file change (not just at checkpoints)
- **Zero tolerance for errors** - If validation fails, fix it immediately, no exceptions
- **Verify exports** - Always check that components/functions are properly exported and imported
- **Validate code frequently** - After creating or modifying components:
  1. Run \`npx tsc --noEmit\` to check for TypeScript errors (missing exports, type errors, etc.)
  2. Check your dev server output for compilation errors
  3. Fix any errors immediately before adding more code
- **Test as you go** - After creating each component, verify it compiles and runs without errors
- If you see errors in TypeScript check or dev server output, stop and fix them before proceeding
- **Complete the MVP** - All features listed in SPEC.md must be fully implemented before the MVP is considered done

**Development Workflow:**
- **Dev Server:** Check your AI-specific instructions (CLAUDE.md or GEMINI.md) for how to start the dev server
- **Dev Server URL:** http://localhost:${port}
- **IMPORTANT:** Open the dev server in the browser so the user can see the app as you build it. Use the 'open' command to launch the browser.
- Watch for compilation errors and address them immediately

**Validation Workflow (DO THIS EVERY TIME):**
1. Create or modify a file
2. Run \`npx tsc --noEmit\`
3. If errors: Fix them immediately
4. If no errors: Continue to next file
5. After completing a component: Run \`npm run build\`${hasGit ? `
6. If build succeeds: \`git add <files>\` and \`git commit -m "feat: description"\`
7. Repeat` : `
6. Repeat`}

Never skip step 2. Never skip step 5 after components.${hasGit ? ` Never skip step 6 after completing features.` : ''}`;

    const filePath = path.join(projectPath, 'LIKABLE.md');
    await fs.writeFile(filePath, content, 'utf-8');
    logger.success('Created LIKABLE.md with build instructions');
  } catch (error) {
    logger.warning('Could not create LIKABLE.md file');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
