import { execa } from 'execa';
import type { ResultPromise } from 'execa';
import { logger } from './logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { DEFAULT_DEV_PORT } from './constants.js';
import { cleanupSupabaseConfig } from './portManager.js';

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
    logger.info(`ServiceManager initialized for: ${projectPath}`);
  }

  async startSupabase(skipExistingCheck: boolean = false): Promise<{ url: string; anonKey: string }> {
    if (!skipExistingCheck) {
      logger.startSpinner('Checking Supabase status...');

      try {
        // Check if Supabase is already running
        logger.info(`Running: npx supabase status --output json (cwd: ${this.projectPath})`);
        const { stdout } = await execa('npx', ['supabase', 'status', '--output', 'json'], {
          cwd: this.projectPath,
          stdio: 'pipe',
        });

        logger.info(`Supabase status output: ${stdout}`);
        const status = JSON.parse(stdout);

        // Only consider it "running" if we have API credentials, not just DB_URL
        if (status.API_URL || status['API URL'] || status.api_url) {
          logger.succeedSpinner('Supabase is already running');
          logger.info(`Found API URL in status output for ${this.projectPath}`);
          return this.extractSupabaseCredentialsFromJSON(stdout);
        } else {
          logger.info('Supabase status returned incomplete data (no API_URL), will start fresh');
        }
      } catch (error) {
        logger.info(`Supabase status check failed: ${error instanceof Error ? error.message : String(error)}`);
        // Not running, need to start
      }

      logger.succeedSpinner('Supabase status checked');
    }

    logger.startSpinner('Starting Supabase...');

    try {
      logger.blank();
      logger.info('This may take a minute on first run (downloading Docker images)...');
      logger.blank();

      // Clean up deprecated config keys before starting
      await cleanupSupabaseConfig(this.projectPath);

      // Start Supabase (without --output flag as it doesn't produce valid JSON)
      logger.info(`Running: npx supabase start (cwd: ${this.projectPath})`);
      await execa('npx', ['supabase', 'start'], {
        cwd: this.projectPath,
        stdio: 'inherit', // Show Docker pull progress and startup logs to user
      });

      logger.blank();

      // Now get the status in JSON format (this actually works unlike start --output json)
      logger.info(`Running: npx supabase status --output json (cwd: ${this.projectPath})`);
      const { stdout } = await execa('npx', ['supabase', 'status', '--output', 'json'], {
        cwd: this.projectPath,
        stdio: 'pipe',
      });

      logger.info(`Supabase status output: ${stdout}`);
      logger.succeedSpinner('Supabase started successfully');
      return this.extractSupabaseCredentialsFromJSON(stdout);
    } catch (error: any) {
      logger.failSpinner('Failed to start Supabase');
      logger.blank();

      // Show the error output to user since we're using stdio: 'pipe'
      if (error.stdout) {
        logger.info('Supabase output:');
        console.log(error.stdout);
      }
      if (error.stderr) {
        logger.error('Supabase error output:');
        console.error(error.stderr);
      }

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
            await execa('npx', ['supabase', 'stop', '--no-backup'], {
              cwd: this.projectPath,
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

  async startDevServer(background: boolean = false, port: number = DEFAULT_DEV_PORT): Promise<void> {
    logger.info('Starting development server...');

    try {
      this.devServerProcess = execa('npm', ['run', 'dev', '--', '--port', port.toString()], {
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

      logger.success(`Development server started at http://localhost:${port}`);
    } catch (error) {
      logger.error('Failed to start development server');
      throw error;
    }
  }

  async stopSupabase(): Promise<void> {
    try {
      logger.info('Stopping Supabase...');
      await execa('npx', ['supabase', 'stop', '--no-backup'], {
        cwd: this.projectPath,
        stdio: 'pipe',
      });
      logger.success('Supabase stopped');
    } catch (error) {
      // Supabase might not be running, which is fine
      logger.info('Supabase was not running or already stopped');
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

    // Also stop Supabase Docker containers
    promises.push(this.stopSupabase());

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

  private extractSupabaseCredentialsFromJSON(jsonOutput: string): { url: string; anonKey: string } {
    try {
      const status = JSON.parse(jsonOutput);
      logger.info(`JSON keys present: ${Object.keys(status).join(', ')}`);

      // Try various field name patterns that Supabase CLI might use
      const url = status.API_URL || status['API URL'] || status.api_url || 'http://127.0.0.1:54321';
      const anonKey =
        status.PUBLISHABLE_KEY ||
        status['Publishable key'] ||
        status.publishable_key ||
        status.ANON_KEY ||
        status['anon key'] ||
        status.anon_key ||
        'your-anon-key-here';

      logger.info(`Extracted URL: ${url}`);
      if (anonKey === 'your-anon-key-here') {
        logger.warning('Could not find PUBLISHABLE_KEY or ANON_KEY in JSON output');
        logger.info(`Available keys: ${Object.keys(status).join(', ')}`);
      } else {
        logger.info(`Extracted anon key: ${anonKey.substring(0, 15)}...${anonKey.substring(anonKey.length - 5)}`);
      }

      return { url, anonKey };
    } catch (error) {
      // JSON parsing failed, fall back to regex extraction
      logger.warning('Failed to parse JSON output, trying regex fallback');
      logger.error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
      logger.info(`Raw output: ${jsonOutput.substring(0, 200)}...`);
      return this.extractSupabaseCredentials(jsonOutput);
    }
  }

  private extractSupabaseCredentials(statusOutput: string): { url: string; anonKey: string } {
    const urlMatch = statusOutput.match(/API URL:\s*(http:\/\/[^\s]+)/);
    // Supabase CLI changed "anon key" to "Publishable key" in newer versions
    // Handle various whitespace and capitalization patterns
    const keyMatch = statusOutput.match(/(?:anon\s*key|Publishable\s*key)\s*:\s*([^\s]+)/i);

    if (!keyMatch) {
      // Fallback: try to find JWT-like token (eyJ...) or sb_publishable_... format
      const tokenMatch = statusOutput.match(/\b((?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)|(?:sb_publishable_[A-Za-z0-9_-]+))/);
      if (tokenMatch) {
        return {
          url: urlMatch ? urlMatch[1] : 'http://127.0.0.1:54321',
          anonKey: tokenMatch[1],
        };
      }
    }

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
