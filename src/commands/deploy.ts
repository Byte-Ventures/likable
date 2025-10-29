import { logger } from '../utils/logger.js';
import { execa } from 'execa';

interface DeployOptions {
  path?: string;
  skipBuild?: boolean;
}

export async function deployCommand(
  target: string,
  options: DeployOptions
): Promise<void> {
  const projectPath = options.path || '.';

  logger.header(`🚀 Deploying to ${target}`);

  // Build the project
  if (!options.skipBuild) {
    logger.startSpinner('Building project');
    try {
      await execa('npm', ['run', 'build'], {
        cwd: projectPath,
        stdio: 'pipe',
      });
      logger.succeedSpinner('Build completed');
    } catch (error) {
      logger.failSpinner('Build failed');
      throw error;
    }
  }

  // Deploy based on target
  logger.startSpinner(`Deploying to ${target}`);

  switch (target) {
    case 'vercel':
      await deployToVercel(projectPath);
      break;

    case 'netlify':
      await deployToNetlify(projectPath);
      break;

    case 'cloudflare':
      await deployToCloudflare(projectPath);
      break;

    default:
      logger.failSpinner(`Unknown deployment target: ${target}`);
      logger.info('Available targets: vercel, netlify, cloudflare');
      return;
  }

  logger.succeedSpinner('Deployment successful!');
}

async function deployToVercel(projectPath: string): Promise<void> {
  // Check if Vercel CLI is installed
  try {
    await execa('vercel', ['--version'], { stdio: 'pipe' });
  } catch {
    logger.warning('Vercel CLI not found');
    logger.info('Install it: npm install -g vercel');
    throw new Error('Vercel CLI not installed');
  }

  // Deploy
  await execa('vercel', ['--prod'], {
    cwd: projectPath,
    stdio: 'inherit',
  });
}

async function deployToNetlify(projectPath: string): Promise<void> {
  // TODO: Implement Netlify deployment
  logger.info('Netlify deployment - coming soon!');
  logger.info('For now, use: netlify deploy --prod');
}

async function deployToCloudflare(projectPath: string): Promise<void> {
  // TODO: Implement Cloudflare Pages deployment
  logger.info('Cloudflare Pages deployment - coming soon!');
  logger.info('For now, use: wrangler pages publish dist');
}
