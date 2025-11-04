# 🛠️ Likable

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/@byteventures%2Flikable.svg)](https://www.npmjs.com/package/@byteventures/likable)

**AI-powered React and Supabase app builder**

Likable is a framework inspired by Lovable.dev that helps you rapidly build React and Supabase applications with AI assistance. It provides opinionated scaffolding, local development with Supabase, and seamless integration with AI coding assistants.

## 🎯 Why Likable?

**Free and Open Source (Apache 2.0 License)**
- ✅ **Completely free** - No subscriptions, no usage limits, no paywalls
- ✅ **Open source forever** - Apache 2.0 license with patent protection
- ✅ **Privacy-first** - All development happens locally on your machine
- ✅ **No vendor lock-in** - You own your code and infrastructure

## ⚙️ How it works

Likable orchestrates three systems to create an AI-driven development workflow:

### Three-Component Architecture

**1. AI Models (Claude Code / Gemini CLI)**
- Detects installed AI assistants (Claude Code or Gemini CLI)
- Auto-installs free Gemini CLI if none found
- Launches AI with 3-level prompt hierarchy:
  - Static context files (CLAUDE.md/GEMINI.md) - General AI instructions
  - Project context (LIKABLE.md) - Likable-specific workflow and patterns
  - Launch prompt - Initial task (create SPEC.md → build application)

**2. Supabase (Local PostgreSQL)**
- Intelligent port allocation (54321-54329 range with conflict detection)
- Docker-based local database with auth and real-time features
- Automatic credential extraction and environment setup
- Pre-configured client (`src/lib/supabase.ts`) ready for immediate use

**3. Git (Version Control)**
- Initializes repository with appropriate .gitignore
- Commits treated as validation checkpoints, not optional steps
- AI is instructed to commit after each significant change
- Enforces workflow discipline through version control

### Workflow Orchestration

1. **Detection Phase** - Check for AI assistants, Docker, Supabase CLI
2. **Configuration** - AI generates project name from user description
3. **Scaffolding** - Creates React (Vite) + TypeScript + Tailwind + Supabase project
4. **Port Allocation** - Finds available ports for Supabase (PostgreSQL, Studio, etc.) and dev server
5. **Service Startup** - Launches Supabase containers and extracts credentials
6. **Context Generation** - Writes AI instruction files with project-specific details
7. **AI Handoff** - Launches AI with full tool access (npm, supabase, git, file operations)
8. **Autonomous Development** - AI creates SPEC.md, waits for approval, then builds
9. **Validation Loop** - Git commits serve as checkpoints throughout development
10. **Cleanup** - Stops services when AI session ends

### Key Patterns

- **Environment-First Approach**: Instead of generating code, Likable creates perfect development environments with clear instructions
- **Prompt Engineering as Infrastructure**: Static context files guide AI behavior consistently across sessions
- **Validation as Core Principle**: Git commits are mandatory checkpoints, not optional—skipping commits equals validation failure
- **Smart Service Management**: ServiceManager class handles Supabase and dev server lifecycle with proper cleanup
- **Input Sanitization**: 3-level sanitization (user input → CLI args → markdown) removes ANSI codes and control characters

The result: AI receives a fully configured environment, comprehensive context, and clear workflow guardrails to build production-ready applications autonomously.

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

```bash
# Install Likable globally
npm install -g @byteventures/likable

# Start building with AI (quick-start mode)
likable
```

That's it! The wizard will:
- ✅ Check prerequisites and guide you through installation if needed
- ✅ Guide you through project configuration
- ✅ Create your project with selected features
- ✅ Automatically start Supabase and dev server (if Docker/Supabase CLI installed)

## 🏗️ Project Structure

```
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
```

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

See [LICENSE.md](LICENSE.md) for full details.

Copyright © 2025 Theodor Storm, [Byte Ventures IO AB](https://byteventures.se)
