<script>
	export let sections = [];
	export let locallyCompletedIds = new Set();
	export let submittingProblemId = null;
	export let canCompleteNow = true;
	export let onProblemComplete = () => {};
</script>

<div class="sections-container">
	{#each sections as section}
		<section class="section">
			<h2 class="section-title">{section.name}</h2>
			<div class="problems-grid">
				{#each section.problems as problem}
					{@const isCompleted = problem.isCompleted || locallyCompletedIds.has(problem.id)}
					{@const isSubmitting = submittingProblemId === problem.id}
					
					<div class="problem-card {isCompleted ? 'completed' : ''}">
						<div class="problem-header">
							<h3 class="problem-title">{problem.title}</h3>
							<span class="problem-difficulty difficulty-{problem.difficulty}">
								{problem.difficulty}
							</span>
						</div>
						
						<div class="problem-meta">
							<span class="problem-bloks">💎 {problem.bloks} bloks</span>
							<span class="problem-platform">{problem.external_platform}</span>
						</div>
						
						<div class="problem-actions">
							<a 
								href={problem.external_url} 
								target="_blank" 
								rel="noopener noreferrer"
								class="btn-link"
							>
								Solve Problem
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
										⏱️ Cooldown Active
									{:else}
										Mark Complete
									{/if}
								</button>
							{:else}
								<span class="completed-badge">✓ Completed</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.sections-container {
		display: flex;
		flex-direction: column;
		gap: 3rem;
		margin-top: 2rem;
	}

	.section {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 1.5rem 0;
		padding-bottom: 1rem;
		border-bottom: 2px solid #f3f4f6;
	}

	.problems-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.problem-card {
		background: #f9fafb;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
		transition: all 0.3s;
	}

	.problem-card:hover {
		border-color: #f59e0b;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
		transform: translateY(-2px);
	}

	.problem-card.completed {
		background: #e7f5e7;
		border-color: #10b981;
		opacity: 0.85;
	}

	.problem-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.problem-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
		line-height: 1.4;
	}

	.problem-difficulty {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		white-space: nowrap;
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
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.problem-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.btn-link, .btn-complete {
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-align: center;
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
		transform: translateY(-1px);
	}

	.btn-complete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.completed-badge {
		width: 100%;
		padding: 0.75rem 1rem;
		background: #10b981;
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-align: center;
		display: block;
	}

	@media (max-width: 768px) {
		.problems-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
