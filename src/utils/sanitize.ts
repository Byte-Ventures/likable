/**
 * Input sanitization utilities for cleaning user input before sending to AI agents
 * or external processes. Removes potentially harmful control characters and escape sequences.
 */

/**
 * Sanitizes user input by removing ANSI escape codes, control characters,
 * and other potentially problematic sequences.
 *
 * This function protects against injection attacks when user input is passed to:
 * - AI agent CLIs (Claude Code, Gemini CLI)
 * - stdin of external processes
 * - Command-line arguments
 * - Files that AI agents will read
 *
 * @param input - The raw user input string to sanitize
 * @returns Sanitized string safe for use in prompts and CLI arguments
 *
 * @example
 * ```typescript
 * const userInput = "Build a \x1b[31mred\x1b[0m app";
 * const safe = sanitizeUserInput(userInput);
 * // Returns: "Build a red app"
 * ```
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return (
    input
      // Remove ANSI escape sequences (CSI sequences like \x1B[...m)
      // Pattern matches: ESC [ ... letter
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')

      // Remove other ANSI escape sequences (OSC, ESC with other formats)
      // Pattern matches: ESC followed by various control sequences
      .replace(/\x1B[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')

      // Remove C0 control characters except common whitespace
      // Keeps: tab (0x09), newline (0x0A), carriage return (0x0D)
      // Removes: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')

      // Remove C1 control characters (0x80-0x9F)
      .replace(/[\x80-\x9F]/g, '')

      // Remove DEL character (0x7F)
      .replace(/\x7F/g, '')

      // Remove zero-width characters that could be used for obfuscation
      .replace(/[\u200B-\u200D\uFEFF]/g, '')

      // Normalize whitespace: collapse multiple spaces/tabs to single space
      .replace(/[ \t]+/g, ' ')

      // Normalize newlines: collapse multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')

      // Trim leading and trailing whitespace
      .trim()
  );
}

/**
 * Sanitizes input specifically for use in shell command arguments.
 * More aggressive than general sanitization, removes newlines entirely.
 *
 * @param input - The raw user input string to sanitize for CLI usage
 * @returns Sanitized string safe for use as command-line arguments
 *
 * @example
 * ```typescript
 * const description = "Build an app\nwith multiple lines";
 * const safe = sanitizeForCLI(description);
 * // Returns: "Build an app with multiple lines"
 * ```
 */
export function sanitizeForCLI(input: string): string {
  // First apply general sanitization
  let sanitized = sanitizeUserInput(input);

  // For CLI arguments, also remove/replace newlines with spaces
  sanitized = sanitized.replace(/[\r\n]+/g, ' ');

  // Collapse any resulting multiple spaces
  sanitized = sanitized.replace(/\s{2,}/g, ' ');

  return sanitized.trim();
}

/**
 * Sanitizes input for markdown files.
 * Preserves newlines and basic formatting but removes control characters.
 *
 * @param input - The raw user input string to sanitize for markdown
 * @returns Sanitized string safe for markdown files
 *
 * @example
 * ```typescript
 * const story = "# My App\n\nBuild a great app";
 * const safe = sanitizeForMarkdown(story);
 * // Preserves markdown structure while removing escape codes
 * ```
 */
export function sanitizeForMarkdown(input: string): string {
  // Use general sanitization which preserves newlines
  // but removes control characters and escape sequences
  return sanitizeUserInput(input);
}
