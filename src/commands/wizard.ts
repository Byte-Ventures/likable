import inquirer from 'inquirer';
import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { ProjectConfig, promptProjectConfig } from '../utils/prompts.js';
import { scaffoldProject, checkPrerequisites } from '../utils/scaffold.js';
import { ServiceManager, checkDocker } from '../utils/services.js';
import {
  checkClaudeCodeInstalled,
  installClaudeCode,
  launchClaudeCode,
  checkGeminiInstalled,
  installGemini,
  launchGeminiCode,
  generateProjectName,
  generateSurpriseDescription,
  AIInstallType,
} from '../utils/ai-helper.js';
import {
  writeAIContextMd,
  generateAIInitialPrompt,
  writeLikableMd
} from '../utils/ai-context.js';
import { DEFAULT_DEV_PORT } from '../utils/constants.js';

/**
 * Detect dev server port from vite.config.ts
 * Returns the configured port or DEFAULT_DEV_PORT if not found
 */
async function detectDevPort(projectPath: string): Promise<number> {
  try {
    const viteConfigPath = path.join(projectPath, 'vite.config.ts');
    const viteConfigContent = await fs.readFile(viteConfigPath, 'utf-8');

    // Match: port: 12345
    const portMatch = viteConfigContent.match(/port:\s*(\d+)/);
    if (portMatch) {
      return parseInt(portMatch[1], 10);
    }
  } catch (error) {
    // File doesn't exist or couldn't be read
  }

  return DEFAULT_DEV_PORT;
}

export async function wizardCommand(quickStart: boolean = false, description?: string): Promise<void> {
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
    await createProjectWizard(quickStart, description);
  }
}

async function detectProjectFeatures(projectPath: string): Promise<string[]> {
  // Detect features from existing project by reading package.json
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const features: string[] = [];
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Detect Supabase features
    if (deps['@supabase/supabase-js']) {
      features.push('database', 'auth-email', 'auth-oauth', 'uploads', 'realtime');
    }

    // Detect Stripe
    if (deps['@stripe/stripe-js']) {
      features.push('stripe');
    }

    return features;
  } catch (error) {
    // If we can't read package.json, default to common features
    logger.warning('Could not detect project features, assuming Supabase is available');
    return ['database', 'auth-email', 'auth-oauth', 'uploads', 'realtime'];
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

  // Start dev server in background (only for Gemini - Claude will start it itself)
  const projectPath = process.cwd();

  // Detect project features for proper tool whitelisting
  const features = await detectProjectFeatures(projectPath);

  // Detect the configured dev server port
  const devPort = await detectDevPort(projectPath);

  if (selectedAI === 'gemini') {
    logger.info('Starting dev server...');
    const serviceManager = new ServiceManager(projectPath);

    // Clean up any deprecated Supabase config keys
    const { cleanupSupabaseConfig } = await import('../utils/portManager.js');
    await cleanupSupabaseConfig(projectPath);

    try {
      await serviceManager.startDevServer(true, devPort);
      logger.success(`Dev server running at http://localhost:${devPort}`);
      logger.blank();
    } catch (error) {
      logger.warning('Failed to start dev server');
      logger.info('You can start it manually: npm run dev');
      logger.blank();
    }
  }

  // Launch AI with prompt to ask user what to do
  const initialPrompt = selectedAI === 'claude'
    ? `Start the dev server with \`npm run dev\`. Then read README.md and LIKABLE.md to understand the project context. After that, ask the user what they would like to work on or what changes they want to make.`
    : `The dev server is already running at http://localhost:${devPort}.

Read README.md and LIKABLE.md to understand the project context. Then ask the user what they would like to work on or what changes they want to make.`;

  logger.info(`Launching ${selectedAI === 'gemini' ? 'Gemini CLI' : 'Claude Code'}...`);
  logger.blank();

  if (selectedAI === 'gemini') {
    await launchGeminiCode(projectPath, 'global', initialPrompt, true, features, devPort);
  } else {
    await launchClaudeCode(projectPath, 'global', initialPrompt, true, features, devPort);
  }

  // Clean up Supabase when agent exits
  logger.blank();
  const cleanupManager = new ServiceManager(projectPath);
  await cleanupManager.stopSupabase();
}

