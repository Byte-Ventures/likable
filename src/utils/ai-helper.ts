import { execa } from 'execa';
import { logger } from './logger.js';
import { DEFAULT_DEV_PORT } from './constants.js';
import { sanitizeForCLI } from './sanitize.js';

export type AIInstallType = 'global' | 'local' | 'none';

/**
 * Simple slugify function for project names
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '') // Trim dashes from start/end
    .slice(0, 30); // Limit to 30 chars
}

/**
 * Generate project name suggestions using AI
 * Returns array of 1-3 valid project names, or falls back to slugified description
 */
export async function generateProjectName(
  selectedAI: 'claude' | 'gemini',
  description: string
): Promise<string[]> {
  // Sanitize user input to prevent escape code injection
  const sanitizedDescription = sanitizeForCLI(description);
  const prompt = `Generate 3 project directory names for: ${sanitizedDescription}. Requirements: lowercase, a-z and dash only, 3-30 chars. Respond with one name per line, no other text.`;

  try {
    const result = selectedAI === 'claude'
      ? await execa('claude', ['--print'], { input: prompt, timeout: 30000 })
      : await execa('gemini', [prompt], { timeout: 30000 });

    // Parse output: split by newlines, trim, validate
    const names = result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^[a-z-]{3,30}$/.test(line))
      .slice(0, 3); // Take first 3 valid names

    if (names.length > 0) {
      return names;
    }
  } catch (error) {
    logger.warning('AI name generation failed, using fallback');
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    }
  }

  // Fallback: slugify description
  const fallbackName = slugify(description) || 'my-app';
  return [fallbackName];
}

/**
 * Generate detailed project specification using AI
 * Returns structured specification covering MVP requirements, user flows, and technical considerations
 */
export async function generateProjectSpecification(
  selectedAI: 'claude' | 'gemini',
  description: string,
  userStory?: string
): Promise<string> {
  // Sanitize user input to prevent escape code injection
  const sanitizedDescription = sanitizeForCLI(description);
  const sanitizedUserStory = userStory ? sanitizeForCLI(userStory) : '';

  // Build prompt with no newlines for Gemini compatibility
  const prompt = `Generate a detailed technical specification for this project: Description: ${sanitizedDescription}${sanitizedUserStory ? ` Additional Requirements: ${sanitizedUserStory}` : ''} Create a structured specification including: 1. MVP Core Features (3-5 essential features for initial release) 2. Key User Flows (main user interactions and journeys) 3. UI/UX Guidelines (ensure the product is stylish, modern, and appealing) 4. Technical Considerations (architecture patterns, data model, key dependencies) Format as clear markdown with sections. Be concise but comprehensive. Focus on MVP scope.`;

  try {
    const result = selectedAI === 'claude'
      ? await execa('claude', ['--print'], { input: prompt, timeout: 30000 })
      : await execa('gemini', [prompt], { timeout: 45000 });

    const specification = result.stdout.trim();

    // Validate we got a reasonable specification (at least 100 chars)
    if (specification.length > 100) {
      return specification;
    }
  } catch (error) {
    logger.warning('AI specification generation failed, using fallback');
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    }
  }

  // Fallback: return structured description
  return `## Project Overview\n\n${description}\n\n${userStory ? `## Additional Requirements\n\n${userStory}\n\n` : ''}## Next Steps\n\nThe AI will help you build this project step by step.`;
}

/**
 * Check if Claude Code is installed globally
 */
