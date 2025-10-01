#!/usr/bin/env node
/**
 * Script to update package.json with enhanced build commands
 * Run this script to automatically update your package.json build configuration
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function updatePackageJson() {
  console.log('🔧 Updating package.json build configuration...');
  
  try {
    // Read current package.json
    const packageJsonPath = join(__dirname, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Update build scripts with enhanced deployment configuration
    packageJson.scripts = {
      ...packageJson.scripts,
      // Main build command now uses our enhanced build
      "build": "node deploy-build.js",
      
      // Enhanced server build with ESM format and external packages
      "build:server": "esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --external:@neondatabase/serverless --external:ws --external:../pkg --external:@babel/preset-typescript/package.json --external:lightningcss",
      
      // Add alternative build commands
      "build:enhanced": "node deploy-build.js",
      "build:deploy": "./build-for-deployment.sh",
      
      // Update start command to use correct output file
      "start": "NODE_ENV=production node dist/index.js"
    };
    
    // Write updated package.json
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Package.json updated successfully!');
    console.log('📝 Changes made:');
    console.log('   - build: Updated to use enhanced deployment build');
    console.log('   - build:server: Added ESM format and external packages');
    console.log('   - build:enhanced: Added as alternative build command');
    console.log('   - build:deploy: Added deployment script command');
    console.log('   - start: Updated to use dist/index.js');
    console.log('');
    console.log('🚀 You can now run: npm run build');
    
  } catch (error) {
    console.error('❌ Failed to update package.json:', error.message);
    console.log('');
    console.log('Manual changes needed in package.json:');
    console.log('Replace line 8: "build": "npm run build:server && npm run build:client",');
    console.log('With:          "build": "node deploy-build.js",');
    console.log('');
    console.log('Replace line 9: "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:@neondatabase/serverless --external:ws",');
    console.log('With:          "build:server": "esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --external:@neondatabase/serverless --external:ws --external:../pkg --external:@babel/preset-typescript/package.json --external:lightningcss",');
    console.log('');
    console.log('Replace line 11: "start": "NODE_ENV=production node dist/server.js",');
    console.log('With:           "start": "NODE_ENV=production node dist/index.js",');
  }
}

updatePackageJson();