import {
	ChangelogEntry,
	DayBar,
	ServiceStatus,
	dailyBars,
	formatDuration,
	formatUptime,
	parseD1DateTime,
} from "./timeline";

export const HISTORY_DAYS = 90;
const MOBILE_DAYS = 30;
// A day with at most this much downtime (5% of a day) counts as a partial outage.
const PARTIAL_OUTAGE_MAX_DOWN_MS = 72 * 60_000;

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const dayFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function renderBar(bar: DayBar): string {
	const knownMs = bar.upMs + bar.downMs;
	let kind: string;
	let summary: string;
	if (knownMs === 0) {
		kind = "none";
		summary = "No data";
	} else if (bar.downMs === 0) {
		kind = "up";
		summary = "No downtime";
	} else {
		kind = bar.downMs <= PARTIAL_OUTAGE_MAX_DOWN_MS ? "partial" : "down";
		summary = `Down for ${formatDuration(bar.downMs)}`;
	}
	return `<span class="bar bar-${kind}" data-date="${dayFormat.format(bar.start)}" data-summary="${summary}"></span>`;
}

function renderService(service: ServiceStatus, changes: ChangelogEntry[], now: Date): string {
	const bars = dailyBars(service, changes, now, HISTORY_DAYS);
	const isUp = service.is_up === 1;
	const since = parseD1DateTime(service.status_changed_at);
	const sinceText = since ? ` for ${formatDuration(now.getTime() - since.getTime())}` : "";
	const uptime = formatUptime(bars);
	const mobileUptime = formatUptime(bars.slice(-MOBILE_DAYS));
	const name = escapeHtml(service.name);

	return `
			<li class="service">
				<div class="service-head">
					<div class="service-title">
						<span class="dot ${isUp ? "dot-up" : "dot-down"}" aria-hidden="true"></span>
						<span class="service-name">${name}</span>
					</div>
					<span class="state ${isUp ? "state-up" : "state-down"}">${isUp ? "Operational" : "Down"}</span>
				</div>
				<div class="service-meta">
					<a href="${escapeHtml(service.url)}" rel="noopener">${escapeHtml(service.url)}</a>
					<span>${isUp ? "Up" : "Down"}${sinceText}</span>
				</div>
				<div class="bars" role="img" aria-label="${name}: ${uptime} uptime over the last ${HISTORY_DAYS} days">
					${bars.map(renderBar).join("")}
				</div>
				<div class="bars-legend" aria-hidden="true">
					<span class="wide">${HISTORY_DAYS} days ago</span><span class="narrow">${MOBILE_DAYS} days ago</span>
					<span class="rule"></span>
					<span class="wide">${uptime} uptime</span><span class="narrow">${mobileUptime} uptime</span>
					<span class="rule"></span>
					<span>Today</span>
				</div>
			</li>`;
}

