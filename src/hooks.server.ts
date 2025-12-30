// hooks.server.ts - Server-side hooks for SvelteKit
import type { Handle } from '@sveltejs/kit';
import { performHealthChecks } from '$lib/utils';

// Standard SvelteKit handle hook
export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};

// Scheduled handler for Cloudflare Workers cron triggers
// This function will be exported but SvelteKit doesn't automatically pass it through
// We'll need to handle this in a custom way
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	ctx.waitUntil(performHealthChecks(env));
}
