<script>
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { BOOTCAMP_DAYS } from '$lib/config/bootcampDays.js';
	
	export let groupedByDay = [];
	export let expandedDays = new Set();
	export let locallyCompletedIds = new Set();
	export let submittingProblemId = null;
	export let canCompleteNow = true;
	export let onToggleDay = () => {};
	export let onProblemComplete = () => {};
</script>

<div class="course-container">
	<div class="course-header">
		<h2 class="course-title">📚 9-Day Learning Path</h2>
		<p class="course-subtitle">Master DSA concepts step by step</p>
	</div>

	<div class="days-grid">
		{#each groupedByDay as dayData}
			{@const dayMeta = BOOTCAMP_DAYS[dayData.day] || {}}
			{@const isExpanded = expandedDays.has(dayData.day)}
			{@const progress = dayData.completed / dayData.total}
			
			<div class="day-card {dayMeta.color} border-2">
				<!-- Day Card Header (Click to expand) -->
				<button 
					class="day-card-header"
					on:click={() => onToggleDay(dayData.day)}
				>
					<div class="day-card-top">
						<span class="day-icon">{dayMeta.icon || '📚'}</span>
						<div class="day-info">
							<span class="day-number">{dayData.day}</span>
							<h3 class="day-title {dayMeta.textColor}">{dayMeta.title || dayData.day}</h3>
							<p class="day-subtitle">{dayMeta.subtitle || ''}</p>
						</div>
					</div>
					
					<div class="day-progress-section">
						<div class="day-stats">
							<span class="day-completion">{dayData.completed}/{dayData.total} completed</span>
							<div class="day-progress-bar">
								<div class="day-progress-fill" style="width: {progress * 100}%"></div>
							</div>
						</div>
						<div class="expand-icon">
							{#if isExpanded}
								<ChevronUp size={20} />
							{:else}
								<ChevronDown size={20} />
							{/if}
						</div>
					</div>
				</button>

				<!-- Expanded: Show problems -->
				{#if isExpanded}
					<div class="day-problems">
						{#each dayData.problems as problem}
							{@const isCompleted = problem.isCompleted || locallyCompletedIds.has(problem.id)}
							{@const isSubmitting = submittingProblemId === problem.id}
							
							<div class="problem-item {isCompleted ? 'completed' : ''}">
								<div class="problem-content">
									<div class="problem-header">
										<h4 class="problem-title">{problem.title}</h4>
										<span class="problem-difficulty difficulty-{problem.difficulty}">
											{problem.difficulty}
										</span>
									</div>
									<div class="problem-meta">
										<span class="problem-bloks">💎 {problem.bloks} bloks</span>
										<span class="problem-platform">{problem.external_platform}</span>
									</div>
								</div>
								
								<div class="problem-actions">
									<a 
										href={problem.external_url} 
										target="_blank" 
										rel="noopener noreferrer"
										class="btn-link"
									>
										Solve
									</a>
									
									{#if !isCompleted}
										<button
											class="btn-complete"
											disabled={isSubmitting || !canCompleteNow}
											on:click={() => onProblemComplete(problem.id)}
										>
											{#if isSubmitting}
												Submitting...
											{:else if !canCompleteNow}
												⏱️ Cooldown
											{:else}
												Mark Complete
											{/if}
										</button>
									{:else}
										<span class="completed-badge">✓ Done</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
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
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.day-card {
		background: white;
		border-radius: 1rem;
		overflow: hidden;
		transition: all 0.3s;
	}

	.day-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.day-card-header {
		width: 100%;
		padding: 1.5rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.day-card-top {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.day-icon {
		font-size: 2.5rem;
		flex-shrink: 0;
	}

	.day-info {
		flex: 1;
	}

	.day-number {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
	}

	.day-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0.25rem 0;
	}

	.day-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.day-progress-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.day-stats {
		flex: 1;
	}

	.day-completion {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.day-progress-bar {
		height: 8px;
		background: #e5e7eb;
		border-radius: 999px;
		overflow: hidden;
		margin-top: 0.5rem;
	}

	.day-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #f59e0b, #d97706);
		transition: width 0.3s;
	}

	.expand-icon {
		color: #9ca3af;
	}

	.day-problems {
		padding: 0 1.5rem 1.5rem 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.problem-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 0.5rem;
		margin-top: 1rem;
		transition: all 0.2s;
	}

	.problem-item:hover {
		background: #f3f4f6;
	}

	.problem-item.completed {
		opacity: 0.7;
		background: #e7f5e7;
	}

	.problem-content {
		flex: 1;
	}

	.problem-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.problem-title {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.problem-difficulty {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
	}

	.difficulty-easy {
		background: #d1fae5;
		color: #065f46;
	}

	.difficulty-medium {
		background: #fed7aa;
		color: #92400e;
	}

	.difficulty-hard {
		background: #fee2e2;
		color: #991b1b;
	}

	.problem-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.problem-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-link, .btn-complete {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-link {
		background: #eff6ff;
		color: #1e40af;
	}

	.btn-link:hover {
		background: #dbeafe;
	}

	.btn-complete {
		background: #f59e0b;
		color: white;
	}

	.btn-complete:hover:not(:disabled) {
		background: #d97706;
	}

	.btn-complete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.completed-badge {
		padding: 0.5rem 1rem;
		background: #10b981;
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.days-grid {
			grid-template-columns: 1fr;
		}

		.problem-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.problem-actions {
			width: 100%;
			justify-content: stretch;
		}

		.btn-link, .btn-complete {
			flex: 1;
		}
	}
</style>
