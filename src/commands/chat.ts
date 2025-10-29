import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import inquirer from 'inquirer';

interface ChatOptions {
  path?: string;
  apiKey?: string;
}

export async function chatCommand(options: ChatOptions): Promise<void> {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.error('Claude API key not found');
    logger.info('Set ANTHROPIC_API_KEY environment variable or use --api-key option');
    logger.info('Get your API key from: https://console.anthropic.com/');
    process.exit(1);
  }

  logger.header('💬 Likable AI Chat');
  logger.info('Chat with Claude to build your app');
  logger.info('Type "exit" to quit');
  logger.blank();

  const anthropic = new Anthropic({ apiKey });
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add system context
  const systemPrompt = `You are an AI assistant helping to build a React and Supabase application using Likable.
The user's project is located at: ${options.path || process.cwd()}

Your role is to:
1. Help implement features using React and Supabase best practices
2. Suggest code changes and explain them clearly
3. Guide the user on project structure and architecture
4. Help debug issues

Always provide clear, actionable advice and code examples.`;

  while (true) {
    // Get user input
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: 'You:',
      },
    ]);

    if (message.toLowerCase() === 'exit') {
      logger.info('Goodbye! 👋');
      break;
    }

    conversationHistory.push({ role: 'user', content: message });

    logger.startSpinner('Claude is thinking...');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationHistory,
      });

      logger.stopSpinner();

      const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
      conversationHistory.push({ role: 'assistant', content: assistantMessage });

      logger.info('\nClaude:');
      console.log(assistantMessage);
      logger.blank();
    } catch (error) {
      logger.stopSpinner();
      logger.error('Failed to get response from Claude');
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  }
}
