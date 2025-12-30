#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = join(__dirname, '.svelte-kit', 'cloudflare', '_worker.js');
const workerContent = readFileSync(workerPath, 'utf-8');

// Add import at the top (after the first imports)
const importStatement = `import { p as performHealthChecks } from "../output/server/chunks/utils2.js";\n`;
const modifiedWithImport = workerContent.replace(
	/(import.*?;\n)/, 
	`$1${importStatement}`
);

// Add scheduled handler function before the export
const scheduledHandler = `
// Scheduled handler for cron triggers
async function scheduled(event, env, ctx) {
	ctx.waitUntil(performHealthChecks(env));
}
`;

// Replace the export to include scheduled handler
const modifiedContent = modifiedWithImport.replace(
	'export {\n  worker_default as default\n};',
	scheduledHandler + '\nexport {\n  worker_default as default,\n  scheduled\n};'
);

writeFileSync(workerPath, modifiedContent, 'utf-8');
console.log('✓ Added scheduled handler to worker');
