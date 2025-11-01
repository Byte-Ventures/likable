#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { wizardCommand } from './commands/wizard.js';
import { showWelcomeIfNeeded } from './utils/first-run.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;

// Show welcome message on first run
showWelcomeIfNeeded();

// Check for --wizard flag
const hasWizard = process.argv.includes('--wizard');

// Check if running in interactive mode (no args provided)
const isInteractive = process.argv.length === 2;

// Check if a description argument is provided (first non-flag arg)
const descriptionArg = process.argv.find((arg, index) =>
  index > 1 && !arg.startsWith('--') && !arg.startsWith('-')
);

// Validate description is not empty and within reasonable bounds
const validDescriptionArg = descriptionArg &&
  descriptionArg.trim().length > 0 &&
  descriptionArg.trim().length <= 500 // Prevent extremely long inputs
  ? descriptionArg.trim()
  : undefined;

if (hasWizard) {
  // Run full wizard with all prompts
  wizardCommand(false).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
} else if (validDescriptionArg) {
  // Run quick-start mode with provided description
  wizardCommand(true, validDescriptionArg).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
} else if (isInteractive) {
  // Run quick-start mode by default (minimal prompts, AI-generated name, recommended defaults)
  wizardCommand(true).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
} else {
  // Parse as normal CLI commands
  const program = new Command();

program
  .name('likable')
  .description('AI-powered React and Supabase app builder powered by Claude Code')
  .version(version)
  .option('--wizard', 'Full wizard mode - interactive setup with all configuration options');

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
