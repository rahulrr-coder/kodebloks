<script>
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import ProgressOverview from '$lib/components/tracks/ProgressOverview.svelte';
	import FilterBar from '$lib/components/tracks/FilterBar.svelte';
	import SectionAccordion from '$lib/components/tracks/SectionAccordion.svelte';
	import CelebrationModal from '$lib/components/celebrations/CelebrationModal.svelte';
	import BadgeUnlockModal from '$lib/components/celebrations/BadgeUnlockModal.svelte';
	import { groupBySection, applyFiltersAndSort, getSectionOrder } from '$lib/utils/filterUtils.js';
	import { canComplete as checkCooldown, formatCooldownTime } from '$lib/utils/cooldownUtils.js';
	import { markProblemComplete, updateLastCompletedAt } from '$lib/api/submissions.js';
	import { createSupabaseLoadClient } from '$lib/supabase.js';
	import { toast } from '$lib/stores/toast.js';
	import { celebrationConfetti } from '$lib/utils/confetti.js';
	import { playSuccessSound, playCoinSound, playAchievementSound } from '$lib/utils/sounds.js';
	import { BOOTCAMP_DAYS } from '$lib/config/bootcampDays.js';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	export let data;

	let { track, problems, stats, totalBloksEarned, lastCompletedAt, user, isCourse, groupedByDay } = data;

	// Filter state
	let filters = {
		difficulty: 'all',
		status: 'all',
		mustDoOnly: false,
		sortBy: 'section'
	};

	// Cooldown state
	let canCompleteNow = true;
	let cooldownTimeString = '';
	let cooldownInterval;
	
	// Loading state - track which specific problem is being submitted
	let submittingProblemId = null;

	// Expanded sections state
	let expandedSections = new Set();

	// Celebration modal state
	let showCelebration = false;
	let celebrationBloks = 0;
	let celebrationProblemTitle = '';

	// Badge unlock modal state
	let showBadgeModal = false;
	let newlyEarnedBadges = [];

	// Track locally completed problems (for optimistic UI updates)
	let locallyCompletedIds = new Set();

	// Course mode: Track expanded days
	let expandedDays = new Set();

	// Reactive grouping and filtering
	$: filteredProblems = applyFiltersAndSort(problems, filters);
	$: groupedProblems = groupBySection(filteredProblems);
	$: sectionOrder = getSectionOrder();
	$: orderedSections = sectionOrder.filter((section) => groupedProblems[section]);

	// Expand first section by default
	onMount(() => {
		if (orderedSections.length > 0) {
			expandedSections.add(orderedSections[0]);
			expandedSections = expandedSections;
		}

		// Update cooldown status
		updateCooldownStatus();
		cooldownInterval = setInterval(updateCooldownStatus, 1000);

		return () => {
			if (cooldownInterval) clearInterval(cooldownInterval);
		};
	});

	function updateCooldownStatus() {
		canCompleteNow = checkCooldown(lastCompletedAt);
		cooldownTimeString = formatCooldownTime(lastCompletedAt);
	}

	function handleFilterChange(event) {
		filters = event.detail;
	}

	function toggleSection(section) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
		} else {
			expandedSections.add(section);
		}
		expandedSections = expandedSections;
	}

	function toggleDay(dayKey) {
		if (expandedDays.has(dayKey)) {
			expandedDays.delete(dayKey);
		} else {
			expandedDays.add(dayKey);
		}
		expandedDays = expandedDays;
	}

	async function handleProblemComplete(event) {
		const problemId = event.detail;

		if (submittingProblemId) {
			return; // Prevent double submissions
		}

		if (!canCompleteNow) {
			toast.info(`⏱️ Take a quick break! You can submit again in ${cooldownTimeString}.\n\nCome back stronger! 💪`, 5000);
			return;
		}

		const problem = problems.find((p) => p.id === problemId);
		if (!problem) return;

		submittingProblemId = problemId;

		try {
			const supabase = createSupabaseLoadClient(fetch);
			const { data: { user } } = await supabase.auth.getUser();

			if (!user) {
				toast.error('You must be logged in to mark problems complete');
				submittingProblemId = null;
				return;
			}

			// Mark problem complete and get newly earned badges
			const result = await markProblemComplete(supabase, user.id, problemId, problem.bloks);

			// Update last completion timestamp
			await updateLastCompletedAt(supabase, user.id);

			// Update local state IMMEDIATELY for instant UI feedback
			lastCompletedAt = new Date().toISOString();
			updateCooldownStatus();

			// Track this problem as locally completed (for optimistic UI)
			locallyCompletedIds.add(problemId);

			// Update local problems array to mark this problem as completed
			problems = problems.map(p =>
				p.id === problemId
					? {
						...p,
						isCompleted: true,
						completedAt: new Date().toISOString(),
						bloksEarnedFromThis: problem.bloks
					}
					: p
			);

			// Update stats locally for instant feedback
			stats.problemsCompleted = (stats.problemsCompleted || 0) + 1;
			totalBloksEarned = (totalBloksEarned || 0) + problem.bloks;

			// Play celebration sounds
			playSuccessSound();
			setTimeout(() => playCoinSound(), 200);

			// Show confetti
			celebrationConfetti({
				particleCount: 150,
				spread: 100,
				colors: ['#f59e0b', '#d97706', '#14b8a6']
			});

			// Show celebration modal
			celebrationBloks = problem.bloks;
			celebrationProblemTitle = problem.title;
			showCelebration = true;

			// If badges were earned, show badge modal after celebration
			if (result.newBadges && result.newBadges.length > 0) {
				newlyEarnedBadges = result.newBadges;
				// Delay badge modal slightly so celebration finishes first
				setTimeout(() => {
					playAchievementSound();
					showBadgeModal = true;
				}, 500);
			}

			// Refresh only specific routes that depend on user stats (faster than invalidateAll)
			await Promise.all([
				invalidate('/dashboard'),
				invalidate('/leaderboard'),
				invalidate(url => url.pathname.includes('/tracks/'))
			]);

		} catch (error) {
			console.error('Error marking problem complete:', error);
			if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
				toast.info('You have already completed this problem! 🎯');
			} else {
				toast.error('Failed to mark problem complete. Please try again.');
			}
		} finally {
			submittingProblemId = null;
		}
	}

	function handleCelebrationClose() {
		showCelebration = false;
	}

	function handleBadgeModalClose() {
		showBadgeModal = false;
		newlyEarnedBadges = [];
	}

	// React to data changes - merge with local state
	$: {
		track = data.track;

		// Merge server data with locally completed problems for instant UI
		problems = data.problems.map(p => {
			if (locallyCompletedIds.has(p.id) && !p.isCompleted) {
				// This was completed locally but server hasn't updated yet
				return {
					...p,
					isCompleted: true,
					completedAt: p.completedAt || new Date().toISOString(),
					bloksEarnedFromThis: p.bloksEarnedFromThis || p.bloks
				};
			}
			return p;
		});

		stats = data.stats;
		totalBloksEarned = data.totalBloksEarned;
		lastCompletedAt = data.lastCompletedAt;
		user = data.user;
		updateCooldownStatus();
	}
