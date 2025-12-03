<script>
	import { BOOTCAMP_DAYS } from '$lib/config/bootcampDays.js';
	import { ChevronRight } from 'lucide-svelte';
	
	export let groupedByDay = [];
	export let trackName = '';
</script>

<div class="course-container">
	<div class="course-header">
		<h2 class="course-title">📚 9-Day Learning Path</h2>
		<p class="course-subtitle">Master DSA concepts step by step - Click any day to start</p>
	</div>

	<div class="days-grid">
		{#each groupedByDay as dayData}
			{@const dayMeta = BOOTCAMP_DAYS[dayData.day] || {}}
			{@const progress = (dayData.completed / dayData.total) * 100}
			{@const daySlug = dayData.day.toLowerCase().replace(' ', '-')}
			
			<a 
				href="/tracks/{trackName}/{daySlug}" 
				class="day-card"
			>
				<div class="card-content">
					<div class="card-icon {dayMeta.color}">
						{dayMeta.icon || '📚'}
					</div>
					
					<div class="card-info">
						<div class="card-day-label">{dayData.day}</div>
						<h3 class="card-title">{dayMeta.title || dayData.day}</h3>
						<p class="card-description">{dayMeta.subtitle || ''}</p>
					</div>
				</div>
				
				<div class="card-progress">
					<div class="progress-header">
						<span class="progress-label">{dayData.total} Problems</span>
						<span class="progress-stat">{dayData.completed}/{dayData.total}</span>
					</div>
					<div class="progress-bar-container">
						<div class="progress-bar">
							<div class="progress-fill {dayMeta.color}" style="width: {progress}%"></div>
						</div>
						<span class="progress-percent">{Math.round(progress)}%</span>
					</div>
				</div>
				
				<div class="card-arrow">
					<ChevronRight size={24} />
				</div>
			</a>

		{/each}
	</div>
</div>

<style>
	.course-container {
		margin-top: 2rem;
	}

	.course-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.course-title {
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.course-subtitle {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.day-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 16px;
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
	}

	.day-card:hover {
		border-color: #f59e0b;
		transform: translateY(-4px);
		box-shadow: 0 12px 24px -8px rgba(245, 158, 11, 0.3);
	}

	.card-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.card-icon {
		font-size: 3rem;
		line-height: 1;
		padding: 0.75rem;
		border-radius: 12px;
		flex-shrink: 0;
		background: #f9fafb;
	}

	.card-icon.bg-blue-100 { background: #dbeafe; }
	.card-icon.bg-purple-100 { background: #f3e8ff; }
	.card-icon.bg-green-100 { background: #d1fae5; }
	.card-icon.bg-pink-100 { background: #fce7f3; }
	.card-icon.bg-yellow-100 { background: #fef3c7; }
	.card-icon.bg-indigo-100 { background: #e0e7ff; }
	.card-icon.bg-red-100 { background: #fee2e2; }
	.card-icon.bg-teal-100 { background: #ccfbf1; }
	.card-icon.bg-orange-100 { background: #ffedd5; }

	.card-info {
		flex: 1;
		min-width: 0;
	}

	.card-day-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin-bottom: 0.375rem;
	}

	.card-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.375rem 0;
		line-height: 1.3;
	}

	.card-description {
		font-size: 0.9375rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.5;
	}

	.card-progress {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.progress-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	.progress-stat {
		font-size: 0.875rem;
		font-weight: 700;
		color: #111827;
	}

	.progress-bar-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background: #f3f4f6;
		border-radius: 999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #f59e0b, #d97706);
		border-radius: 999px;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.progress-fill.bg-blue-100 { background: linear-gradient(90deg, #3b82f6, #2563eb); }
	.progress-fill.bg-purple-100 { background: linear-gradient(90deg, #a855f7, #9333ea); }
	.progress-fill.bg-green-100 { background: linear-gradient(90deg, #10b981, #059669); }
	.progress-fill.bg-pink-100 { background: linear-gradient(90deg, #ec4899, #db2777); }
	.progress-fill.bg-yellow-100 { background: linear-gradient(90deg, #eab308, #ca8a04); }
	.progress-fill.bg-indigo-100 { background: linear-gradient(90deg, #6366f1, #4f46e5); }
	.progress-fill.bg-red-100 { background: linear-gradient(90deg, #ef4444, #dc2626); }
	.progress-fill.bg-teal-100 { background: linear-gradient(90deg, #14b8a6, #0d9488); }
	.progress-fill.bg-orange-100 { background: linear-gradient(90deg, #f97316, #ea580c); }

	.progress-percent {
		font-size: 0.875rem;
		font-weight: 700;
		color: #111827;
		min-width: 42px;
		text-align: right;
	}

	.card-arrow {
		position: absolute;
		top: 1.75rem;
		right: 1.75rem;
		color: #9ca3af;
		transition: all 0.3s ease;
	}

	.day-card:hover .card-arrow {
		color: #f59e0b;
		transform: translateX(4px);
	}

	@media (max-width: 768px) {
		.days-grid {
			grid-template-columns: 1fr;
		}

		.course-title {
			font-size: 1.75rem;
		}

		.card-title {
			font-size: 1.25rem;
		}

		.card-icon {
			font-size: 2.5rem;
		}
	}
</style>
