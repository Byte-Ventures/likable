import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const WELCOME_FLAG = path.join(os.homedir(), '.likable', 'welcomed');

/**
 * Check if this is the first time the CLI is being run
 */
export function isFirstRun(): boolean {
  return !existsSync(WELCOME_FLAG);
}

/**
 * Mark the CLI as having been run (create the welcome flag file)
 */
export function markWelcomeShown(): void {
  try {
    mkdirSync(path.dirname(WELCOME_FLAG), { recursive: true });
    writeFileSync(WELCOME_FLAG, Date.now().toString(), 'utf-8');
  } catch (error) {
    // Silently fail if we can't write the flag file
  }
}

/**
 * Display welcome message on first run
 */
export function showWelcomeIfNeeded(): void {
  if (!isFirstRun()) {
    return;
  }

  console.log();
  console.log(chalk.cyan.bold('  🚀 Welcome to Likable!'));
  console.log();
  console.log(chalk.white('  AI-powered React + Supabase development'));
  console.log();
  console.log(chalk.green.bold('  Get started now:'));
  console.log(chalk.white('    $ ') + chalk.cyan.bold('likable'));
  console.log(chalk.gray('    ↳ Quick-start mode: AI generates your project in seconds'));
  console.log();
  console.log(chalk.gray('  Want more control?'));
  console.log(chalk.white('    $ ') + chalk.cyan('likable --wizard'));
  console.log(chalk.gray('    ↳ Full setup with feature selection and configuration'));
  console.log();
  console.log(chalk.gray('  Need help?'));
  console.log(chalk.white('    $ ') + chalk.cyan('likable --help'));
  console.log();
  console.log(chalk.gray('  Learn more:'));
  console.log(chalk.gray('    GitHub: ') + chalk.blue('https://github.com/Byte-Ventures/likable'));
  console.log(chalk.gray('    Sponsor: ') + chalk.magenta('https://github.com/sponsors/TheodorStorm'));
  console.log();

  markWelcomeShown();
}
