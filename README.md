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
# 1. Install Likable
npm install -g likable

# 2. Run the interactive wizard
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
