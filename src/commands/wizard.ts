import inquirer from 'inquirer';
import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { ProjectConfig, promptProjectConfig } from '../utils/prompts.js';
import { scaffoldProject, checkPrerequisites } from '../utils/scaffold.js';
import { ServiceManager, checkDocker, checkSupabaseCLI } from '../utils/services.js';
import {
  checkClaudeCodeInstalled,
  installClaudeCode,
  launchClaudeCode,
  checkGeminiInstalled,
  installGemini,
  launchGeminiCode,
  AIInstallType,
} from '../utils/ai-helper.js';
import {
  writeAIContextMd,
  generateAIInitialPrompt,
  writeLikableMd
} from '../utils/ai-context.js';
import { DEFAULT_DEV_PORT } from '../utils/constants.js';

export async function wizardCommand(): Promise<void> {
  // Welcome banner
  console.log();
  logger.header('🚀 Welcome to Likable!');
  console.log(chalk.gray('  AI-powered React + Supabase app builder\n'));

  // Auto-detect: Check if LIKABLE.md exists in current directory
  const likableMdPath = path.join(process.cwd(), 'LIKABLE.md');
  let likableMdExists = false;
  try {
    await fs.access(likableMdPath);
    likableMdExists = true;
  } catch {
    likableMdExists = false;
  }

  if (likableMdExists) {
    // Continue working on existing project
    await continueWorkingWizard();
  } else {
    // No LIKABLE.md found - create new project
    await createProjectWizard();
  }
}

async function continueWorkingWizard(): Promise<void> {
  logger.info('Existing Likable project detected!');
  logger.blank();

  // Detect which AI CLI is installed
  const geminiInstalled = await checkGeminiInstalled();
  const claudeInstalled = await checkClaudeCodeInstalled();

  let selectedAI: 'gemini' | 'claude';

  if (!geminiInstalled && !claudeInstalled) {
    logger.warning('No AI CLI detected.');
    logger.info('Install Gemini CLI (free): npm install -g @google/gemini-cli');
    logger.info('Install Claude Code: npm install -g @anthropic-ai/claude-code');
    return;
  } else if (claudeInstalled && !geminiInstalled) {
    logger.success('Claude Code detected.');
    selectedAI = 'claude';
  } else if (geminiInstalled && !claudeInstalled) {
    logger.success('Gemini CLI detected.');
    selectedAI = 'gemini';
  } else {
    // Both installed - ask user
    logger.info('Both Claude Code and Gemini CLI detected!');
    logger.blank();
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'aiChoice',
        message: 'Which AI assistant would you like to use?',
        choices: [
          { name: '🆓 Gemini (Free)', value: 'gemini' },
          { name: '💎 Claude Code', value: 'claude' },
        ],
        default: 'gemini',
      },
    ]);
    selectedAI = response.aiChoice;
  }

  logger.blank();
  logger.info('Starting dev server...');

  // Start dev server in background
  const projectPath = process.cwd();
  const serviceManager = new ServiceManager(projectPath);

  try {
    await serviceManager.startDevServer(true);
    logger.success(`Dev server running at http://localhost:${DEFAULT_DEV_PORT}`);
    logger.blank();
  } catch (error) {
    logger.warning('Failed to start dev server');
    logger.info('You can start it manually: npm run dev');
    logger.blank();
  }

  // Launch AI with prompt to ask user what to do
  const initialPrompt = `The dev server is already running at http://localhost:${DEFAULT_DEV_PORT}.

Read README.md and LIKABLE.md to understand the project context. Then ask the user what they would like to work on or what changes they want to make.`;

  logger.info(`Launching ${selectedAI === 'gemini' ? 'Gemini CLI' : 'Claude Code'}...`);
  logger.blank();

  if (selectedAI === 'gemini') {
    await launchGeminiCode(projectPath, 'global', initialPrompt, true, []);
  } else {
    await launchClaudeCode(projectPath, 'global', initialPrompt, true, []);
  }
}

