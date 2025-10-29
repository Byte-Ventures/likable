import { execa } from 'execa';
import type { ResultPromise } from 'execa';
import { logger } from './logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { DEFAULT_DEV_PORT } from './constants.js';

export interface ServiceStatus {
  running: boolean;
  url?: string;
  pid?: number;
}

export class ServiceManager {
  private supabaseProcess: ResultPromise | null = null;
  private devServerProcess: ResultPromise | null = null;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async startSupabase(): Promise<{ url: string; anonKey: string }> {
    logger.startSpinner('Checking Supabase status...');

    try {
      // Check if Supabase is already running
      try {
        const { stdout } = await execa('supabase', ['status'], {
          cwd: this.projectPath,
          stdio: 'pipe',
        });

        if (stdout.includes('API URL')) {
          logger.succeedSpinner('Supabase is already running');
          return this.extractSupabaseCredentials(stdout);
        }
      } catch {
        // Not running, need to start
      }

      // Stop spinner before showing supabase output
      logger.succeedSpinner('Starting Supabase...');
      logger.blank();
      logger.info('This may take a minute on first run (downloading Docker images)...');
      logger.blank();

      // Start Supabase
      await execa('supabase', ['start'], {
        cwd: this.projectPath,
        stdio: 'inherit', // Show output directly to user
      });

      logger.blank();

      // Get status to extract credentials
      const { stdout } = await execa('supabase', ['status'], {
        cwd: this.projectPath,
        stdio: 'pipe',
      });

      logger.success('Supabase started successfully');
      return this.extractSupabaseCredentials(stdout);
    } catch (error: any) {
      logger.blank();
      logger.error('Failed to start Supabase');

      // Parse error message for specific issues
      const errorMessage = error.stderr || error.message || '';

      if (errorMessage.includes('port is already allocated')) {
        // Extract the project ID from error message if available
        const projectMatch = errorMessage.match(/supabase stop --project-id (\S+)/);
        const conflictingProjectId = projectMatch ? projectMatch[1] : null;

        logger.blank();
        logger.warning('Port conflict detected!');
        logger.info(
          `Another Supabase project${conflictingProjectId ? ` (${conflictingProjectId})` : ''} is already running.`
        );
        logger.blank();

        // Offer to stop the conflicting project
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'How would you like to proceed?',
            choices: [
              {
                name: 'Stop the other project and retry',
                value: 'stop',
              },
              {
                name: 'Skip Supabase (continue with dev server only)',
                value: 'skip',
              },
              {
                name: 'Exit wizard',
                value: 'exit',
              },
            ],
          },
        ]);

        if (action === 'stop') {
          try {
            logger.startSpinner('Stopping conflicting Supabase project...');
            await execa('supabase', ['stop', '--no-backup'], {
              stdio: 'pipe',
            });
            logger.succeedSpinner('Stopped conflicting project');
            logger.blank();

            // Retry starting Supabase
            logger.info('Retrying Supabase startup...');
            return await this.startSupabase();
          } catch (stopError) {
            logger.failSpinner('Failed to stop conflicting project');
            throw new Error('Could not stop conflicting Supabase project');
          }
        } else if (action === 'exit') {
          process.exit(0);
        } else {
          // Skip - just throw to continue without Supabase
          throw new Error('Skipping Supabase startup');
        }
      } else {
        logger.error('Error details: ' + errorMessage);
        throw new Error('Supabase startup failed. See above for details.');
      }
    }
  }

  async startDevServer(background: boolean = false): Promise<void> {
    logger.info('Starting development server...');

    try {
      this.devServerProcess = execa('npm', ['run', 'dev', '--', '--port', DEFAULT_DEV_PORT.toString()], {
        cwd: this.projectPath,
        stdio: background ? 'pipe' : 'inherit', // Use 'pipe' to capture errors in background
        detached: background, // Detach if running in background
      });

      // Don't await the process - let it run
      if (background) {
        // Create log file for dev server output
        const logPath = path.join(this.projectPath, 'dev-server.log');
        const logHandle = await fs.open(logPath, 'w');

        // Pipe stdout and stderr to log file
        if (this.devServerProcess.stdout) {
          this.devServerProcess.stdout.on('data', async (data) => {
            await logHandle.write(data.toString() + '\n');
          });
        }

        if (this.devServerProcess.stderr) {
          this.devServerProcess.stderr.on('data', async (data) => {
            const message = data.toString();
            await logHandle.write('[ERROR] ' + message + '\n');

            // Only log actual errors to console, not warnings
            if (message.includes('error') || message.includes('EADDRINUSE')) {
              logger.error('Dev server error: ' + message);
            }
          });
        }

        // Catch process errors
        this.devServerProcess.catch((error) => {
          logger.error('Dev server failed: ' + error.message);
        });

        // Clean up log handle when process exits
        this.devServerProcess.then(async () => {
          await logHandle.close();
        }).catch(async () => {
          await logHandle.close();
        });

        // Unref so parent can exit
        if (this.devServerProcess.pid) {
          this.devServerProcess.unref();
        }

        logger.info(`Dev server logs: ${logPath}`);
      }

      // Wait a moment for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      logger.success(`Development server started at http://localhost:${DEFAULT_DEV_PORT}`);
    } catch (error) {
      logger.error('Failed to start development server');
      throw error;
    }
  }

  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.devServerProcess) {
      promises.push(
        new Promise((resolve) => {
          this.devServerProcess!.kill('SIGTERM');
          setTimeout(resolve, 1000);
        })
      );
    }

    if (this.supabaseProcess) {
      promises.push(
        new Promise((resolve) => {
          this.supabaseProcess!.kill('SIGTERM');
          setTimeout(resolve, 1000);
        })
      );
    }

    await Promise.all(promises);
  }

  async updateEnvFile(credentials: { url: string; anonKey: string }): Promise<void> {
    const envPath = path.join(this.projectPath, '.env.local');

    try {
      let envContent = await fs.readFile(envPath, 'utf-8');

      // Update or add the credentials
      envContent = envContent.replace(
        /VITE_SUPABASE_URL=.*/,
        `VITE_SUPABASE_URL=${credentials.url}`
      );
      envContent = envContent.replace(
        /VITE_SUPABASE_ANON_KEY=.*/,
        `VITE_SUPABASE_ANON_KEY=${credentials.anonKey}`
      );

      await fs.writeFile(envPath, envContent);
      logger.success('Updated .env.local with Supabase credentials');
    } catch (error) {
      logger.warning('Could not update .env.local automatically');
    }
  }

  private extractSupabaseCredentials(statusOutput: string): { url: string; anonKey: string } {
    const urlMatch = statusOutput.match(/API URL: (http:\/\/[^\s]+)/);
    const keyMatch = statusOutput.match(/anon key: ([^\s]+)/);

    return {
      url: urlMatch ? urlMatch[1] : 'http://127.0.0.1:54321',
      anonKey: keyMatch ? keyMatch[1] : 'your-anon-key-here',
    };
  }

  async keepAlive(): Promise<void> {
    // Set up signal handlers for graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\nReceived ${signal}, shutting down gracefully...`);
      await this.stopAll();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process alive
    if (this.devServerProcess) {
      await this.devServerProcess;
    }
  }
}

export async function checkDocker(): Promise<boolean> {
  try {
    await execa('docker', ['--version'], { stdio: 'pipe' });
    const { stdout } = await execa('docker', ['info'], { stdio: 'pipe' });
    return stdout.includes('Server Version');
  } catch {
    return false;
  }
}

export async function checkSupabaseCLI(): Promise<boolean> {
  try {
    await execa('supabase', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
