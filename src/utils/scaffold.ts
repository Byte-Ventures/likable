import { promises as fs } from 'fs';
import path from 'path';
import { execa } from 'execa';
import { logger } from './logger.js';
import type { ProjectConfig } from './prompts.js';
import { DEFAULT_DEV_PORT } from './constants.js';

export interface ScaffoldOptions {
  config: ProjectConfig;
  targetPath: string;
  skipInstall?: boolean;
  skipSupabase?: boolean;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
  const { config, targetPath, skipInstall, skipSupabase } = options;

  // Create project directory
  logger.startSpinner(`Creating project directory: ${config.name}`);
  await fs.mkdir(targetPath, { recursive: true });
  logger.succeedSpinner(`Project directory created`);

  // Initialize Vite React project
  logger.startSpinner('Initializing Vite + React project');
  try {
    await execa('npm', [
      'create',
      'vite@latest',
      '.',
      '--',
      '--template',
      config.typescript ? 'react-ts' : 'react',
    ], {
      cwd: targetPath,
      stdio: 'pipe',
    });
    logger.succeedSpinner('Vite + React project initialized');
  } catch (error) {
    logger.failSpinner('Failed to initialize Vite project');
    throw error;
  }

  // Update package.json with additional dependencies
  logger.startSpinner('Updating package.json');
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  packageJson.description = config.description;
  packageJson.dependencies = {
    ...packageJson.dependencies,
    '@supabase/supabase-js': '^2.45.7',
    'react-router-dom': '^7.1.2',
  };

  // Add component library dependencies
  if (config.componentLibrary === 'shadcn') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@radix-ui/react-slot': '^1.1.1',
      'class-variance-authority': '^0.7.1',
      'clsx': '^2.1.1',
      'tailwind-merge': '^2.6.0',
    };
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      'tailwindcss': '^3.4.17',
      'autoprefixer': '^10.4.20',
      'postcss': '^8.4.49',
    };
  } else if (config.componentLibrary === 'chakra') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@chakra-ui/react': '^3.2.3',
      '@emotion/react': '^11.14.0',
      '@emotion/styled': '^11.14.0',
      'framer-motion': '^11.15.0',
    };
  } else if (config.componentLibrary === 'mui') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@mui/material': '^6.3.1',
      '@emotion/react': '^11.14.0',
      '@emotion/styled': '^11.14.0',
    };
  } else if (config.componentLibrary === 'none') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      'tailwindcss': '^3.4.17',
      'autoprefixer': '^10.4.20',
      'postcss': '^8.4.49',
    };
  }

  // Add feature dependencies
  if (config.features.includes('stripe')) {
    packageJson.dependencies['@stripe/stripe-js'] = '^5.6.0';
    packageJson.dependencies['@stripe/react-stripe-js'] = '^3.2.0';
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logger.succeedSpinner('package.json updated');

  // Install dependencies
  if (!skipInstall) {
    logger.startSpinner('Installing dependencies (this may take a minute)');
    try {
      await execa('npm', ['install'], {
        cwd: targetPath,
        stdio: 'pipe',
      });
      logger.succeedSpinner('Dependencies installed');
    } catch (error) {
      logger.failSpinner('Failed to install dependencies');
      throw error;
    }
  }

  // Setup Supabase
  if (!skipSupabase) {
    await setupSupabase(targetPath);
  }

  // Create Supabase client file
  await createSupabaseClient(targetPath, config.typescript);

  // Setup Tailwind if needed
  if (config.componentLibrary === 'shadcn' || config.componentLibrary === 'none') {
    await setupTailwind(targetPath);
  }

  // Create Vite config with custom port
  await createViteConfig(targetPath, DEFAULT_DEV_PORT);

  // Create .env.local file
  await createEnvFile(targetPath);

  // Create basic project structure
  await createProjectStructure(targetPath, config);
}

async function setupSupabase(projectPath: string): Promise<void> {
  logger.startSpinner('Setting up Supabase');

  // Check if supabase CLI is installed
  try {
    await execa('supabase', ['--version'], { stdio: 'pipe' });
  } catch {
    logger.warning('Supabase CLI not found. Please install it: https://supabase.com/docs/guides/cli');
    logger.info('Run: brew install supabase/tap/supabase (macOS)');
    logger.stopSpinner();
    return;
  }

  // Initialize Supabase
  try {
    await execa('supabase', ['init'], {
      cwd: projectPath,
      stdio: 'pipe',
    });
    logger.succeedSpinner('Supabase initialized');
  } catch (error) {
    logger.failSpinner('Failed to initialize Supabase');
    throw error;
  }

  // Start local Supabase (optional - user can do this later)
  logger.info('To start local Supabase, run: cd ' + path.basename(projectPath) + ' && supabase start');
}

async function createSupabaseClient(projectPath: string, typescript: boolean): Promise<void> {
  const ext = typescript ? 'ts' : 'js';
  const libPath = path.join(projectPath, 'src', 'lib');
  await fs.mkdir(libPath, { recursive: true });

  const clientCode = typescript ? `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
` : `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

  await fs.writeFile(path.join(libPath, `supabase.${ext}`), clientCode);
  logger.success('Created Supabase client');
}

async function setupTailwind(projectPath: string): Promise<void> {
  // Create tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

  // Create postcss.config.js
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

  // Create src/index.css with Tailwind directives
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  await fs.writeFile(path.join(projectPath, 'tailwind.config.js'), tailwindConfig);
  await fs.writeFile(path.join(projectPath, 'postcss.config.js'), postcssConfig);
  await fs.writeFile(path.join(projectPath, 'src', 'index.css'), indexCss);

  logger.success('Tailwind CSS configured');
}

async function createViteConfig(projectPath: string, port: number): Promise<void> {
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: ${port},
  },
})
`;

  await fs.writeFile(path.join(projectPath, 'vite.config.ts'), viteConfig);
  logger.success(`Vite configured (port ${port})`);
}

async function createEnvFile(projectPath: string): Promise<void> {
  const envContent = `# Supabase Configuration
# Get these values by running: supabase status
# Or from your Supabase project dashboard
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# For production, replace with your Supabase project URL and keys
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-production-anon-key
`;

  await fs.writeFile(path.join(projectPath, '.env.local'), envContent);
  logger.success('Created .env.local file');
}

async function createProjectStructure(projectPath: string, config: ProjectConfig): Promise<void> {
  const dirs = [
    'src/components',
    'src/pages',
    'src/hooks',
    'src/lib',
    'src/types',
    'src/utils',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
  }

  logger.success('Created project structure');
}

export async function checkPrerequisites(): Promise<{ docker: boolean; supabase: boolean }> {
  let docker = false;
  let supabase = false;

  try {
    await execa('docker', ['--version'], { stdio: 'pipe' });
    docker = true;
  } catch {
    // Docker not installed
  }

  try {
    await execa('supabase', ['--version'], { stdio: 'pipe' });
    supabase = true;
  } catch {
    // Supabase CLI not installed
  }

  return { docker, supabase };
}
