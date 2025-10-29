import { ProjectConfig } from './prompts.js';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

export type AIType = 'claude' | 'gemini';

/**
 * Generate AI context markdown content (CLAUDE.md or GEMINI.md) based on project configuration
 */
export function generateAIContextMd(
  aiType: AIType,
  config: ProjectConfig,
  port: number = 13337,
  autoAccept: boolean = true
): string {
  const hasAuth = config.features.includes('auth-email') || config.features.includes('auth-oauth');
  const hasDatabase = config.features.includes('database');
  const hasUploads = config.features.includes('uploads');
  const hasStripe = config.features.includes('stripe');
  const hasRealtime = config.features.includes('realtime');

  const componentLibraryInfo = {
    shadcn: {
      name: 'Shadcn UI',
      docs: 'https://ui.shadcn.com',
      pattern: 'Copy components from shadcn/ui docs and customize them',
    },
    chakra: {
      name: 'Chakra UI',
      docs: 'https://chakra-ui.com',
      pattern: 'Import components from @chakra-ui/react',
    },
    mui: {
      name: 'Material UI',
      docs: 'https://mui.com',
      pattern: 'Import components from @mui/material',
    },
    none: {
      name: 'Tailwind CSS',
      docs: 'https://tailwindcss.com',
      pattern: 'Build custom components with Tailwind utility classes',
    },
  };

  const libInfo = componentLibraryInfo[config.componentLibrary as keyof typeof componentLibraryInfo] || componentLibraryInfo.none;

  return `# ${config.name}

${config.description}${config.userStory && config.userStory.trim().length > 0 ? `\n\n**Additional Requirements:** ${config.userStory}` : ''}

## 🎯 Your Mission

You are helping build **${config.name}**, a modern web application built with Likable. The development server is running at **http://localhost:${port}** and you have full access to the codebase.

Your job is to implement the app described above. Start building immediately based on the selected features and requirements. Create the database schema, implement authentication, build UI components - whatever is needed to bring this vision to life.

**Important Guidelines:**

1. **You are the technical expert** - Make all technical decisions yourself (libraries, architecture, error handling, security, performance). Choose the best solutions based on modern best practices. The user hired you for your expertise.${autoAccept ? ' You are running in YOLO mode - freely create, edit, and delete files. You can run npm, npx, supabase, git, and node commands WITHOUT ASKING. Just do it!' : ' You are running in Review mode - the user will confirm each file change and tool use.'}

   ⚠️ **CRITICAL: Stay within selected features** - Only use the features and tools listed in the "Selected Features" section below. ${!hasDatabase && !hasAuth && !hasUploads && !hasRealtime ? 'The user did NOT select Supabase features (database, auth, uploads, realtime). Do NOT install or use Supabase. Do NOT suggest adding these features unless the user explicitly asks.' : ''} If you think additional features are needed, explain WHY to the user and ask for permission first.

2. **Ask user-oriented questions only** when you need clarification about:
   - What the feature should do from a user's perspective
   - How the app should behave in specific situations
   - Visual design preferences (colors, layout style, branding)
   - Which features to prioritize if the scope is large

3. **Never ask technical questions** - Don't ask about:
   - Which library or framework to use
   - Technical implementation approaches
   - Architecture decisions
   - Code structure or patterns

4. **Use simple language** - Assume the user is non-technical. Explain what you're building in terms of user-facing features, not technical implementation details.

**Example:**
- ❌ Don't ask: "Should I use WebSockets or Supabase Realtime for multiplayer sync?"
- ✅ Do ask: "When a player joins mid-game, should they start in the lobby or jump right into an active game?"

Start building now with your best technical judgment.

## 🏗️ Tech Stack

- **Frontend:** React ${config.typescript ? '+ TypeScript' : '(JavaScript)'}
- **Build Tool:** Vite (fast HMR, modern bundling)
- **Styling:** Tailwind CSS
- **UI Library:** ${libInfo.name}
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Dev Environment:** Local Supabase instance running in Docker

## 📦 Project Structure

\`\`\`
${config.name}/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/          # Page-level components (routes)
│   ├── lib/            # Utilities and Supabase client
│   ├── hooks/          # Custom React hooks
│   └── App.${config.typescript ? 'tsx' : 'jsx'}
├── supabase/
│   ├── migrations/     # Database schema migrations
│   └── config.toml     # Supabase local config
├── .env.local          # Environment variables (Supabase URL/keys)
└── package.json
\`\`\`

## ✨ Selected Features

${hasAuth ? `### 🔐 Authentication
- Email/password auth ${config.features.includes('auth-oauth') ? 'and OAuth providers' : ''}
- User session management
- Protected routes
- Supabase Auth integration

**Initial Tasks:**
- Create login/signup components
- Set up auth context/provider
- Create protected route wrapper
- Add logout functionality
` : ''}
${hasDatabase ? `### 🗄️ Database
- PostgreSQL via Supabase
- Type-safe queries
- Row Level Security (RLS)

**Initial Tasks:**
- Design database schema
- Create migration files in \`supabase/migrations/\`
- Generate TypeScript types: \`npx supabase gen types typescript\`
- Create database service functions
` : ''}
${hasUploads ? `### 📤 File Uploads
- Supabase Storage buckets
- Image/file upload components
- Public/private file access

**Initial Tasks:**
- Create storage bucket in Supabase
- Build file upload component
- Add image preview functionality
- Set up storage RLS policies
` : ''}
${hasStripe ? `### 💳 Stripe Integration
- Payment processing
- Subscription management
- Webhook handling

**Initial Tasks:**
- Set up Stripe account and get API keys
- Create checkout/payment components
- Set up webhook endpoint
- Add subscription status tracking
` : ''}
${hasRealtime ? `### ⚡ Real-time Features
- Live data synchronization
- WebSocket connections
- Supabase Realtime channels

**Initial Tasks:**
- Subscribe to database changes
- Create real-time hooks
- Build live notification system
- Add presence tracking (optional)
` : ''}

