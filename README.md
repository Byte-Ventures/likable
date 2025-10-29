# 🛠️ Likable

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/@byteventures%2Flikable.svg)](https://www.npmjs.com/package/@byteventures/likable)

**AI-powered React and Supabase app builder powered by Claude Code**

Likable is a framework inspired by Lovable.dev that helps you rapidly build React and Supabase applications with AI assistance. It provides opinionated scaffolding, local development with Supabase, and seamless integration with AI coding assistants.

## ✨ Features

- 🧙 **Interactive Wizard**: Run `likable` and get guided from zero to running app
- 🚀 **Quick Setup**: Go from zero to running app in < 5 minutes
- 🤖 **AI-Powered Development**: Works with Gemini (free) or Claude Code (premium)
- 🆓 **Free AI Assistant**: Use Gemini CLI at no cost (60 req/min, 1000/day)
- 📋 **Smart Build Instructions**: LIKABLE.md gives AI precise context about your project
- 📊 **Dev Server Monitoring**: Automatic log tracking (dev-server.log) for debugging
- 🏗️ **Opinionated Stack**: React + Vite + Supabase pre-configured
- 📦 **Feature Templates**: Pre-built auth, payments, uploads, and more
- 🎨 **Component Library Support**: Shadcn UI, Chakra UI, Material UI, or Tailwind
- 🚢 **Easy Deployment**: One-command deployment to Vercel, Netlify, or Cloudflare
- 🔒 **Local Development**: Full local Supabase instance with Docker

## 🎯 Why Likable?

**Free and Open Source (Apache 2.0 License)**
- ✅ **Completely free** - No subscriptions, no usage limits, no paywalls
- ✅ **Open source forever** - Apache 2.0 license with patent protection
- ✅ **Privacy-first** - All development happens locally on your machine
- ✅ **No vendor lock-in** - You own your code and infrastructure

**Likable vs Just Using AI Assistants:**
- ✅ Pre-configured React + Vite + Supabase (30 min → 2 min)
- ✅ Supabase-specific tools (migrations, types, RLS patterns)
- ✅ Feature templates that handle integration complexity
- ✅ Works with free AI (Gemini) or premium (Claude Code)
- ✅ Deployment automation
- ✅ Best practices baked in

**Likable vs Lovable:**
- ✅ Local-first development (full control, works offline)
- ✅ Free and open source (vs $20-40/month)
- ✅ Works with free AI assistants (Gemini)
- ✅ Use your own editor and tools
- ✅ No vendor lock-in
- ✅ Community-driven and extensible

## 📋 Prerequisites

### Required
- **Node.js** >= 18.0.0

### Optional (but recommended for best experience)
- **Docker Desktop** - Enables automatic Supabase startup in the wizard
- **Supabase CLI** - Enables automatic service management
  - macOS: `brew install supabase/tap/supabase`
  - Other: [Supabase CLI docs](https://supabase.com/docs/guides/cli)
- **AI Coding Assistant** - Choose one:
  - **Gemini CLI** (Free) - `npm install -g @google/gemini-cli`
  - **Claude Code** ($20/month) - `npm install -g @anthropic-ai/claude-code`

> **Note:** The wizard will work without these! You can install Docker/Supabase CLI later and set them up manually. The project scaffolding happens regardless of what you have installed.

## 🚀 Quick Start

### The Easy Way (Recommended)

\`\`\`bash
# 1. Install Likable
npm install -g likable

# 2. Run the interactive wizard
likable
\`\`\`

That's it! The wizard will:
- ✅ Check prerequisites and guide you through installation if needed
- ✅ Guide you through project configuration
- ✅ Create your project with selected features
- ✅ Automatically start Supabase and dev server (if Docker/Supabase CLI installed)
- ✅ Offer to set up Claude Desktop integration (optional)

Your app will be running at `http://localhost:5173` in minutes!

> **Don't have Docker or Supabase CLI yet?** No problem! The wizard will create your project and show you how to set them up afterward.

### Alternative: Direct Commands

If you prefer manual control:

\`\`\`bash
# Create a project directly
likable init my-app

# Navigate to project
cd my-app

# Start local Supabase
supabase start

# Copy the API URL and anon key to .env.local

# Start dev server
npm run dev
\`\`\`

Your app is now running at `http://localhost:5173`!

## 🤖 AI-Powered Development

Likable works seamlessly with AI coding assistants to help you build faster:

### Gemini CLI (Free, Recommended)

**Free and powerful** - Perfect for solo developers and teams on a budget!

```bash
# Install Gemini CLI
npm install -g @google/gemini-cli

# Use with your project (wizard handles this automatically)
gemini --yolo
```

**Features:**
- ✅ Completely free with Google account
- ✅ 60 requests/minute, 1,000/day
- ✅ YOLO mode support (auto-accept changes)
- ✅ Full file editing capabilities
- ✅ Perfect for React + Supabase development

### Claude Code (Premium Option)

**Unlimited AI assistance** - Best for professional development with high usage needs.

```bash
# Requires Claude Pro subscription ($20/month)
npm install -g @anthropic-ai/claude-code
```

**Features:**
- 💎 Unlimited requests
- 💎 Premium AI model
- 💎 Advanced reasoning capabilities
- 💎 Priority support

## 📦 CLI Commands

### `likable init [project-name]`

Initialize a new React + Supabase project.

**Options:**
- `--template <template>`: Template to use (default: 'default')
- `--skip-install`: Skip npm install
- `--skip-supabase`: Skip Supabase setup

### `likable add-feature <feature>`

Add a pre-built feature to your project.

**Available features:**
- `auth`: Email/password authentication
- `auth-oauth`: OAuth providers (Google, GitHub, etc.)
- `stripe`: Stripe payments integration
- `uploads`: File upload functionality
- `realtime`: Real-time features

**Options:**
- `-p, --path <path>`: Project path (default: '.')

**Example:**
\`\`\`bash
likable add-feature auth
\`\`\`

### `likable deploy [target]`

Deploy your app to a hosting platform.

**Available targets:**
- `vercel` (default)
- `netlify`
- `cloudflare`

**Options:**
- `-p, --path <path>`: Project path (default: '.')
- `--skip-build`: Skip build step

**Example:**
\`\`\`bash
likable deploy vercel
\`\`\`

### `likable chat`

Start an AI chat session for your project using Claude API.

**Options:**
- `-p, --path <path>`: Project path (default: '.')
- `-k, --api-key <key>`: Claude API key (or set ANTHROPIC_API_KEY env var)

**Example:**
\`\`\`bash
export ANTHROPIC_API_KEY=your-key-here
likable chat
\`\`\`

## 🏗️ Project Structure

\`\`\`
my-app/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   └── migrations/              # Database migrations
├── src/
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   └── supabase.ts         # Supabase client
│   ├── types/
│   │   └── database.ts         # Generated DB types
│   └── utils/                   # Utility functions
├── .env.local                   # Environment variables
├── package.json
├── vite.config.ts
└── tailwind.config.js
\`\`\`

## 🎨 Component Libraries

Likable supports several component libraries:

- **Shadcn UI** (recommended): Tailwind + Radix UI components
- **Chakra UI**: Complete component system
- **Material UI**: Google's Material Design
- **None**: Just Tailwind CSS

## 🗃️ Supabase Integration

### Local Development

\`\`\`bash
# Start local Supabase (requires Docker)
supabase start

# Create a migration
supabase migration new create_posts

# Apply migrations
supabase db reset
\`\`\`

### Generate TypeScript Types

\`\`\`bash
# Via CLI
supabase gen types typescript --local > src/types/database.ts
\`\`\`

### Remote Deployment

\`\`\`bash
# Link to Supabase project
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push
\`\`\`

## 🚢 Deployment

### Vercel (Recommended)

\`\`\`bash
# Install Vercel CLI
npm install -g vercel

# Deploy
likable deploy vercel

# Or manually:
vercel --prod
\`\`\`

### Environment Variables

Make sure to set these in your hosting platform:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key

## 💼 Need Help?

Building a React + Supabase app and want expert guidance? I offer consulting and custom development services:

- **🏗️ Custom Development**: Full-stack app development with React and Supabase
- **💡 Consulting & Architecture**: Best practices, code review, performance optimization
- **📚 Training & Workshops**: Team onboarding and React + Supabase training
- **🚀 Project Kickstart**: Get your app from idea to MVP fast

📧 **Contact**: theodor@byteventures.se
🌐 **Website**: [Byte Ventures](https://byteventures.se)

---

## 🤝 Contributing

Likable is free and open source (Apache 2.0 License). Contributions are welcome!

Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

Likable is licensed under the **Apache License 2.0**.

**This means you can:**
- ✅ Use it for any purpose (personal, commercial, enterprise)
- ✅ Modify and distribute it freely
- ✅ Use it in proprietary software
- ✅ No usage restrictions or costs
- ✅ **Includes patent protection** - Contributors grant you patent rights

**Key benefit over MIT:** Apache 2.0 includes explicit patent grants, protecting you from patent litigation. This is especially important for AI/infrastructure projects.

See [LICENSE.md](LICENSE.md) for full details.

Copyright © 2025 Theodor Storm, Byte Ventures IO AB

## 🐛 Issues & Support

- Report bugs: [GitHub Issues](https://github.com/Byte-Ventures/likable/issues)
- Documentation: [Coming soon]
- Community: [Coming soon]

## 🗺️ Roadmap

### v0.1.3 (Current)
- ✅ Interactive wizard with guided setup
- ✅ Automatic service management (Supabase + dev server)
- ✅ Basic project scaffolding
- ✅ Gemini CLI and Claude Code integration
- ✅ LIKABLE.md system for AI build instructions
- ✅ Automatic dev server startup in background
- ✅ Dev server log monitoring (dev-server.log)
- ✅ Vercel deployment

### v0.2 (Coming Soon)
- 🚧 Auth feature templates
- 🚧 Stripe integration template
- 🚧 File upload template
- 🚧 Real-time features template
- 🚧 More deployment targets

### v0.3 (Future)
- 🔮 AI-powered code generation improvements
- 🔮 Testing utilities
- 🔮 Performance optimization tools
- 🔮 Database seed/fixture management
- 🔮 Component library templates

## 💡 Tips & Best Practices

1. **Start with the wizard**: Run `likable` without arguments for the smoothest setup experience
2. **Use AI assistants**: Gemini CLI (free) or Claude Code (premium) can significantly speed up development
3. **Install Docker + Supabase CLI when ready**: You can start without them, but they enable automatic service management
4. **Keep migrations small**: One logical change per migration
5. **Generate types frequently**: After each migration, regenerate types
6. **Use Row Level Security**: Enable RLS on all tables for security
7. **Environment variables**: Never commit `.env.local` to git

## 🙏 Acknowledgments

- Inspired by [Lovable.dev](https://lovable.dev)
- Built with [Claude Code](https://www.anthropic.com)
- Powered by [Supabase](https://supabase.com)
- Works with [Gemini CLI](https://github.com/google-gemini/gemini-cli) and Claude Code

---

**Happy building with Likable! 🎉**
