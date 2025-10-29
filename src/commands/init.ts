import path from 'path';
import { logger } from '../utils/logger.js';
import { promptProjectConfig, confirmAction } from '../utils/prompts.js';
import { scaffoldProject, checkPrerequisites } from '../utils/scaffold.js';
import chalk from 'chalk';

interface InitOptions {
  template?: string;
  skipInstall?: boolean;
  skipSupabase?: boolean;
}

export async function initCommand(
  projectName: string | undefined,
  options: InitOptions
): Promise<void> {
  logger.header('🚀 Welcome to Likable!');
  logger.info('Let\'s create your React + Supabase app');
  logger.blank();

  // Check prerequisites
  const prereqs = await checkPrerequisites();

  if (!prereqs.docker) {
    logger.warning('Docker is not installed');
    logger.info('Docker is required for local Supabase development');
    logger.info('Install from: https://www.docker.com/products/docker-desktop');
    logger.blank();

    const proceed = await confirmAction('Continue without Docker? (You can add it later)', false);
    if (!proceed) {
      logger.info('Setup cancelled');
      return;
    }
    options.skipSupabase = true;
  }

  if (!prereqs.supabase) {
    logger.warning('Supabase CLI is not installed');
    logger.info('The Supabase CLI is recommended for local development');
    logger.info('Install from: https://supabase.com/docs/guides/cli');
    logger.blank();
  }

  // Get project configuration
  const config = await promptProjectConfig(projectName);
  const targetPath = path.resolve(process.cwd(), config.name);

  // Confirm configuration
  logger.blank();
  logger.section('📋 Project Summary');
  logger.info(`Name: ${config.name}`);
  logger.info(`Description: ${config.description}`);
  logger.info(`Component Library: ${config.componentLibrary}`);
  logger.info(`Features: ${config.features.join(', ') || 'None'}`);
  logger.info(`TypeScript: Yes (always enabled)`);
  logger.blank();

  const confirmed = await confirmAction('Create project with these settings?', true);
  if (!confirmed) {
    logger.info('Setup cancelled');
    return;
  }

  // Scaffold the project
  try {
    await scaffoldProject({
      config,
      targetPath,
      skipInstall: options.skipInstall,
      skipSupabase: options.skipSupabase,
    });

    // Success message
    logger.blank();
    logger.header('✨ Project created successfully!');
    logger.blank();

    logger.section('Next steps:');
    logger.code(`cd ${config.name}`);

    if (!options.skipSupabase && prereqs.supabase) {
      logger.code('supabase start');
      logger.info('  (Starts local Supabase - copy the API URL and anon key to .env.local)');
    }

    logger.code('npm run dev');
    logger.info('  (Starts development server)');
    logger.blank();

    if (prereqs.docker && prereqs.supabase) {
      logger.info('💡 Tip: After starting Supabase, update .env.local with your credentials');
      logger.info('💡 Tip: Use Claude Desktop with Likable MCP for AI-powered development');
      logger.code('likable mcp register');
      logger.blank();
    }

    logger.info(chalk.cyan('Happy building! 🎉'));
    logger.blank();
  } catch (error) {
    logger.blank();
    logger.error('Failed to create project');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
