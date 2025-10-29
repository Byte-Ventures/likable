# Contributing to Likable

Thank you for your interest in contributing to Likable! This document provides guidelines for contributing to the project.

## License Note

Likable uses the **Apache License 2.0**. This means your contributions will be freely available for anyone to use, modify, and distribute, with explicit patent protection.

By contributing, you agree that:
- Your contributions will be licensed under the Apache License 2.0
- You grant a patent license for any patents you may have that are infringed by your contribution
- You have the right to submit the contribution
- Your work becomes part of the open source project

**Why Apache 2.0?** It includes explicit patent grants, protecting both contributors and users from patent litigation. This is especially important for AI/infrastructure projects.

Please review [LICENSE.md](LICENSE.md) before contributing.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/Byte-Ventures/likable/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment (OS, Node version, etc.)
  - Screenshots if applicable

### Suggesting Features

- Open an issue with the label `enhancement`
- Describe the feature and its use case
- Explain how it aligns with Likable's goals

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/Byte-Ventures/likable.git
   cd likable
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run build
   npm run lint

   # Test the CLI locally
   node dist/cli.js --help
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

   Use conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/Byte-Ventures/likable.git
cd likable

# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run dev
```

### Project Structure

```
likable/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── commands/           # CLI command implementations
│   ├── mcp/                # MCP server and tools
│   │   ├── server.ts       # MCP server
│   │   └── tools/          # MCP tool implementations
│   └── utils/              # Utility functions
├── dist/                   # Compiled output
├── package.json
└── tsconfig.json
```

## Code Style

- Use TypeScript for all new code
- Follow existing formatting (Prettier config)
- Use ESLint rules
- Write descriptive variable and function names
- Add JSDoc comments for public APIs

## Adding New Features

### Adding a CLI Command

1. Create a new file in `src/commands/`
2. Implement the command function
3. Export it from `src/index.ts`
4. Register it in `src/cli.ts`

Example:
```typescript
// src/commands/my-command.ts
import { logger } from '../utils/logger.js';

export async function myCommand(args: string[]): Promise<void> {
  logger.header('My Command');
  // Implementation
}
```

### Adding an MCP Tool

1. Create a new file in `src/mcp/tools/`
2. Define the tool interface and function
3. Register it in `src/mcp/server.ts`

Example:
```typescript
// src/mcp/tools/my-tool.ts
interface MyToolArgs {
  param: string;
}

export async function myTool(args: MyToolArgs) {
  // Implementation
  return {
    content: [{ type: 'text', text: 'Result' }]
  };
}
```

### Adding a Feature Template

1. Create template files in `src/templates/`
2. Implement scaffolding logic in `src/utils/scaffold.ts`
3. Add feature to `src/commands/add-feature.ts`

## Testing

Currently, Likable doesn't have automated tests (contributions welcome!). Please test manually:

```bash
# Build the project
npm run build

# Test CLI commands
node dist/cli.js --version
node dist/cli.js --help
node dist/cli.js init test-app

# Test wizard
node dist/cli.js
```

## Documentation

When adding features:
- Update README.md
- Add examples
- Update CLI help text
- Add inline code comments

## Questions?

- Open an issue with the `question` label
- Tag maintainers if urgent

## Code of Conduct

Be respectful, constructive, and professional. We're all here to build something useful together.

Thank you for contributing! 🎉
