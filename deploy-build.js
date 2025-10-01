#!/usr/bin/env node
/**
 * Enhanced deployment build script
 * Addresses ESBuild ESM compatibility issues and external package resolution
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Comprehensive list of external packages to prevent bundling issues
const externalPackages = [
  // Database and core externals
  '@neondatabase/serverless',
  'ws',
  
  // Problematic packages mentioned in error
  '../pkg',
  'lightningcss',
  '@babel/preset-typescript/package.json',
  
  // Additional common problematic packages for Node.js deployment
  'puppeteer',
  'puppeteer-core',
  'chrome-aws-lambda',
  'fsevents',
  'bufferutil',
  'utf-8-validate',
  
  // Optional peer dependencies that might cause issues
  'canvas',
  'sharp',
  '@swc/core',
  
  // Node.js built-ins that should remain external
  'fs',
  'path',
  'http',
  'https',
  'crypto',
  'stream',
  'util',
  'events',
  'os',
  'child_process',
  'cluster',
  'worker_threads',
  'url',
  'querystring',
  'buffer',
  'zlib',
  'string_decoder',
  'tls',
  'net',
  'dns',
  'dgram',
  'readline',
  'repl',
  'tty',
  'v8',
  'vm',
  'module',
  'assert',
  'console',
  'constants',
  'domain',
  'perf_hooks',
  'process',
  'punycode',
  'timers'
];

async function buildServer() {
  console.log('🔨 Building server with enhanced ESM configuration...');
  
  try {
    // Ensure dist directory exists
    if (!existsSync(join(__dirname, 'dist'))) {
      mkdirSync(join(__dirname, 'dist'), { recursive: true });
    }

    await build({
      entryPoints: [join(__dirname, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm', // Use ESM format to support import.meta and top-level await
      outfile: join(__dirname, 'dist/index.js'),
      external: externalPackages,
      allowOverwrite: true,
      sourcemap: true,
      minify: false, // Keep readable for debugging
      packages: 'external', // Keep all npm packages external to avoid bundling issues
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      // Handle module resolution
      conditions: ['import', 'module', 'node'],
      mainFields: ['module', 'main'],
    });

    console.log('✅ Server build completed successfully');
    
    // Create deployment package.json
    createDeploymentPackageJson();
    
    console.log('🚀 Deployment files ready in dist/ directory');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function createDeploymentPackageJson() {
  console.log('📦 Creating deployment package.json...');
  
  // Read the current package.json
  const packageJsonPath = join(__dirname, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Create deployment-specific package.json
  const deploymentPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: 'module', // Ensure ESM compatibility
    main: 'index.js',
    engines: {
      node: '>=18.0.0'
    },
    scripts: {
      start: 'node index.js'
    },
    dependencies: {
      // Only include runtime dependencies, excluding dev dependencies
      ...packageJson.dependencies
    }
  };
  
  // Write the deployment package.json
  const deploymentPackageJsonPath = join(__dirname, 'dist/package.json');
  writeFileSync(
    deploymentPackageJsonPath, 
    JSON.stringify(deploymentPackageJson, null, 2)
  );
  
  console.log('✅ Deployment package.json created');
}

// Build frontend
async function buildClient() {
  console.log('🎨 Building client...');
  
  // Use the existing Vite build which is already properly configured
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    const viteProcess = spawn('npm', ['run', 'build:client'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    viteProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Client build completed successfully');
        resolve();
      } else {
        reject(new Error(`Client build failed with code ${code}`));
      }
    });
  });
}

// Main build process
async function main() {
  console.log('🚀 Starting enhanced deployment build...');
  
  try {
    // Build server with enhanced ESM configuration
    await buildServer();
    
    // Build client
    await buildClient();
    
    console.log('🎉 Full deployment build completed successfully!');
    console.log('📁 Ready for deployment from dist/ directory');
    
  } catch (error) {
    console.error('💥 Build process failed:', error);
    process.exit(1);
  }
}

// Run the build
main();