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
  autoAccept: boolean = true
): string {
  const aiName = aiType === 'claude' ? 'Claude Code' : 'Gemini CLI';
  const permissionMode = autoAccept ? 'YOLO mode' : 'Review mode';

  return `# ${aiName} Context for ${config.name}

**Load these files to understand the project:**

1. 📄 **README.md** - Project overview and description
2. 🛠️ **LIKABLE.md** - Technical guide and best practices

## Quick Info

- **Permission Mode:** ${permissionMode}${autoAccept ? ' (freely create, edit, delete files - no confirmation needed)' : ' (user confirms each file change)'}
- **Development Server:** http://localhost:${port}
- **Project Type:** React + ${config.typescript ? 'TypeScript' : 'JavaScript'} + Supabase

## Your Mission

Read README.md and LIKABLE.md to understand what to build, then start implementing based on the project requirements.

${autoAccept ? '**YOLO MODE ACTIVE** - You can run npm, npx, supabase, git, and node commands WITHOUT ASKING. Just do it!' : '**REVIEW MODE ACTIVE** - Ask before making file changes or running commands.'}
`;
}

/**
 * Generate initial command-line prompt for AI assistant (for NEW projects)
 */
export function generateAIInitialPrompt(
  aiType: AIType,
  config: ProjectConfig,
  port: number = 13337
): string {
  return 'Read README.md and LIKABLE.md. First, create a detailed technical specification covering: MVP features (3-5 core features), key user flows, UI/UX guidelines (ensure modern and stylish), and technical considerations. Save it to SPEC.md. Then start implementing based on the requirements.';
}

/**
 * Write AI context file (CLAUDE.md or GEMINI.md) to project directory
 */
export async function writeAIContextMd(
  aiType: AIType,
  projectPath: string,
  config: ProjectConfig,
  port: number = 13337,
  autoAccept: boolean = true
): Promise<void> {
  try {
    const content = generateAIContextMd(aiType, config, port, autoAccept);
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
  port: number = 13337
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
- **Dev Server Logs:** dev-server.log in project root
- **Browser:** Open http://localhost:${port} to see the app as you work

## Working Guidelines

**Communication:**
- Be verbose! Explain what you're doing at each step so the user understands your progress
- Throughout the build process, explain what you're creating and why
- Keep the user informed of your progress

**Specification:**
- A detailed technical specification is in SPEC.md (created during initialization)
- Refer to SPEC.md for MVP features, user flows, UI/UX guidelines, and technical considerations

**Development Workflow:**
- The dev server is already running at http://localhost:${port}
- **IMPORTANT:** Open the dev server in the browser NOW so the user can see the app as you build it. Use the 'open' command to launch the browser.
- Check dev-server.log periodically (every few minutes) for errors
- If you see compilation errors or warnings, address them immediately
- Use "tail dev-server.log" to see recent output
- If the server crashes, you'll see the error in the log file`;

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