## 🎨 UI Component Library: ${libInfo.name}

**Docs:** ${libInfo.docs}
**Usage:** ${libInfo.pattern}

When building UI:
1. Use ${libInfo.name} for common components (buttons, forms, modals)
2. Customize with Tailwind utility classes
3. Follow responsive design patterns (mobile-first)
4. Ensure accessibility (ARIA labels, keyboard navigation)

## 🧠 Likable Best Practices

### Component Patterns
- **Keep components small and focused** - One component, one responsibility
- **Use custom hooks** for reusable logic (e.g., \`useAuth\`, \`useUser\`)
- **Colocate related code** - Keep components, styles, and tests together
- **Prefer composition** over prop drilling

${hasDatabase || hasAuth || hasUploads || hasRealtime ? `### Supabase Integration
- **Always use Row Level Security (RLS)** on database tables
- **Store Supabase client in \`src/lib/supabase.ts\`**
- **Use \`useEffect\`** for subscriptions, clean up on unmount
- **Type your database:** Generate types with \`npx supabase gen types typescript\`

` : ''}### File Organization
- Place reusable components in \`src/components/\`
- Create feature folders: \`src/features/auth/\`, \`src/features/posts/\`
- Keep API calls in service files: \`src/services/auth.service.ts\`
- Store types in \`src/types/\` or colocate with components

### Development Workflow
${hasDatabase ? `1. **Create database migrations** for schema changes
2. **Generate TypeScript types** after migrations
3. **Build components iteratively** - Start simple, add complexity
4. **Test in browser** at http://localhost:${port}
5. **Use Supabase Studio** at http://localhost:54323 for database inspection` : `1. **Build components iteratively** - Start simple, add complexity
2. **Test in browser** at http://localhost:${port}
3. **Hot reload** - Changes appear instantly in the browser`}

## 🚀 Getting Started

The project is fully set up and running. Here's what to build first:

${hasAuth && hasDatabase ? `1. **Set up the database schema** - Create tables for users, profiles, and core entities
2. **Build authentication flow** - Login, signup, and session management
3. **Create the main dashboard** - Landing page after login
4. **Add core features** - Based on the selected features above
` : hasAuth ? `1. **Build authentication flow** - Login, signup, and session management
2. **Create protected routes** - Dashboard and user-specific pages
3. **Add user profile** - Display and edit user information
` : hasDatabase ? `1. **Design database schema** - Plan your tables and relationships
2. **Create migrations** - Define the schema in SQL
3. **Build CRUD operations** - Create, read, update, delete for main entities
4. **Create UI components** - Forms and lists for data management
` : `1. **Build the main layout** - Navigation, header, footer
2. **Create core pages** - Home, about, features
3. **Add ${libInfo.name} components** - Buttons, cards, forms
4. **Style with Tailwind** - Make it beautiful and responsive
`}

## 💡 Helpful Commands

\`\`\`bash${hasDatabase ? `
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --local > src/types/database.types.ts