async function createProjectWizard(): Promise<void> {
  logger.blank();
  logger.section('📋 Step 1/7: AI Assistant Detection');

  // Check what AI CLIs are installed
  const geminiInstalled = await checkGeminiInstalled();
  const claudeInstalled = await checkClaudeCodeInstalled();

  let selectedAI: 'gemini' | 'claude';

  // Determine which AI to use based on what's installed
  if (!geminiInstalled && !claudeInstalled) {
    // Nothing installed - will auto-install Gemini (free)
    logger.info('No AI CLI detected. Will install Gemini CLI (free) later.');
    selectedAI = 'gemini';
  } else if (claudeInstalled && !geminiInstalled) {
    // Only Claude installed - use Claude
    logger.success('Claude Code detected. Will use Claude Code for AI assistance.');
    selectedAI = 'claude';
  } else if (geminiInstalled && !claudeInstalled) {
    // Only Gemini installed - use Gemini
    logger.success('Gemini CLI detected. Will use Gemini for AI assistance.');
    selectedAI = 'gemini';
  } else {
    // Both installed - ask user which one to use
    logger.info('Both Claude Code and Gemini CLI detected!');
    logger.blank();
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'aiChoice',
        message: 'Which AI assistant would you like to use?',
        choices: [
          {
            name: '🆓 Gemini (Free, 60 req/min)',
            value: 'gemini',
          },
          {
            name: '💎 Claude Code ($20/month, unlimited)',
            value: 'claude',
          },
        ],
        default: 'gemini',
      },
    ]);
    selectedAI = response.aiChoice;
    logger.success(`Will use ${selectedAI === 'gemini' ? 'Gemini CLI' : 'Claude Code'} for AI assistance.`);
  }

  logger.blank();
  logger.section('📋 Step 2/7: Prerequisites Check');

  // Check Node.js
  logger.success('Node.js found');

  // Check Docker
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    logger.warning('Docker is not running');
    logger.info('Supabase requires Docker Desktop');
    logger.info('Download: https://www.docker.com/products/docker-desktop');
    logger.blank();

    const { continueWithoutDocker } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueWithoutDocker',
        message: 'Continue without Docker? (You can add Supabase later)',
        default: false,
      },
    ]);

    if (!continueWithoutDocker) {
      logger.info('Please start Docker and run "likable" again');
      return;
    }
  } else {
    logger.success('Docker is running');
  }

  // Check Supabase CLI
  const hasSupabase = await checkSupabaseCLI();
  if (!hasSupabase) {
    logger.warning('Supabase CLI not found');
    logger.info('Install: brew install supabase/tap/supabase (macOS)');
    logger.info('Or visit: https://supabase.com/docs/guides/cli');
    logger.blank();
  } else {
    logger.success('Supabase CLI found');
  }

  logger.blank();
  logger.section('📋 Step 3/7: Project Configuration');

  // Get project configuration
  const config = await promptProjectConfig();
  const targetPath = path.resolve(process.cwd(), config.name);

  logger.blank();
  logger.section('📋 Step 4/7: Review & Confirm');
  console.log(chalk.white('  Project name:       ') + chalk.cyan(config.name));
  console.log(chalk.white('  Description:        ') + chalk.gray(config.description));
  console.log(
    chalk.white('  Component library:  ') + chalk.cyan(config.componentLibrary)
  );
  console.log(
    chalk.white('  Features:           ') +
      chalk.cyan(config.features.length > 0 ? config.features.join(', ') : 'None')
  );
  console.log(chalk.white('  TypeScript:         ') + chalk.cyan('Yes (always enabled)'));
  logger.blank();

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Create project with these settings?',
      default: true,
    },
  ]);

  if (!confirmed) {
    logger.info('Setup cancelled');
    return;
  }

  logger.blank();
  logger.section('📋 Step 5/7: Creating Project');

  // Check if user selected any Supabase features
  const needsSupabase =
    config.features.includes('database') ||
    config.features.includes('auth-email') ||
    config.features.includes('auth-oauth') ||
    config.features.includes('uploads') ||
    config.features.includes('realtime');

  // Scaffold the project
  try {
    await scaffoldProject({
      config,
      targetPath,
      skipInstall: false,
      skipSupabase: !needsSupabase || !hasSupabase || !hasDocker,
    });
  } catch (error) {
    logger.error('Failed to create project');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return;
  }

  logger.blank();
  logger.section('📋 Step 6/7: Start Supabase');

  let serviceManager: ServiceManager | undefined;

  if (hasDocker && hasSupabase && needsSupabase) {
    const { startSupabase } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'startSupabase',
        message: 'Start Supabase now?',
        default: true,
      },
    ]);

    if (startSupabase) {
      serviceManager = new ServiceManager(targetPath);

      try {
        const credentials = await serviceManager.startSupabase();
        await serviceManager.updateEnvFile(credentials);

        logger.blank();
        logger.info('Supabase credentials:');
        logger.code(`API URL:  ${credentials.url}`);
        logger.code(`Anon key: ${credentials.anonKey.substring(0, 20)}...`);
        logger.blank();
      } catch (error) {
        logger.blank();
        logger.warning('Supabase failed to start');
        logger.info('💡 To start Supabase manually:');
        logger.code(`cd ${config.name}`);
        logger.code('supabase start');
        logger.blank();
      }
    } else {
      logger.blank();
      logger.info('💡 To start Supabase later:');
      logger.code(`cd ${config.name}`);
      logger.code('supabase start');
      logger.blank();
    }
  }

  logger.blank();
  logger.section('📋 Step 7/7: Start Dev Server');

  // Initialize service manager if not already done
  if (!serviceManager) {
    serviceManager = new ServiceManager(targetPath);
  }

  try {
    await serviceManager.startDevServer(true); // true = background mode
    logger.success(`Dev server running at http://localhost:${DEFAULT_DEV_PORT}`);
    logger.blank();
  } catch (error) {
    logger.warning('Failed to start dev server');
    logger.info('💡 You can start it manually later:');
    logger.code(`cd ${config.name}`);
    logger.code('npm run dev');
    logger.blank();
  }

  // Launch AI assistant based on selection from Step 1
  logger.blank();
  console.log(chalk.green.bold('  ✨ Setup complete! Preparing AI assistant...'));
  logger.blank();

  const projectPath = path.resolve(process.cwd(), config.name);

  // Ask about permission mode (applies to both AIs)
  const { permissionMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'permissionMode',
      message: 'How do you want the AI to work?',
      choices: [
        {
          name: '🚀 YOLO mode - The true vibe coding experience (AI builds freely)',
          value: 'yolo',
        },
        {
          name: '🔍 Review mode - Confirm each file change',
          value: 'review',
        },
      ],
      default: 'yolo',
    },
  ]);

  const autoAccept = permissionMode === 'yolo';

  // Write context files for BOTH AIs (so user can switch later)
  await writeAIContextMd('gemini', projectPath, config, DEFAULT_DEV_PORT, autoAccept);
  await writeAIContextMd('claude', projectPath, config, DEFAULT_DEV_PORT, autoAccept);
  await writeLikableMd(selectedAI, projectPath, config, DEFAULT_DEV_PORT);

  logger.success('Created CLAUDE.md and GEMINI.md - you can switch AIs anytime!');
  logger.blank();

  // Generate initial prompt for selected AI
  const initialPrompt = generateAIInitialPrompt(selectedAI, config, DEFAULT_DEV_PORT);

  // Launch selected AI
  logger.info(`Launching ${selectedAI === 'gemini' ? 'Gemini CLI' : 'Claude Code'}...`);
  logger.blank();

  if (selectedAI === 'gemini') {
    await handleGeminiSetup(geminiInstalled ? 'launch' : 'install', projectPath, config, autoAccept, initialPrompt);
  } else {
    await handleClaudeCodeSetup(claudeInstalled ? 'launch' : 'install', projectPath, config, autoAccept, initialPrompt);
  }
}

