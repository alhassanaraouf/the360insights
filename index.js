#!/usr/bin/env node

/**
 * Production entry point for Replit deployment
 * This file is expected by the deployment system and redirects to the built application
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built application
const distIndexPath = join(__dirname, 'dist', 'index.js');

console.log('🚀 Starting Taekwondo Analytics Platform...');
console.log(`📁 Starting from: ${distIndexPath}`);

// Start the built application
const child = spawn('node', [distIndexPath], {
  stdio: 'inherit',
  cwd: join(__dirname, 'dist'),
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle process signals
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});

// Handle child process exit
child.on('close', (code) => {
  console.log(`📊 Application exited with code ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});