export async function checkClaudeCodeInstalled(): Promise<boolean> {
  try {
    await execa('claude', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Claude Code
 * Tries global first, falls back to local if global fails
 */
export async function installClaudeCode(
  projectPath?: string
): Promise<AIInstallType> {
  // Try global install first
  try {
    logger.startSpinner('Installing Claude Code globally...');
    await execa('npm', ['install', '-g', '@anthropic-ai/claude-code'], {
      stdio: 'pipe',
    });
    logger.succeedSpinner('Installed globally!');
    return 'global';
  } catch (globalError) {
    logger.failSpinner('Global install failed');

    // Fallback to local install if projectPath provided
    if (projectPath) {
      try {
        logger.startSpinner('Installing Claude Code locally...');
        await execa('npm', ['install', '@anthropic-ai/claude-code'], {
          cwd: projectPath,
          stdio: 'pipe',
        });
        logger.succeedSpinner('Installed locally!');
        return 'local';
      } catch (localError) {
        logger.failSpinner('Local install also failed');
        logger.blank();
        logger.error('Could not install Claude Code automatically');
        logger.info('You can install it manually:');
        logger.code('npm install -g @anthropic-ai/claude-code');
        return 'none';
      }
    } else {
      logger.blank();
      logger.error('Could not install Claude Code globally');
      logger.info('You can install it manually:');
      logger.code('npm install -g @anthropic-ai/claude-code');
      return 'none';
    }
  }
}

/**
 * Launch Claude Code in the project directory
 */
export async function launchClaudeCode(
  projectPath: string,
  installType: AIInstallType,
  initialPrompt?: string,
  autoAccept: boolean = true,
  features: string[] = []
): Promise<void> {
  logger.blank();
  logger.success('🚀 Launching Claude Code in your project...');
  logger.blank();
  logger.info(`Your dev server is running at http://localhost:${DEFAULT_DEV_PORT}`);
  logger.info('Claude Code will help you build your app!');
  if (autoAccept) {
    logger.info('💨 YOLO mode activated - The true vibe coding experience!');
  } else {
    logger.info('🔍 Review mode - You\'ll confirm each change');
  }
  logger.blank();

  try {
    if (installType === 'global') {
      // Launch global claude with optional auto-accept and prompt
      const args = [];

      if (autoAccept) {
        // Use acceptEdits + allowedTools for safe YOLO mode
        args.push('--permission-mode', 'acceptEdits');

        // Build allowed tools based on selected features
        const needsSupabase = features.some(f =>
          ['database', 'auth-email', 'auth-oauth', 'uploads', 'realtime'].includes(f)
        );

        const allowedTools = [
          'Bash(npm:*)',
          'Bash(npx:*)',
          ...(needsSupabase ? ['Bash(supabase:*)'] : []),
          'Bash(git:*)',
          'Bash(node:*)',
          'Bash(open:*)',
          'Read',
          'Glob',
          'Grep'
        ].join(' ');

        // Whitelist development tools (space-separated list as single argument)
        // Note: execa handles proper escaping automatically - don't add quotes
        args.push('--allowedTools', allowedTools);
      }

      // Add -- to explicitly end options before positional argument
      if (autoAccept) {
        args.push('--');
      }

      // Initial prompt must come last (positional argument)
      if (initialPrompt) {
        // Sanitize prompt to prevent escape code injection
        args.push(sanitizeForCLI(initialPrompt));
      }

      // Debug: show the full command
      logger.info('Launching: claude ' + args.join(' '));
      logger.blank();

      await execa('claude', args, {
        cwd: projectPath,
        stdio: 'inherit',
      });
    } else if (installType === 'local') {
      // Launch with npx and optional auto-accept
      const args = ['claude'];

      if (autoAccept) {
        // Use acceptEdits + allowedTools for safe YOLO mode
        args.push('--permission-mode', 'acceptEdits');

        // Build allowed tools based on selected features
        const needsSupabase = features.some(f =>
          ['database', 'auth-email', 'auth-oauth', 'uploads', 'realtime'].includes(f)
        );

        const allowedTools = [
          'Bash(npm:*)',
          'Bash(npx:*)',
          ...(needsSupabase ? ['Bash(supabase:*)'] : []),
          'Bash(git:*)',
          'Bash(node:*)',
          'Bash(open:*)',
          'Read',
          'Glob',
          'Grep'
        ].join(' ');

        // Whitelist development tools (space-separated list as single argument)
        // Note: execa handles proper escaping automatically - don't add quotes
        args.push('--allowedTools', allowedTools);
      }

      // Add -- to explicitly end options before positional argument
      if (autoAccept) {
        args.push('--');
      }

      // Initial prompt must come last (positional argument)
      if (initialPrompt) {
        // Sanitize prompt to prevent escape code injection
        args.push(sanitizeForCLI(initialPrompt));
      }

      // Debug: show the full command
      logger.info('Launching: npx ' + args.join(' '));
      logger.blank();

      await execa('npx', args, {
        cwd: projectPath,
        stdio: 'inherit',
      });
    }
  } catch (error) {
    logger.blank();
    logger.error('Failed to launch Claude Code');
    logger.info('You can launch it manually:');
    logger.code(`cd ${projectPath}`);
    if (autoAccept) {
      logger.code(
        'claude --permission-mode acceptEdits --allowedTools "Bash(npm:*)" "Bash(npx:*)" "Bash(supabase:*)" "Bash(git:*)"'
      );
    } else {
      logger.code('claude');
    }
  }
}

// ============================================================================
// Gemini CLI Functions
// ============================================================================

/**
 * Check if Gemini CLI is installed globally
 */
export async function checkGeminiInstalled(): Promise<boolean> {
  try {
    await execa('gemini', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Gemini CLI
 * Tries global first, falls back to local if global fails
 */
export async function installGemini(
  projectPath?: string
): Promise<AIInstallType> {
  // Try global install first
  try {
    logger.startSpinner('Installing Gemini CLI globally...');
    await execa('npm', ['install', '-g', '@google/gemini-cli'], {
      stdio: 'pipe',
    });
    logger.succeedSpinner('Installed globally!');
    return 'global';
  } catch (globalError) {
    logger.failSpinner('Global install failed');

    // Fallback to local install if projectPath provided
    if (projectPath) {
      try {
        logger.startSpinner('Installing Gemini CLI locally...');
        await execa('npm', ['install', '@google/gemini-cli'], {
          cwd: projectPath,
          stdio: 'pipe',
        });
        logger.succeedSpinner('Installed locally!');
        return 'local';
      } catch (localError) {
        logger.failSpinner('Local install also failed');
        logger.blank();
        logger.error('Could not install Gemini CLI automatically');
        logger.info('You can install it manually:');
        logger.code('npm install -g @google/gemini-cli');
        return 'none';
      }
    } else {
      logger.blank();
      logger.error('Could not install Gemini CLI globally');
      logger.info('You can install it manually:');
      logger.code('npm install -g @google/gemini-cli');
      return 'none';
    }
  }
}

/**
 * Launch Gemini CLI in the project directory
 */
export async function launchGeminiCode(
  projectPath: string,
  installType: AIInstallType,
  initialPrompt?: string,
  autoAccept: boolean = true,
  features: string[] = []
): Promise<void> {
  logger.blank();
  logger.success('🚀 Launching Gemini in your project...');
  logger.blank();
  logger.info(`Your dev server is running at http://localhost:${DEFAULT_DEV_PORT}`);
  logger.info('Gemini will help you build your app!');
  if (autoAccept) {
    logger.info('💨 YOLO mode activated - The true vibe coding experience!');
  } else {
    logger.info('🔍 Review mode - You\'ll confirm each change');
  }
  logger.blank();

  try {
    if (installType === 'global') {
      // Launch global gemini with optional auto-accept and prompt
      const args = [];

      // Use the free flash model
      args.push('--model', 'gemini-2.5-flash');

      if (autoAccept) {
        // Use --yolo for auto-accept mode
        args.push('--yolo');

        // Build allowed tools based on selected features
        const needsSupabase = features.some(f =>
          ['database', 'auth-email', 'auth-oauth', 'uploads', 'realtime'].includes(f)
        );

        // Whitelist development tools
        const allowedTools = [
          'bash',
          'read',
          'write',
          'edit',
          'glob',
          'grep',
          ...(needsSupabase ? ['supabase'] : []),
        ];

        // Add allowed tools as comma-separated string
        args.push('--allowed-tools', allowedTools.join(','));
      }

      // Initial prompt as --prompt-interactive flag (must be quoted)
      if (initialPrompt) {
        // Sanitize prompt to prevent escape code injection
        args.push('--prompt-interactive', sanitizeForCLI(initialPrompt));
      }

      // Debug: show the full command
      logger.info('Launching: gemini ' + args.join(' '));
      logger.blank();

      await execa('gemini', args, {
        cwd: projectPath,
        stdio: 'inherit',
      });
    } else if (installType === 'local') {
      // Launch with npx
      const args = ['@google/gemini-cli'];

      // Use the free flash model
      args.push('--model', 'gemini-2.5-flash');

      if (autoAccept) {
        // Use --yolo for auto-accept mode
        args.push('--yolo');

        // Build allowed tools based on selected features
        const needsSupabase = features.some(f =>
          ['database', 'auth-email', 'auth-oauth', 'uploads', 'realtime'].includes(f)
        );

        // Whitelist development tools
        const allowedTools = [
          'bash',
          'read',
          'write',
          'edit',
          'glob',
          'grep',
          ...(needsSupabase ? ['supabase'] : []),
        ];

        // Add allowed tools as comma-separated string
        args.push('--allowed-tools', allowedTools.join(','));
      }

      // Initial prompt as --prompt-interactive flag (must be quoted)
      if (initialPrompt) {
        // Sanitize prompt to prevent escape code injection
        args.push('--prompt-interactive', sanitizeForCLI(initialPrompt));
      }

      // Debug: show the full command
      logger.info('Launching: npx ' + args.join(' '));
      logger.blank();

      await execa('npx', args, {
        cwd: projectPath,
        stdio: 'inherit',
      });
    }
  } catch (error) {
    logger.blank();
    logger.error('Failed to launch Gemini CLI');
    logger.info('You can launch it manually:');
    logger.code(`cd ${projectPath}`);
    if (autoAccept) {
      logger.code('gemini --model gemini-2.5-flash --yolo --allowed-tools bash,read,write,edit');
    } else {
      logger.code('gemini --model gemini-2.5-flash');
    }
  }
}