function showClaudeCodeInfo(): void {
  logger.blank();
  logger.info('Claude Code is an AI coding assistant that:');
  logger.info('  • Understands your entire codebase');
  logger.info('  • Writes code for you based on what you describe');
  logger.info('  • Creates components, features, and integrations');
  logger.info('  • Runs in your terminal alongside your dev server');
  logger.blank();
}

async function handleClaudeCodeSetup(
  action: string,
  projectPath: string,
  config: ProjectConfig,
  autoAccept: boolean,
  initialPrompt: string
): Promise<boolean> {
  let installType: AIInstallType = 'none';

  if (action === 'install') {
    // Check if already installed
    const isInstalled = await checkClaudeCodeInstalled();
    if (isInstalled) {
      logger.success('Claude Code is already installed');
      installType = 'global';
    } else {
      // Install it
      installType = await installClaudeCode(projectPath);
      if (installType === 'none') {
        logger.warning('Claude Code installation failed');
        logger.info('You can install it manually later with:');
        logger.code('npm install -g @anthropic-ai/claude-code');
        return false;
      }
    }
  } else if (action === 'launch') {
    // User says it's installed, verify
    const isInstalled = await checkClaudeCodeInstalled();
    if (isInstalled) {
      installType = 'global';
    } else {
      logger.warning('Claude Code not found');
      logger.info('Please install it first:');
      logger.code('npm install -g @anthropic-ai/claude-code');
      return false;
    }
  }

  if (installType !== 'none') {
    // Launch Claude Code with provided params
    await launchClaudeCode(projectPath, installType, initialPrompt, autoAccept, config.features);
    return true;
  }

  return false;
}

