#!/usr/bin/env bun
/**
 * Proof of Concept: Embedded Terminal using Alternate Screen Buffer
 *
 * This demonstrates how worktree-cli could embed a terminal session
 * without spawning external windows/tabs.
 *
 * Run with: bun run docs/poc-example.ts
 */

import { spawn } from 'child_process';

/**
 * Opens a shell in the alternate screen buffer.
 * When the user exits the shell, returns to the original screen.
 */
function openEmbeddedShell(workingDir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log('Opening embedded shell...\n');

    // Small delay to let the message display
    setTimeout(() => {
      // Enable alternate screen buffer
      process.stdout.write('\x1b[?1049h');

      // Clear the alternate screen and move cursor to top-left
      process.stdout.write('\x1b[2J\x1b[H');

      // Print a welcome message
      process.stdout.write('╔═══════════════════════════════════════════════╗\n');
      process.stdout.write('║  Embedded Terminal - Alternate Screen Buffer ║\n');
      process.stdout.write('╚═══════════════════════════════════════════════╝\n\n');
      process.stdout.write(`Working directory: ${workingDir}\n`);
      process.stdout.write('Type "exit" or press Ctrl+D to return\n\n');

      // Get the user's shell
      const shell = process.env.SHELL || '/bin/bash';

      // Spawn shell with inherited stdio (direct terminal access)
      const proc = spawn(shell, [], {
        cwd: workingDir,
        stdio: 'inherit',
        env: process.env,
      });

      proc.on('exit', (code) => {
        // Restore original screen buffer
        process.stdout.write('\x1b[?1049l');

        console.log('\nReturned to original screen!');
        resolve(code || 0);
      });

      proc.on('error', (err) => {
        // Restore screen even on error
        process.stdout.write('\x1b[?1049l');
        reject(err);
      });
    }, 500);
  });
}

/**
 * Executes a command in the alternate screen buffer.
 * Shows output, waits for user input, then returns.
 */
function executeInEmbeddedTerminal(
  command: string,
  workingDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Enable alternate screen
    process.stdout.write('\x1b[?1049h');

    // Clear and position cursor
    process.stdout.write('\x1b[2J\x1b[H');

    // Header
    process.stdout.write('╔═══════════════════════════════════════════════╗\n');
    process.stdout.write('║         Executing Command in Embedded Terminal        ║\n');
    process.stdout.write('╚═══════════════════════════════════════════════╝\n\n');
    process.stdout.write(`Command: ${command}\n`);
    process.stdout.write(`Directory: ${workingDir}\n`);
    process.stdout.write('─'.repeat(50) + '\n\n');

    const proc = spawn('/bin/sh', ['-c', command], {
      cwd: workingDir,
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('exit', (code) => {
      // Show completion message
      process.stdout.write('\n' + '─'.repeat(50) + '\n');
      if (code === 0) {
        process.stdout.write('✓ Command completed successfully\n\n');
      } else {
        process.stdout.write(`✗ Command exited with code ${code}\n\n`);
      }

      process.stdout.write('Press any key to return to main screen...');

      // Enable raw mode to capture single keypress
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const handler = () => {
        process.stdin.off('data', handler);
        process.stdin.setRawMode(false);
        process.stdin.pause();

        // Restore original screen
        process.stdout.write('\x1b[?1049l');

        resolve();
      };

      process.stdin.once('data', handler);
    });

    proc.on('error', (err) => {
      // Restore screen on error
      process.stdout.write('\x1b[?1049l');
      reject(err);
    });
  });
}

/**
 * Simulates the worktree-cli main screen
 */
function showMainScreen() {
  console.clear();
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║          worktree-cli - POC Demo              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log('This demonstrates embedded terminal functionality.');
  console.log('');
  console.log('Options:');
  console.log('  1) Open embedded shell (alternate screen buffer)');
  console.log('  2) Run command in embedded terminal');
  console.log('  3) Exit demo');
  console.log('');
}

/**
 * Main demo application
 */
async function main() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      readline.question(prompt, resolve);
    });
  };

  let running = true;

  while (running) {
    showMainScreen();

    const choice = await question('Choose an option (1-3): ');

    switch (choice.trim()) {
      case '1':
        console.log('\n📂 Opening embedded shell in current directory...');
        try {
          await openEmbeddedShell(process.cwd());
        } catch (error) {
          console.error('Error:', error);
        }
        break;

      case '2':
        const command = await question('\nEnter command to run: ');
        console.log('');
        try {
          await executeInEmbeddedTerminal(command, process.cwd());
        } catch (error) {
          console.error('Error:', error);
        }
        break;

      case '3':
        console.log('\n👋 Goodbye!\n');
        running = false;
        break;

      default:
        console.log('\n❌ Invalid option. Press Enter to continue...');
        await question('');
    }
  }

  readline.close();
}

// Run the demo
main().catch(console.error);
