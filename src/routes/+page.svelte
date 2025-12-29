<script lang="ts">
	import { formatDuration, parseD1DateTime, type ServiceStatus } from '$lib/utils';
	import type { PageData } from './$types';
	
	export let data: PageData;
	
	$: services = data.services as ServiceStatus[];
	$: lastUpdatedDate = new Date(data.lastUpdated);
	$: allUp = services.every(s => s.is_up === 1);
	$: overallStatus = allUp ? '✅ All Systems Operational' : '⚠️ Some Systems Down';
	$: overallColor = allUp ? '#10b981' : '#f59e0b';
</script>

<svelte:head>
	<title>Status Page</title>
	<meta http-equiv="refresh" content="60">
</svelte:head>

<div class="container">
	<header>
		<h1>📊 Service Status</h1>
		<p>Real-time health monitoring</p>
	</header>
	
	<div class="overall-status" style="background: {overallColor}20; border: 1px solid {overallColor};">
		{overallStatus}
	</div>
	
	<div class="services">
		{#each services as service}
			<div class="service-card">
				<div>
					<div class="service-name">
						{service.is_up ? '🟢' : '🔴'} {service.name}
					</div>
					<div class="service-url">{service.url}</div>
				</div>
				<div class="service-status">
					<div class="status-text" style="color: {service.is_up ? '#10b981' : '#ef4444'};">
						{service.is_up ? 'Up' : 'Down'}
					</div>
					<div class="status-duration">
						{service.is_up ? 'Up' : 'Down'} for {formatDuration(service.status_changed_at)}
					</div>
					<div class="response-time">
						Response: {service.response_time_ms ? `${service.response_time_ms}ms` : '-'}
					</div>
				</div>
			</div>
		{/each}
	</div>
	
	<div class="last-updated">
		Last updated: {lastUpdatedDate.toLocaleString()}
	</div>
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
	
	header p {
		color: #94a3b8;
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
