import type { PageServerLoad } from './$types';
import { performHealthChecks, lastUpdated, type ServiceStatus } from '$lib/utils';

export const load: PageServerLoad = async ({ platform }) => {
	// platform.env contains the Cloudflare bindings
	const env = platform?.env;
	
	if (!env) {
		throw new Error('Platform environment not available');
	}

	// Perform health checks on page load
	await performHealthChecks(env);

	// Fetch services from database
	const stmt = env.DB.prepare("SELECT * FROM services ORDER BY name");
	const { results } = await stmt.all<ServiceStatus>();
	const lastUpdatedDate = lastUpdated(results);

	return {
		services: results,
		lastUpdated: lastUpdatedDate.toISOString()
	};
};
