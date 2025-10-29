import inquirer from 'inquirer';
import { existsSync } from 'fs';
import path from 'path';

export interface ProjectConfig {
  name: string;
  description: string;
  userStory?: string;
  features: string[];
  componentLibrary: string;
  typescript: boolean;
}

export async function promptProjectConfig(projectName?: string): Promise<ProjectConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: projectName || 'flappy-alpaca',
      validate: (input: string) => {
        // Check format
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must contain only lowercase letters, numbers, and hyphens';
        }

        // Check if folder already exists
        const targetPath = path.resolve(process.cwd(), input);
        if (existsSync(targetPath)) {
          return `Folder "${input}" already exists. Please choose a different name.`;
        }

        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'What do you want to build? Describe your app idea:',
      default: 'Flappy Alpaca - a Flappy Bird style game where you control an alpaca flying through obstacles. Tap or press space to flap and avoid hitting pipes.',
      validate: (input: string) => {
        if (input.length < 10) {
          return 'Please provide a more detailed description (at least 10 characters)';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'userStory',
      message: 'Any specific features or user flows? (optional, press Enter to skip):',
      default: '',
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include (you can add more later):',
      choices: [
        { name: 'Authentication - User login/signup with email', value: 'auth-email' },
        { name: 'OAuth - Login with Google, GitHub, etc.', value: 'auth-oauth' },
        { name: 'Database - Supabase tables for storing data', value: 'database' },
        { name: 'File uploads - Upload and store images/files', value: 'uploads' },
        { name: 'Stripe - Accept payments (subscriptions, checkout)', value: 'stripe' },
        { name: 'Real-time - Live updates (chat, notifications)', value: 'realtime' },
      ],
    },
    {
      type: 'list',
      name: 'componentLibrary',
      message: 'Choose a UI component library (pre-built buttons, forms, etc.):',
      choices: [
        {
          name: 'Shadcn UI - Modern, customizable components (recommended)',
          value: 'shadcn',
        },
        {
          name: 'Chakra UI - Complete design system, fast to build',
          value: 'chakra',
        },
        {
          name: 'Material UI - Google Material Design style',
          value: 'mui',
        },
        {
          name: 'None - Just Tailwind CSS (build everything yourself)',
          value: 'none',
        },
      ],
      default: 'shadcn',
    },
  ]);

  return {
    ...answers,
    typescript: true, // Always use TypeScript
  } as ProjectConfig;
}

export async function promptFeatureConfig(feature: string): Promise<Record<string, unknown>> {
  switch (feature) {
    case 'auth':
    case 'auth-email':
      return await inquirer.prompt([
        {
          type: 'confirm',
          name: 'emailVerification',
          message: 'Enable email verification?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'passwordReset',
          message: 'Include password reset flow?',
          default: true,
        },
      ]);

    case 'auth-oauth':
      return await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'providers',
          message: 'Select OAuth providers:',
          choices: [
            { name: 'Google', value: 'google' },
            { name: 'GitHub', value: 'github' },
            { name: 'Facebook', value: 'facebook' },
            { name: 'Twitter', value: 'twitter' },
          ],
        },
      ]);

    case 'stripe':
      return await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Stripe integration mode:',
          choices: [
            { name: 'Checkout (hosted)', value: 'checkout' },
            { name: 'Payment Elements (embedded)', value: 'elements' },
          ],
        },
      ]);

    default:
      return {};
  }
}

export async function confirmAction(message: string, defaultValue = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  return confirmed;
}
