import { promises as fs } from 'fs';
import path from 'path';
import { execa } from 'execa';
import { logger } from './logger.js';
import type { ProjectConfig } from './prompts.js';
import { DEFAULT_DEV_PORT } from './constants.js';
import { allocateSupabasePorts, updateSupabaseConfig, updateEnvWithPorts, type SupabasePortConfig } from './portManager.js';

export interface ScaffoldOptions {
  config: ProjectConfig;
  targetPath: string;
  skipInstall?: boolean;
  skipSupabase?: boolean;
  hasGit?: boolean;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
  const { config, targetPath, skipInstall, skipSupabase, hasGit } = options;

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
    'react-markdown': '^9.0.1',
  };

  // Ensure TypeScript and Supabase CLI are available
  if (config.typescript) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      'typescript': '^5.7.2',
      'supabase': '^2.54.11',
    };
  }

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

  // Setup Supabase and allocate ports
  let supabasePorts: SupabasePortConfig | undefined;
  if (!skipSupabase) {
    supabasePorts = await setupSupabase(targetPath);
  }

  // Create Supabase client file
  await createSupabaseClient(targetPath, config.typescript);

  // Setup Tailwind if needed
  if (config.componentLibrary === 'shadcn' || config.componentLibrary === 'none') {
    await setupTailwind(targetPath);
  }

  // Create Vite config with custom port
  await createViteConfig(targetPath, DEFAULT_DEV_PORT);

  // Create .env.local file with correct Supabase URL
  if (supabasePorts) {
    await createEnvFile(targetPath, supabasePorts);
  } else {
    // Create with default ports if Supabase was skipped
    await createEnvFile(targetPath, {
      api: 54321,
      db: 54322,
      studio: 54323,
      inbucket: 54324,
      analytics: 54327,
      pooler: 54329,
    });
  }

  // Create basic project structure
  await createProjectStructure(targetPath, config);

  // Initialize Git repository if git is available
  if (hasGit) {
    await createGitignore(targetPath);
    await initGitRepository(targetPath);
  }
}

async function setupSupabase(projectPath: string): Promise<SupabasePortConfig> {
  logger.startSpinner('Setting up Supabase');

  // Initialize Supabase using npx (CLI is now a dev dependency)
  try {
    await execa('npx', ['supabase', 'init'], {
      cwd: projectPath,
      stdio: 'pipe',
    });
    logger.succeedSpinner('Supabase initialized');
  } catch (error) {
    logger.failSpinner('Failed to initialize Supabase');
    throw error;
  }

  // Allocate ports for Supabase services
  logger.startSpinner('Checking port availability');
  const ports = await allocateSupabasePorts();

  // Update config.toml if using non-default ports
  if (ports.api !== 54321) {
    logger.succeedSpinner(`Using alternative ports (base: ${ports.api})`);
    logger.startSpinner('Updating Supabase configuration');
    await updateSupabaseConfig(projectPath, ports);
    logger.succeedSpinner('Supabase configuration updated');
  } else {
    logger.succeedSpinner('Using default ports');
  }

  // Start local Supabase (optional - user can do this later)
  logger.info('To start local Supabase, run: cd ' + path.basename(projectPath) + ' && npx supabase start');

  return ports;
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

async function createEnvFile(projectPath: string, ports: SupabasePortConfig): Promise<void> {
  const apiUrl = `http://127.0.0.1:${ports.api}`;
  const envContent = `# Supabase Configuration
# Get these values by running: supabase status
# Or from your Supabase project dashboard
VITE_SUPABASE_URL=${apiUrl}
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

export async function checkPrerequisites(): Promise<{ docker: boolean; git: boolean }> {
  let docker = false;
  let git = false;

  try {
    await execa('docker', ['--version'], { stdio: 'pipe' });
    docker = true;
  } catch {
    // Docker not installed
  }

  try {
    await execa('git', ['--version'], { stdio: 'pipe' });
    git = true;
  } catch {
    // Git not installed
  }

  return { docker, git };
}

async function createGitignore(projectPath: string): Promise<void> {
  const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/dist
/build

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Supabase
.branches
.temp
`;

  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
  logger.success('Created .gitignore');
}

async function initGitRepository(projectPath: string): Promise<void> {
  logger.startSpinner('Initializing git repository');

  try {
    await execa('git', ['init'], {
      cwd: projectPath,
      stdio: 'pipe',
    });
    logger.succeedSpinner('Git repository initialized');
  } catch (error) {
    logger.failSpinner('Failed to initialize git repository');
    throw error;
  }
}