export function renderStatusPage(services: ServiceStatus[], changelog: ChangelogEntry[], now: Date): string {
	const down = services.filter(s => s.is_up !== 1);
	const banner = down.length === 0
		? `<div class="banner banner-up">All systems operational</div>`
		: `<div class="banner banner-down">${down.length === 1 ? `${escapeHtml(down[0].name)} is down` : `${down.length} services are down`}</div>`;

	const lastChecked = services
		.map(s => parseD1DateTime(s.last_checked_at))
		.filter((d): d is Date => d !== null)
		.sort((a, b) => b.getTime() - a.getTime())[0];

	const serviceRows = services
		.map(service => renderService(service, changelog.filter(c => c.service_id === service.id), now))
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
	<meta name="theme-color" content="#0f172a" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="Status" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta http-equiv="refresh" content="60">
	<title>Service Status</title>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<style>
		:root {
			--bg: #0f172a;
			--surface: #1e293b;
			--border: #334155;
			--text: #f1f5f9;
			--muted: #94a3b8;
			--faint: #64748b;
			--up: #22c55e;
			--partial: #f59e0b;
			--down: #ef4444;
			--none: #334155;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: var(--bg);
			color: var(--text);
			/* Keep content clear of the notch when launched from the iOS home screen;
			   pad both sides by the larger inset so the column stays centred in landscape. */
			--gutter: max(16px, env(safe-area-inset-left), env(safe-area-inset-right));
			padding: max(40px, calc(env(safe-area-inset-top) + 16px)) var(--gutter) max(40px, env(safe-area-inset-bottom));
			-webkit-text-size-adjust: 100%;
			text-size-adjust: 100%;
		}
		.container { max-width: 820px; margin: 0 auto; }
		h1 { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; margin-bottom: 24px; }
		h1 img { width: 36px; height: 36px; }
		.banner {
			font-size: 17px;
			font-weight: 600;
			padding: 16px 20px;
			border-radius: 8px;
			margin-bottom: 24px;
			color: #fff;
		}
		.banner-up { background: #15803d; }
		.banner-down { background: #b91c1c; }
		.services {
			list-style: none;
			background: var(--surface);
			border: 1px solid var(--border);
			border-radius: 8px;
		}
		.service { padding: 20px; }
		.service + .service { border-top: 1px solid var(--border); }
		.service-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
		.service-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
		.service-name { font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
		.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
		.dot-up { background: var(--up); box-shadow: 0 0 0 3px rgb(34 197 94 / 0.2); }
		.dot-down { background: var(--down); box-shadow: 0 0 0 3px rgb(239 68 68 / 0.2); }
		.state { font-size: 14px; font-weight: 500; flex: none; }
		.state-up { color: var(--up); }
		.state-down { color: var(--down); }
		.service-meta {
			display: flex;
			justify-content: space-between;
			flex-wrap: wrap;
			gap: 4px 12px;
			font-size: 12px;
			color: var(--muted);
			margin: 6px 0 14px 20px;
		}
		.service-meta a { color: inherit; text-decoration: none; overflow-wrap: anywhere; }
		.service-meta a:hover { text-decoration: underline; }
		.bars { display: flex; gap: 2px; height: 34px; }
		.bar { flex: 1; border-radius: 2px; transition: opacity 0.1s; }
		.bar:hover { opacity: 0.6; }
		.bar-up { background: var(--up); }
		.bar-partial { background: var(--partial); }
		.bar-down { background: var(--down); }
		.bar-none { background: var(--none); }
		.bars-legend {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-top: 8px;
			font-size: 12px;
			color: var(--faint);
			white-space: nowrap;
		}
		.bars-legend .rule { flex: 1; height: 1px; background: var(--border); }
		.narrow { display: none; }
		@media (max-width: 600px) {
			.bar:nth-child(-n+${HISTORY_DAYS - MOBILE_DAYS}) { display: none; }
			.wide { display: none; }
			.narrow { display: inline; }
		}
		.legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; margin-top: 16px; font-size: 12px; color: var(--muted); }
		.legend span::before {
			content: "";
			display: inline-block;
			width: 10px;
			height: 10px;
			border-radius: 2px;
			margin-right: 6px;
			vertical-align: -1px;
			background: var(--swatch);
		}
		footer { text-align: center; font-size: 12px; color: var(--faint); margin-top: 16px; }
		#tip {
			position: absolute;
			z-index: 10;
			pointer-events: none;
			background: #020617;
			border: 1px solid var(--border);
			border-radius: 6px;
			padding: 8px 10px;
			font-size: 12px;
			line-height: 1.5;
			white-space: nowrap;
			box-shadow: 0 6px 16px rgb(0 0 0 / 0.4);
		}
		#tip strong { display: block; }
		#tip span { color: var(--muted); }
	</style>
</head>
<body>
	<main class="container">
		<h1><img src="/favicon.svg" alt="" />Service Status</h1>
		${banner}
		<ul class="services">${serviceRows}
		</ul>
		<div class="legend" aria-hidden="true">
			<span style="--swatch: var(--up)">Operational</span>
			<span style="--swatch: var(--partial)">Partial outage</span>
			<span style="--swatch: var(--down)">Major outage</span>
			<span style="--swatch: var(--none)">No data</span>
		</div>
		<footer>
			Checked every 10 minutes · Days in UTC${lastChecked ? ` · Last check <time datetime="${lastChecked.toISOString()}">${lastChecked.toISOString().slice(0, 16).replace("T", " ")} UTC</time>` : ""}
		</footer>
	</main>
	<div id="tip" role="tooltip" hidden><strong></strong><span></span></div>
	<script>
		const tip = document.getElementById("tip");
		const [tipDate, tipSummary] = tip.children;
		for (const time of document.querySelectorAll("time[datetime]")) {
			time.textContent = new Date(time.dateTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
		}
		document.addEventListener("pointerover", (event) => {
			const bar = event.target.closest && event.target.closest(".bar");
			if (!bar) {
				tip.hidden = true;
				return;
			}
			tipDate.textContent = bar.dataset.date;
			tipSummary.textContent = bar.dataset.summary;
			tip.hidden = false;
			const rect = bar.getBoundingClientRect();
			const left = rect.left + rect.width / 2 - tip.offsetWidth / 2;
			tip.style.left = scrollX + Math.max(8, Math.min(left, innerWidth - tip.offsetWidth - 8)) + "px";
			tip.style.top = scrollY + rect.top - tip.offsetHeight - 8 + "px";
		});
	</script>
</body>
</html>
`;
}
