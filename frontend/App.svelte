<script lang="ts">
	import { onMount } from 'svelte';
	
	interface ServiceStatus {
		id: number;
		name: string;
		url: string;
		is_up: number;
		last_checked_at: string | null;
		status_changed_at: string | null;
		response_time_ms: number | null;
		created_at: string;
	}
	
	interface StatusData {
		services: ServiceStatus[];
		lastUpdated: string;
	}
	
	let statusData: StatusData | null = null;
	let loading = true;
	let error: string | null = null;
	
	function parseD1DateTime(dateStr: string | null): Date | null {
		if (!dateStr) return null;
		return new Date(dateStr.replace(' ', 'T') + 'Z');
	}
	
	function formatDuration(startDate: string | null): string {
		const start = parseD1DateTime(startDate);
		if (!start) return 'Unknown';
		const now = new Date();
		const diffMs = now.getTime() - start.getTime();
		
		const seconds = Math.floor(diffMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		
		if (days > 0) return `${days}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}
	
	async function fetchStatus() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/status');
			if (!response.ok) {
				throw new Error('Failed to fetch status');
			}
			statusData = await response.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
	
	onMount(() => {
		fetchStatus();
		// Refresh every 60 seconds
		const interval = setInterval(fetchStatus, 60000);
		return () => clearInterval(interval);
	});
	
	$: allUp = statusData?.services.every(s => s.is_up === 1) ?? true;
	$: overallStatus = allUp ? '✅ All Systems Operational' : '⚠️ Some Systems Down';
	$: overallColor = allUp ? '#10b981' : '#f59e0b';
</script>

<div class="container">
	<header>
		<h1>📊 Service Status</h1>
		<p class="subtitle">Real-time health monitoring</p>
	</header>
	
	{#if loading && !statusData}
		<div class="loading">Loading status...</div>
	{:else if error}
		<div class="error">Error: {error}</div>
	{:else if statusData}
		<div class="overall-status" style="background: {overallColor}20; border: 1px solid {overallColor};">
			{overallStatus}
		</div>
		
		<div class="services">
			{#each statusData.services as service}
				{@const statusIcon = service.is_up ? '🟢' : '🔴'}
				{@const statusText = service.is_up ? 'Up' : 'Down'}
				{@const statusColor = service.is_up ? '#10b981' : '#ef4444'}
				{@const duration = formatDuration(service.status_changed_at)}
				{@const responseTime = service.response_time_ms ? `${service.response_time_ms}ms` : '-'}
				{@const lastCheckedDate = parseD1DateTime(service.last_checked_at)}
				{@const lastChecked = lastCheckedDate ? lastCheckedDate.toLocaleString() : 'Never'}
				
				<div class="service-card">
					<div class="service-info">
						<div class="service-name">{statusIcon} {service.name}</div>
						<div class="service-url">{service.url}</div>
					</div>
					<div class="service-status">
						<div class="status-text" style="color: {statusColor};">{statusText}</div>
						<div class="status-duration">{statusText} for {duration}</div>
						<div class="response-time">Response: {responseTime}</div>
					</div>
				</div>
			{/each}
		</div>
		
		<div class="last-updated">
			Last updated: {new Date(statusData.lastUpdated).toLocaleString()}
		</div>
	{/if}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}
	
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #0f172a;
		color: #f1f5f9;
		min-height: 100vh;
		padding: 40px 20px;
	}
	
	.container {
		max-width: 800px;
		margin: 0 auto;
	}
	
	header {
		text-align: center;
		margin-bottom: 40px;
	}
	
	h1 {
		font-size: 28px;
		margin-bottom: 8px;
	}
	
	.subtitle {
		color: #94a3b8;
	}
	
	.loading, .error {
		text-align: center;
		padding: 20px;
		font-size: 16px;
	}
	
	.error {
		color: #ef4444;
	}
	
	.overall-status {
		font-size: 20px;
		padding: 16px;
		border-radius: 8px;
		margin-bottom: 32px;
		text-align: center;
	}
	
	.service-card {
		background: #1e293b;
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.service-name {
		font-size: 18px;
		font-weight: 600;
		color: #f1f5f9;
	}
	
	.service-url {
		font-size: 12px;
		color: #94a3b8;
		margin-top: 4px;
	}
	
	.service-status {
		text-align: right;
	}
	
	.status-text {
		font-size: 14px;
		font-weight: 500;
	}
	
	.status-duration {
		font-size: 12px;
		color: #94a3b8;
	}
	
	.response-time {
		font-size: 11px;
		color: #64748b;
	}
	
	.last-updated {
		text-align: center;
		font-size: 12px;
		color: #64748b;
		margin-top: 24px;
	}
</style>
