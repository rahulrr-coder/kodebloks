<script>
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import ProgressOverview from '$lib/components/tracks/ProgressOverview.svelte';
	import FilterBar from '$lib/components/tracks/FilterBar.svelte';
	import SectionAccordion from '$lib/components/tracks/SectionAccordion.svelte';
	import CelebrationModal from '$lib/components/celebrations/CelebrationModal.svelte';
	import BadgeUnlockModal from '$lib/components/celebrations/BadgeUnlockModal.svelte';
	import CourseView from '$lib/components/tracks/CourseView.svelte';
	import SectionsView from '$lib/components/tracks/SectionsView.svelte';
	import { groupBySection, applyFiltersAndSort, getSectionOrder } from '$lib/utils/filterUtils.js';
	import { canComplete as checkCooldown, formatCooldownTime } from '$lib/utils/cooldownUtils.js';
	import { markProblemComplete, updateLastCompletedAt } from '$lib/api/submissions.js';
	import { createSupabaseLoadClient } from '$lib/supabase.js';
	import { toast } from '$lib/stores/toast.js';
	import { celebrationConfetti } from '$lib/utils/confetti.js';
	import { playSuccessSound, playCoinSound, playAchievementSound } from '$lib/utils/sounds.js';

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

		// Update cooldown status (disabled for dsa-bootcamp)
		if ($page.params.trackName !== 'dsa-bootcamp') {
			updateCooldownStatus();
			cooldownInterval = setInterval(updateCooldownStatus, 1000);
		} else {
			// For dsa-bootcamp, always allow completion
			canCompleteNow = true;
		}

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

	async function handleProblemComplete(event) {
		const problemId = event.detail;

		if (submittingProblemId) {
			return; // Prevent double submissions
		}

		// Cooldown check (disabled for dsa-bootcamp)
		if ($page.params.trackName !== 'dsa-bootcamp' && !canCompleteNow) {
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
			// Update cooldown status (disabled for dsa-bootcamp)
			if ($page.params.trackName !== 'dsa-bootcamp') {
				updateCooldownStatus();
			}

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
		// Update cooldown status (disabled for dsa-bootcamp)
		if ($page.params.trackName !== 'dsa-bootcamp') {
			updateCooldownStatus();
		}
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
		<CourseView 
			{groupedByDay}
			trackName={$page.params.trackName}
		/>
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
	{/if}
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
</style>