async function createProjectWizard(quickStart: boolean = false, description?: string): Promise<void> {
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

  // Check prerequisites
  const prereqs = await checkPrerequisites();
  const hasDocker = prereqs.docker;
  const hasGit = prereqs.git;

  if (!hasDocker) {
    logger.warning('Docker is not running');
    if (!quickStart) {
      // Interactive mode: show instructions and prompt
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
      // Quickstart mode: just continue without prompting
      logger.info('Continuing without Docker (Supabase features will be skipped)');
    }
  } else {
    logger.success('Docker is running');
  }

  // Check Git
  if (!hasGit) {
    logger.warning('Git is not installed');
    if (!quickStart) {
      // Interactive mode: show instructions and prompt
      logger.info('Git is recommended for version control');
      logger.blank();

      // OS-specific installation instructions
      const platform = process.platform;
      if (platform === 'darwin') {
        logger.info('Install Git for Mac:');
        logger.info('  brew install git');
        logger.info('  or: xcode-select --install');
      } else if (platform === 'win32') {
        logger.info('Install Git for Windows:');
        logger.info('  https://git-scm.com/download/win');
      } else {
        logger.info('Install Git for Linux:');
        logger.info('  sudo apt install git  # Debian/Ubuntu');
        logger.info('  sudo yum install git  # CentOS/RHEL');
      }
      logger.blank();

      const { continueWithoutGit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueWithoutGit',
          message: 'Continue without Git? (You can initialize git later)',
          default: true,
        },
      ]);

      if (!continueWithoutGit) {
        logger.info('Please install Git and run "likable" again');
        return;
      }
    } else {
      // Quickstart mode: just continue without prompting
      logger.info('Continuing without Git (version control will be skipped)');
    }
  } else {
    logger.success('Git is installed');
  }

  // Supabase CLI is now included as a dev dependency in the project
  logger.success('Supabase CLI will be available via npx in your project');

  logger.blank();
  logger.section('📋 Step 3/7: Project Configuration');

  let config: ProjectConfig;
  let targetPath: string;

  // Constant for surprise mode keyword
  const SURPRISE_ME_KEYWORD = 'Surprise me';

  if (quickStart) {
    // Quick start mode: only ask for description, generate name with AI
    let projectDescription: string;

    if (description) {
      // Use description provided via CLI argument
      projectDescription = description;
    } else {
      // Prompt user for description
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'What do you want to build?',
          default: SURPRISE_ME_KEYWORD,
        },
      ]);
      projectDescription = answer.description;
    }

    // Generate creative description if user chose surprise mode
    if (projectDescription === SURPRISE_ME_KEYWORD) {
      logger.blank();
      logger.info('🎲 Generating a surprise project idea...');
      projectDescription = await generateSurpriseDescription(selectedAI);
      logger.success(`How about: ${projectDescription}`);
    }

    logger.blank();
    logger.info('Generating project name...');

    // Generate project names using AI
    const suggestedNames = await generateProjectName(selectedAI, projectDescription);

    // Find first available directory name
    let projectName = suggestedNames[0];
    let foundAvailable = false;

    for (const name of suggestedNames) {
      const testPath = path.resolve(process.cwd(), name);
      try {
        await fs.access(testPath);
        // Directory exists, try next
      } catch {
        // Directory doesn't exist, use this name
        projectName = name;
        foundAvailable = true;
        break;
      }
    }

    // If all suggested names exist, append numeric suffix
    if (!foundAvailable) {
      const baseName = suggestedNames[0];
      let suffix = 1;
      const MAX_ATTEMPTS = 1000; // Safety limit
      while (suffix < MAX_ATTEMPTS) {
        const testName = `${baseName}-${suffix}`;
        const testPath = path.resolve(process.cwd(), testName);
        try {
          await fs.access(testPath);
          suffix++;
        } catch {
          projectName = testName;
          break;
        }
      }
      if (suffix >= MAX_ATTEMPTS) {
        throw new Error(`Could not find available directory name after ${MAX_ATTEMPTS} attempts`);
      }
    }

    logger.success(`Project name: ${projectName}`);

    // Build config with defaults
    config = {
      name: projectName,
      description: projectDescription,
      typescript: true,
      componentLibrary: 'shadcn',
      features: [], // No features by default (same as normal wizard)
      userStory: '',
    };

    // In quickstart mode, add all Supabase features if Docker is available
    // This ensures Supabase tools are added to Claude's allowed tools
    if (hasDocker) {
      config.features.push('auth-email', 'auth-oauth', 'database', 'uploads', 'realtime');
    }

    targetPath = path.resolve(process.cwd(), config.name);

    // Show configuration (no confirmation needed in quick start)
    logger.blank();
    logger.info('Using recommended defaults:');
    console.log(chalk.white('  Component library:  ') + chalk.cyan('shadcn'));
    console.log(chalk.white('  Permission mode:    ') + chalk.cyan('YOLO'));
    logger.blank();
  } else {
    // Normal mode: full configuration flow
    config = await promptProjectConfig();
    targetPath = path.resolve(process.cwd(), config.name);

    logger.blank();
    logger.section('📋 Step 4/7: Review & Confirm');
    console.log(chalk.white('  Project name:       ') + chalk.cyan(config.name));
    console.log(chalk.white('  Description:        ') + chalk.gray(config.description));
    console.log(
      chalk.white('  Component library:  ') + chalk.cyan(config.componentLibrary)
    );
    if (config.features.length > 0) {
      console.log(
        chalk.white('  Features:           ') + chalk.cyan(config.features.join(', '))
      );
    }
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
  let devPort: number;
  try {
    devPort = await scaffoldProject({
      config,
      targetPath,
      skipInstall: false,
      skipSupabase: !needsSupabase || !hasDocker,
      hasGit,
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

  if (hasDocker && needsSupabase) {
    // Always start Supabase to provide a fully configured environment
    serviceManager = new ServiceManager(targetPath);

    try {
      // Skip existing check - this is a brand new project
      const credentials = await serviceManager.startSupabase(true);
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
      logger.code('npx supabase start');
      logger.blank();
    }
  }

  logger.blank();
  logger.section('📋 Step 7/7: Start Dev Server');

  // Start dev server in background (only for Gemini - Claude will start it itself)
  if (selectedAI === 'gemini') {
    // Initialize service manager if not already done
    if (!serviceManager) {
      serviceManager = new ServiceManager(targetPath);
    }

    try {
      await serviceManager.startDevServer(true, devPort); // true = background mode
      logger.success(`Dev server running at http://localhost:${devPort}`);
      logger.blank();
    } catch (error) {
      logger.warning('Failed to start dev server');
      logger.info('💡 You can start it manually later:');
      logger.code(`cd ${config.name}`);
      logger.code('npm run dev');
      logger.blank();
    }
  } else {
    logger.info(`Claude Code will start the dev server for you.`);
    logger.blank();
  }

  // Launch AI assistant based on selection from Step 1
  logger.blank();
  console.log(chalk.green.bold('  ✨ Setup complete! Preparing AI assistant...'));
  logger.blank();

  const projectPath = path.resolve(process.cwd(), config.name);

  // Determine permission mode
  let autoAccept: boolean;

  if (quickStart) {
    // Quick start always uses YOLO mode
    autoAccept = true;
  } else {
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

    autoAccept = permissionMode === 'yolo';
  }

  // Write context files for BOTH AIs (so user can switch later)
  await writeAIContextMd('gemini', projectPath, config, devPort, autoAccept, hasGit);
  await writeAIContextMd('claude', projectPath, config, devPort, autoAccept, hasGit);
  await writeLikableMd(selectedAI, projectPath, config, devPort, hasGit);

  logger.success('Created CLAUDE.md and GEMINI.md - you can switch AIs anytime!');
  logger.blank();

  // Generate initial prompt for selected AI
  const hasSupabase = hasDocker && needsSupabase;
  const initialPrompt = generateAIInitialPrompt(selectedAI, config, devPort, hasSupabase);

  // Launch selected AI
  logger.info(`Launching ${selectedAI === 'gemini' ? 'Gemini CLI' : 'Claude Code'}...`);
  logger.blank();

  if (selectedAI === 'gemini') {
    await handleGeminiSetup(geminiInstalled ? 'launch' : 'install', projectPath, config, autoAccept, initialPrompt, devPort);
  } else {
    await handleClaudeCodeSetup(claudeInstalled ? 'launch' : 'install', projectPath, config, autoAccept, initialPrompt, devPort);
  }

  // Clean up Supabase when agent exits
  if (serviceManager) {
    logger.blank();
    await serviceManager.stopSupabase();
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
  initialPrompt: string,
  devPort: number
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
    await launchClaudeCode(projectPath, installType, initialPrompt, autoAccept, config.features, devPort);
    return true;
  }

  return false;
}

async function handleGeminiSetup(
  action: string,
  projectPath: string,
  config: ProjectConfig,
  autoAccept: boolean,
  initialPrompt: string,
  devPort: number
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
    await launchGeminiCode(projectPath, installType, initialPrompt, autoAccept, config.features, devPort);
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
