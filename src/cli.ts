#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { addFeatureCommand } from './commands/add-feature.js';
import { deployCommand } from './commands/deploy.js';
import { chatCommand } from './commands/chat.js';
import { wizardCommand } from './commands/wizard.js';

// Check if running in interactive mode (no args provided)
const isInteractive = process.argv.length === 2;

if (isInteractive) {
  // Run wizard directly
  wizardCommand().catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
} else {
  // Parse as normal CLI commands
  const program = new Command();

program
  .name('likable')
  .description('AI-powered React and Supabase app builder powered by Claude Code')
  .version('0.1.0');

// likable init [project-name]
program
  .command('init')
  .argument('[project-name]', 'Name of the project')
  .description('Initialize a new React + Supabase project')
  .option('-t, --template <template>', 'Template to use', 'default')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-supabase', 'Skip Supabase setup')
  .action(initCommand);

// likable add-feature <feature>
program
  .command('add-feature')
  .argument('<feature>', 'Feature to add (auth, stripe, upload, etc.)')
  .description('Add a pre-built feature to your project')
  .option('-p, --path <path>', 'Project path', '.')
  .action(addFeatureCommand);

// likable deploy [target]
program
  .command('deploy')
  .argument('[target]', 'Deployment target (vercel, netlify, cloudflare)', 'vercel')
  .description('Deploy your app to a hosting platform')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--skip-build', 'Skip build step')
  .action(deployCommand);

// likable chat
program
  .command('chat')
  .description('Start an AI chat session for your project (requires Claude API key)')
  .option('-p, --path <path>', 'Project path', '.')
  .option('-k, --api-key <key>', 'Claude API key (or set ANTHROPIC_API_KEY env var)')
  .action(chatCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error(
    chalk.red(`\n  Error: Invalid command '${program.args.join(' ')}'`)
  );
  console.log(chalk.yellow('\n  Run "likable --help" to see available commands\n'));
  process.exit(1);
});

  // Parse arguments
  program.parse();
}