# Create a new migration
npx supabase migration new migration_name

# View database in browser
open http://localhost:54323

` : ''}# View app in browser
open http://localhost:${port}${hasDatabase || hasAuth || hasUploads || hasRealtime ? `

# Check Supabase status
npx supabase status` : ''}
\`\`\`

## 📚 Documentation Links

- React: https://react.dev
- Vite: https://vitejs.dev${hasDatabase || hasAuth || hasUploads || hasRealtime ? `
- Supabase: https://supabase.com/docs` : ''}
- ${libInfo.name}: ${libInfo.docs}
- Tailwind CSS: https://tailwindcss.com

---

**Ready to build!** The user's vision is described above. Start implementing immediately based on the selected features and app description. Don't ask for permission - begin building the first version now.
`;
}

/**
 * Generate initial command-line prompt for AI assistant
 */
export function generateAIInitialPrompt(
  aiType: AIType,
  config: ProjectConfig,
  port: number = 13337
): string {
  return 'Read and follow the instructions in LIKABLE.md';
}

/**
 * Write AI context file (CLAUDE.md or GEMINI.md) to project directory
 */
export async function writeAIContextMd(
  aiType: AIType,
  projectPath: string,
  config: ProjectConfig,
  port: number = 13337,
  autoAccept: boolean = true
): Promise<void> {
  try {
    const content = generateAIContextMd(aiType, config, port, autoAccept);
    const fileName = aiType.toUpperCase() + '.md';
    const filePath = path.join(projectPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
    logger.success(`Created ${fileName} with project context`);
  } catch (error) {
    const fileName = aiType.toUpperCase() + '.md';
    logger.warning(`Could not create ${fileName} file`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}

/**
 * Write LIKABLE.md with build instructions for AI assistant
 */
export async function writeLikableMd(
  aiType: AIType,
  projectPath: string,
  config: ProjectConfig,
  port: number = 13337
): Promise<void> {
  try {
    const hasAuth = config.features.includes('auth-email') || config.features.includes('auth-oauth');
    const hasDatabase = config.features.includes('database');

    let buildInstructions = `START BUILDING IMMEDIATELY. The user wants: ${config.description}`;

    if (config.userStory && config.userStory.trim().length > 0) {
      buildInstructions += `. Additional requirements: ${config.userStory}`;
    }

    buildInstructions += '. ';

    if (hasAuth && hasDatabase) {
      buildInstructions +=
        'Your immediate tasks: 1) Create the database schema for this app 2) Set up authentication flow 3) Build the main UI components. Start with step 1 NOW - create the migration files in supabase/migrations/.';
    } else if (hasDatabase) {
      buildInstructions +=
        'Your immediate task: Design and create the database schema based on the app description. Create the migration files NOW in supabase/migrations/.';
    } else if (hasAuth) {
      buildInstructions +=
        'Your immediate task: Build the authentication flow (login, signup, protected routes). Start implementing NOW.';
    } else {
      buildInstructions +=
        'Your immediate task: Build the main layout and core UI components for this app. Start implementing NOW.';
    }

    const contextFile = aiType.toUpperCase() + '.md';
    const content = `IMPORTANT: Be verbose! Explain what you're doing at each step so the user understands your progress.

The dev server is already running at http://localhost:${port}. You can open it in the browser to verify.

IMPORTANT: The dev server logs are being written to dev-server.log in the project root. You should:
- Check this log file periodically (every few minutes) for errors
- If you see compilation errors or warnings, address them immediately
- Use "tail dev-server.log" to see recent output
- If the server crashes, you'll see the error in the log file

Your task: ${buildInstructions}

Throughout the build process, explain what you're creating and why. Keep the user informed of your progress.

See ${contextFile} for full context and best practices.`;

    const filePath = path.join(projectPath, 'LIKABLE.md');
    await fs.writeFile(filePath, content, 'utf-8');
    logger.success('Created LIKABLE.md with build instructions');
  } catch (error) {
    logger.warning('Could not create LIKABLE.md file');
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
