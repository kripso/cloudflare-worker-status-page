import { ICON_SVG } from "./icon";
import { HISTORY_DAYS, renderStatusPage } from "./renderHtml";
import { ChangelogEntry, ServiceStatus, toD1DateTime, windowStart } from "./timeline";

const CHECK_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const PROBES_PER_CHECK = 3;

async function sendToTelegram(msg: string, env: Env) {
	const form = new FormData();
	form.append("text", msg);
	form.append("chat_id", `${env.TELEGRAM_CHAT_ID}`);

	const init = {
		method: 'POST',
		headers: {
			"Authorization": `Bearer ${env.TELEGRAM_TOKEN}`
		},
		body: form
	};
	const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, init);
	// Cancel the response body to prevent deadlock as we don't need to read it
	response.body?.cancel();
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function probe(url: string): Promise<boolean> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: "GET",
			signal: controller.signal,
			headers: { "User-Agent": "StatusPage-HealthCheck/1.0" },
		});

		response.body?.cancel();
		return response.status >= 200 && response.status < 400;
	} catch (err) {
		console.log(`Health check failed for ${url}`, err);
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

async function checkService(url: string): Promise<boolean> {
	let successfulProbes = 0;

	for (let probeNumber = 1; probeNumber <= PROBES_PER_CHECK; probeNumber++) {
		if (await probe(url)) {
			successfulProbes++;
		}

		if (probeNumber < PROBES_PER_CHECK) {
			await sleep(RETRY_DELAY_MS);
		}
	}

	return successfulProbes > PROBES_PER_CHECK / 2;
}

async function performHealthChecks(env: Env): Promise<void> {
	const services = await env.DB.prepare("SELECT * FROM services").all<ServiceStatus>();
	
	for (const service of services.results) {
		const isHealthy = await checkService(service.url);
		const wasUp = service.is_up === 1;
		const isFirstCheck = service.status_changed_at === null;
		const nextIsUp = isHealthy;
		const statusChanged = wasUp !== nextIsUp;

		await env.DB.prepare(`
			UPDATE services
			SET
				is_up = ?,
				last_checked_at = datetime('now'),
				status_changed_at = CASE WHEN ? THEN datetime('now') ELSE status_changed_at END
			WHERE id = ?
		`).bind(
			nextIsUp ? 1 : 0,
			statusChanged || isFirstCheck ? 1 : 0,
			service.id,
		).run();

		if (statusChanged && !isFirstCheck) {
			await env.DB.prepare(`
				INSERT INTO changelog (service_id, previous_status, new_status)
				VALUES (?, ?, ?)
			`).bind(service.id, wasUp ? 1 : 0, nextIsUp ? 1 : 0).run();

			const statusText = nextIsUp ? "UP" : "DOWN";
			const message = `Service "${service.name}" is now ${statusText}.\nURL: ${service.url}`;
			await sendToTelegram(message, env);
		}
	}
}

export default {
	async fetch(request, env) {
		if (new URL(request.url).pathname === "/favicon.svg") {
			return new Response(ICON_SVG, {
				headers: {
					"content-type": "image/svg+xml",
					"cache-control": "public, max-age=86400",
				},
			});
		}

		const now = new Date();
		const { results: services } = await env.DB.prepare("SELECT * FROM services ORDER BY name").all<ServiceStatus>();
		const { results: changelog } = await env.DB.prepare(`
			SELECT service_id, previous_status, new_status, changed_at
			FROM changelog
			WHERE changed_at >= ?
			ORDER BY service_id, changed_at ASC, id ASC
		`).bind(toD1DateTime(windowStart(now, HISTORY_DAYS))).all<ChangelogEntry>();

		return new Response(renderStatusPage(services, changelog, now), {
			headers: {
				"content-type": "text/html; charset=utf-8",
			},
		});
	},

	async scheduled(event, env, ctx) {
		ctx.waitUntil(performHealthChecks(env));
	},
} satisfies ExportedHandler<Env>;
