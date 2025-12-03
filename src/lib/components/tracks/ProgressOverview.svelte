<script>
	/**
	 * @fileoverview Progress overview component for track page
	 * Shows total stats, progress, and Bloks earned
	 */
	export let track;
	export let stats = { total: 0, completed: 0, percentage: 0 };
	export let totalBloksEarned = 0;
</script>

<div class="progress-overview">
	<div class="overview-header">
		<div class="track-info">
			{#if track.icon && !track.icon.toLowerCase().includes('zap')}
				<span class="track-icon">{track.icon}</span>
			{/if}
			<div>
				<h1 class="track-title">{track.display_name}</h1>
				<p class="track-description">{track.description}</p>
			</div>
		</div>
	</div>

	<div class="stats-grid">
		<!-- Total Bloks -->
		<div class="stat-card bloks-card">
			<div class="stat-icon">🧱</div>
			<div class="stat-content">
				<span class="stat-label">Total Bloks</span>
				<span class="stat-value bloks-value">{totalBloksEarned}</span>
			</div>
		</div>

		<!-- Problems Completed -->
		<div class="stat-card">
			<div class="stat-icon">🏆</div>
			<div class="stat-content">
				<span class="stat-label">Completed</span>
				<span class="stat-value">{stats.completed}/{stats.total}</span>
			</div>
		</div>

		<!-- Progress Percentage -->
		<div class="stat-card progress-card">
			<div class="progress-circle">
				<svg viewBox="0 0 36 36" class="circular-chart">
					<path
						class="circle-bg"
						d="M18 2.0845
							a 15.9155 15.9155 0 0 1 0 31.831
							a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
					<path
						class="circle-progress"
						stroke-dasharray="{stats.percentage}, 100"
						d="M18 2.0845
							a 15.9155 15.9155 0 0 1 0 31.831
							a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
					<text x="18" y="20.35" class="percentage-text">{stats.percentage}%</text>
				</svg>
			</div>
			<div class="stat-content">
				<span class="stat-label">🚀 Progress</span>
				<span class="stat-sublabel">Keep going!</span>
			</div>
		</div>
	</div>
</div>

<style>
	.progress-overview {
		background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
		border-radius: 1.5rem;
		padding: 2rem;
		margin-bottom: 2rem;
		border: 2px solid #f59e0b;
	}

	.overview-header {
		margin-bottom: 1.5rem;
	}

	.track-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.track-icon {
		font-size: 3rem;
	}

	.track-title {
		font-size: 2rem;
		font-weight: 700;
		color: #78350f;
		margin: 0;
	}

	.track-description {
		font-size: 1rem;
		color: #92400e;
		margin: 0.25rem 0 0 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: white;
		border-radius: 1rem;
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.bloks-card {
		background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
		color: white;
	}

	.bloks-card .stat-label,
	.bloks-card .stat-value {
		color: white;
	}

	.stat-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: #111827;
	}

	.bloks-value {
		color: white;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.stat-sublabel {
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 400;
	}

	.progress-card {
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.progress-circle {
		width: 80px;
		height: 80px;
		margin-bottom: 0.5rem;
	}

	.circular-chart {
		width: 100%;
		height: 100%;
	}

	.circle-bg {
		fill: none;
		stroke: #e5e7eb;
		stroke-width: 3;
	}

	.circle-progress {
		fill: none;
		stroke: #f59e0b;
		stroke-width: 3;
		stroke-linecap: round;
		animation: progress 1s ease-out forwards;
	}

	@keyframes progress {
		0% {
			stroke-dasharray: 0, 100;
		}
	}

	.percentage-text {
		fill: #111827;
		font-size: 0.5rem;
		font-weight: 700;
		text-anchor: middle;
	}

	@media (max-width: 768px) {
		.progress-overview {
			padding: 1.5rem;
		}

		.track-title {
			font-size: 1.5rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
