#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = join(__dirname, '.svelte-kit', 'cloudflare', '_worker.js');
const workerContent = readFileSync(workerPath, 'utf-8');

// Import the scheduled handler from the hooks.server module  
const scheduledImport = `import { scheduled } from "../output/server/chunks/hooks.server.js";\n`;

// Add the import at the top after existing imports
const modifiedWithImport = workerContent.replace(
	/(import.*?from "cloudflare:workers";)\n/,
	`$1\n${scheduledImport}`
);

// Replace the export to include scheduled handler
const modifiedContent = modifiedWithImport.replace(
	'export {\n  worker_default as default\n};',
	'export {\n  worker_default as default,\n  scheduled\n};'
);

writeFileSync(workerPath, modifiedContent, 'utf-8');
console.log('✓ Added scheduled handler to worker');