async function handleGeminiSetup(
  action: string,
  projectPath: string,
  config: ProjectConfig,
  autoAccept: boolean,
  initialPrompt: string
): Promise<boolean> {
  let installType: AIInstallType = 'none';

  if (action === 'install') {
    // Check if already installed
    const isInstalled = await checkGeminiInstalled();
    if (isInstalled) {
      logger.success('Gemini CLI is already installed');
      installType = 'global';
    } else {
      // Install it
      installType = await installGemini(projectPath);
      if (installType === 'none') {
        logger.warning('Gemini CLI installation failed');
        logger.info('You can install it manually later with:');
        logger.code('npm install -g @google/gemini-cli');
        return false;
      }
    }
  } else if (action === 'launch') {
    // User says it's installed, verify
    const isInstalled = await checkGeminiInstalled();
    if (isInstalled) {
      installType = 'global';
    } else {
      logger.warning('Gemini CLI not found');
      logger.info('Please install it first:');
      logger.code('npm install -g @google/gemini-cli');
      return false;
    }
  }

  if (installType !== 'none') {
    // Launch Gemini CLI with provided params
    await launchGeminiCode(projectPath, installType, initialPrompt, autoAccept, config.features);
    return true;
  }

  return false;
}

function showManualSteps(projectName: string): void {
  logger.info('To start development:');
  logger.code(`cd ${projectName}`);
  logger.code('supabase start');
  logger.code('npm run dev');
  logger.blank();
  logger.info('Useful commands:');
  logger.code('likable              # Run wizard again');
  logger.code('likable deploy       # Deploy to production');
  logger.code('likable --help       # See all commands');
  logger.blank();
}

function showHelp(): void {
  logger.blank();
  logger.header('Likable Help');
  logger.blank();

  logger.info('Quick Start:');
  logger.code('likable                    # Interactive wizard');
  logger.code('likable init my-app        # Create project directly');
  logger.blank();

  logger.info('Commands:');
  logger.code('likable init [name]        # Create a new project');
  logger.code('likable add-feature <feat> # Add a feature template');
  logger.code('likable deploy [target]    # Deploy your app');
  logger.code('likable chat               # AI chat assistant');
  logger.blank();

  logger.info('Documentation:');
  logger.code('GitHub: https://github.com/Byte-Ventures/likable');
  logger.code('License: Business Source License 1.1');
  logger.blank();
}
