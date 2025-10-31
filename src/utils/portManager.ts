import net from 'net';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

export interface SupabasePortConfig {
  api: number;        // Kong API Gateway (default 54321)
  db: number;         // PostgreSQL (default 54322)
  studio: number;     // Studio UI (default 54323)
  inbucket: number;   // Email testing (default 54324)
  analytics: number;  // Logflare analytics (default 54327)
  pooler: number;     // PgBouncer connection pooler (default 54329)
}

const DEFAULT_PORTS: SupabasePortConfig = {
  api: 54321,
  db: 54322,
  studio: 54323,
  inbucket: 54324,
  analytics: 54327,
  pooler: 54329,
};

/**
 * Check if a port is available for use
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false); // Treat other errors as unavailable
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find an available port range starting from basePort
 * Returns the base port of an available range, or null if none found
 */
async function findAvailablePortRange(
  basePort: number,
  portOffsets: number[]
): Promise<number | null> {
  const maxAttempts = 50; // Check up to 50 different base ports

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateBase = basePort + (attempt * 100); // Jump by 100 to avoid conflicts
    let allAvailable = true;

    // Check if all ports in the range are available
    for (const offset of portOffsets) {
      const port = candidateBase + offset;
      if (!(await isPortAvailable(port))) {
        allAvailable = false;
        break;
      }
    }

    if (allAvailable) {
      return candidateBase;
    }
  }

  return null; // Couldn't find available range
}

/**
 * Allocate ports for Supabase services
 * Returns either default ports or an alternative range if defaults are in use
 */
export async function allocateSupabasePorts(): Promise<SupabasePortConfig> {
  // Check if all default ports are available
  let allDefaultsAvailable = true;
  for (const port of Object.values(DEFAULT_PORTS)) {
    if (!(await isPortAvailable(port))) {
      allDefaultsAvailable = false;
      break;
    }
  }

  if (allDefaultsAvailable) {
    return DEFAULT_PORTS;
  }

  // Calculate offsets from base port (54321)
  const offsets = [
    0,  // api: 54321
    1,  // db: 54322
    2,  // studio: 54323
    3,  // inbucket: 54324
    6,  // analytics: 54327
    8,  // pooler: 54329
  ];

  // Find alternative range
  const newBasePort = await findAvailablePortRange(54321, offsets);

  if (!newBasePort) {
    throw new Error(
      'Unable to find available port range for Supabase services. ' +
      'Please free up ports or manually configure in supabase/config.toml'
    );
  }

  // Calculate offset from default base
  const portShift = newBasePort - 54321;

  return {
    api: DEFAULT_PORTS.api + portShift,
    db: DEFAULT_PORTS.db + portShift,
    studio: DEFAULT_PORTS.studio + portShift,
    inbucket: DEFAULT_PORTS.inbucket + portShift,
    analytics: DEFAULT_PORTS.analytics + portShift,
    pooler: DEFAULT_PORTS.pooler + portShift,
  };
}

/**
 * Allocate an available port for the dev server
 * Tries random ports between minPort and maxPort
 * Returns an available port or 13337 as fallback
 */
export async function allocateDevPort(
  minPort: number = 13337,
  maxPort: number = 65535
): Promise<number> {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random port in range
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // Fallback to default if all random attempts fail
  logger.warning('Could not find random port, using default 13337');
  return 13337;
}

/**
 * Remove deprecated configuration keys from Supabase config.toml
 * @param projectPath - Absolute path to the project root directory
 */
export async function cleanupSupabaseConfig(projectPath: string): Promise<void> {
  const configPath = path.join(projectPath, 'supabase', 'config.toml');

  try {
    // Read existing config.toml
    let content = await fs.readFile(configPath, 'utf-8');

    // Remove deprecated email_optional key from auth.external[apple] section
    // This key is no longer supported in newer Supabase versions
    content = content.replace(
      /(\[auth\.external\.apple\][^\[]*?)email_optional\s*=\s*[^\n]+\n/s,
      '$1'
    );

    await fs.writeFile(configPath, content, 'utf-8');
  } catch (error) {
    // Silently fail if config doesn't exist yet
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      logger.warning('Could not clean up supabase/config.toml');
    }
  }
}

/**
 * Update Supabase config.toml with custom ports
 */
export async function updateSupabaseConfig(
  projectPath: string,
  ports: SupabasePortConfig
): Promise<void> {
  const configPath = path.join(projectPath, 'supabase', 'config.toml');

  try {
    // Read existing config.toml (created by supabase init)
    let content = await fs.readFile(configPath, 'utf-8');

    // Update API port - match section header through to port value, replace only the number
    content = content.replace(
      /(\[api\][^\[]*port\s*=\s*)\d+/,
      `$1${ports.api}`
    );

    // Update DB port (matches first 'port' in [db] section, before any subsections)
    content = content.replace(
      /(\[db\]\s*[^\[]*?port\s*=\s*)\d+/,
      `$1${ports.db}`
    );

    // Update Studio port
    content = content.replace(
      /(\[studio\][^\[]*port\s*=\s*)\d+/,
      `$1${ports.studio}`
    );

    // Update Inbucket port (main port only, not smtp_port or pop3_port)
    content = content.replace(
      /(\[inbucket\][^\[]*?port\s*=\s*)\d+/,
      `$1${ports.inbucket}`
    );

    // Update Analytics port (main port only, not vector_port)
    content = content.replace(
      /(\[analytics\][^\[]*?port\s*=\s*)\d+/,
      `$1${ports.analytics}`
    );

    // Update Pooler port (nested section [db.pooler])
    content = content.replace(
      /(\[db\.pooler\][^\[]*port\s*=\s*)\d+/,
      `$1${ports.pooler}`
    );

    await fs.writeFile(configPath, content, 'utf-8');
    logger.success(`Updated Supabase ports in config.toml`);
  } catch (error) {
    logger.warning('Could not update supabase/config.toml with custom ports');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}

/**
 * Update .env.local file with correct Supabase URL based on allocated ports
 */
export async function updateEnvWithPorts(
  projectPath: string,
  ports: SupabasePortConfig
): Promise<void> {
  const envPath = path.join(projectPath, '.env.local');
  const apiUrl = `http://127.0.0.1:${ports.api}`;

  try {
    // Read existing .env.local
    let content = await fs.readFile(envPath, 'utf-8');

    // Replace Supabase URL
    content = content.replace(
      /VITE_SUPABASE_URL=.*/,
      `VITE_SUPABASE_URL=${apiUrl}`
    );

    await fs.writeFile(envPath, content, 'utf-8');
  } catch (error) {
    logger.warning('Could not update .env.local with Supabase URL');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