</script>

<svelte:head>
	<title>{track.name} - KodeBloks</title>
</svelte:head>

<div class="track-page">
	<!-- Back Button -->
	<div class="back-button-container">
		<a href="/dashboard" class="back-button">
			<svg class="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to Dashboard
		</a>
	</div>

	<!-- Progress Overview -->
	<ProgressOverview {track} {stats} {totalBloksEarned} />

	{#if isCourse && groupedByDay}
		<!-- COURSE MODE: Day-based structure -->
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
							on:click={() => toggleDay(dayData.day)}
						>
							<div class="day-card-top">
								<span class="day-icon">{dayMeta.icon || '📚'}</span>
								<div class="day-info">
			{/each}
		{/if}
	</div>
	{/if}
</div>		</div>
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
													on:click={() => handleProblemComplete({ detail: problem.id })}
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
	{:else}
		<!-- REGULAR MODE: Section-based structure -->
		<!-- Filter Bar -->
		<FilterBar {filters} on:change={handleFilterChange} />

	<!-- Sections with Problems -->
	<div class="sections-container">
		{#if orderedSections.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🔍</div>
				<h3 class="empty-title">No problems found</h3>
				<p class="empty-description">
					Try adjusting your filters to see more problems.
				</p>
			</div>
		{:else}
			{#each orderedSections as section}
				<SectionAccordion
					sectionName={section}
					problems={groupedProblems[section]}
					isExpanded={expandedSections.has(section)}
					{submittingProblemId}
					on:toggle={(e) => toggleSection(e.detail)}
					on:complete={handleProblemComplete}
				/>
			{/each}
		{/if}
	</div>
</div>

<!-- Celebration Modals -->
<CelebrationModal
	bind:show={showCelebration}
	bloks={celebrationBloks}
	problemTitle={celebrationProblemTitle}
	onClose={handleCelebrationClose}
/>

<BadgeUnlockModal
	bind:show={showBadgeModal}
	badges={newlyEarnedBadges}
	onClose={handleBadgeModalClose}
/>

<style>
	.track-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.back-button-container {
		margin-bottom: 1.5rem;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #d97706;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
	}

	.back-button:hover {
		color: #b45309;
		transform: translateX(-4px);
	}

	.back-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.sections-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 1rem;
		border: 2px dashed #e5e7eb;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.empty-description {
		font-size: 1rem;
		color: #6b7280;
		margin: 0;
	}

	@media (max-width: 768px) {
		.track-page {
			padding: 1rem;
		}
	}

	/* Course Mode Styles */
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
