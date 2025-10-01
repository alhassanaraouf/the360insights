# Custom Build Scripts for Package.json

Since package.json is protected from direct editing, here are the commands you can add to your package.json scripts section:

## Add these to your "scripts" section in package.json:

```json
{
  "scripts": {
    "build": "node deploy-build.js",
    "build:enhanced": "node deploy-build.js",
    "build:deploy": "./build-for-deployment.sh",
    "build:server": "esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --external:@neondatabase/serverless --external:ws --external:../pkg --external:@babel/preset-typescript/package.json --external:lightningcss",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

## Replace the existing build script:

Change this:
```json
"build": "npm run build:server && npm run build:client"
```

To this:
```json
"build": "node deploy-build.js"
```

## Usage:

- `npm run build` - Run the enhanced deployment build
- `npm run build:deploy` - Run build with status messages
- `npm run build:enhanced` - Alternative command for enhanced build