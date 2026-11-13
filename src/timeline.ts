export const DAY_MS = 86_400_000;

export interface ServiceStatus {
	id: number;
	name: string;
	url: string;
	is_up: number;
	created_at: string;
	status_changed_at: string | null;
	last_checked_at: string | null;
}

export interface ChangelogEntry {
	service_id: number;
	previous_status: number;
	new_status: number;
	changed_at: string;
}

export interface DayBar {
	start: Date;
	upMs: number;
	downMs: number;
}

interface Interval {
	start: number;
	end: number;
	up: boolean;
}

// D1 datetime('now') values are UTC strings like '2025-12-14 13:46:14'.
export function parseD1DateTime(value: string | null): Date | null {
	return value ? new Date(value.replace(" ", "T") + "Z") : null;
}

export function toD1DateTime(date: Date): string {
	return date.toISOString().slice(0, 19).replace("T", " ");
}

// Start of the oldest UTC day in a window of `days` days that ends today.
export function windowStart(now: Date, days: number): Date {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return new Date(today - (days - 1) * DAY_MS);
}

// Up/down intervals between `from` and `to`, reconstructed from status changes
// (ascending by time). Time before the service was created has no data.
function statusIntervals(service: ServiceStatus, changes: ChangelogEntry[], from: number, to: number): Interval[] {
	const createdAt = parseD1DateTime(service.created_at)?.getTime() ?? from;
	let cursor = Math.max(from, createdAt);
	let up = changes.length > 0 ? changes[0].previous_status === 1 : service.is_up === 1;
	const intervals: Interval[] = [];

	for (const change of changes) {
		const changedAt = parseD1DateTime(change.changed_at)!.getTime();
		if (changedAt > cursor) {
			intervals.push({ start: cursor, end: Math.min(changedAt, to), up });
			cursor = changedAt;
		}
		up = change.new_status === 1;
	}
	if (to > cursor) intervals.push({ start: cursor, end: to, up });
	return intervals;
}

// One bar per UTC day, oldest first; the last bar is today up to `now`.
export function dailyBars(service: ServiceStatus, changes: ChangelogEntry[], now: Date, days: number): DayBar[] {
	const from = windowStart(now, days).getTime();
	const to = now.getTime();
	const intervals = statusIntervals(service, changes, from, to);

	return Array.from({ length: days }, (_, i) => {
		const start = from + i * DAY_MS;
		const end = Math.min(start + DAY_MS, to);
		let upMs = 0;
		let downMs = 0;
		for (const interval of intervals) {
			const overlap = Math.min(end, interval.end) - Math.max(start, interval.start);
			if (overlap <= 0) continue;
			if (interval.up) upMs += overlap;
			else downMs += overlap;
		}
		return { start: new Date(start), upMs, downMs };
	});
}

// Uptime across bars as a display string; floors so any downtime never shows as 100%.
export function formatUptime(bars: DayBar[]): string {
	const upMs = bars.reduce((sum, bar) => sum + bar.upMs, 0);
	const knownMs = bars.reduce((sum, bar) => sum + bar.upMs + bar.downMs, 0);
	if (knownMs === 0) return "No data";
	if (upMs === knownMs) return "100%";
	return `${(Math.floor((upMs * 10_000) / knownMs) / 100).toFixed(2)}%`;
}

export function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	if (days > 0) return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m`;
	return "<1m";
}
