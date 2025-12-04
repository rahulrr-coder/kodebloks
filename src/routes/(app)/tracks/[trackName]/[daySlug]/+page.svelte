<script>
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { BOOTCAMP_DAYS } from '$lib/config/bootcampDays.js';
	import SectionsView from '$lib/components/tracks/SectionsView.svelte';
	import CelebrationModal from '$lib/components/celebrations/CelebrationModal.svelte';
	import BadgeUnlockModal from '$lib/components/celebrations/BadgeUnlockModal.svelte';
	import { canComplete as checkCooldown, formatCooldownTime } from '$lib/utils/cooldownUtils.js';
	import { canCompleteToday, getRemainingProblems, formatDailyLimitMessage } from '$lib/utils/dailyLimitUtils.js';
	import { markProblemComplete, updateLastCompletedAt } from '$lib/api/submissions.js';
	import { createSupabaseLoadClient } from '$lib/supabase.js';
	import { toast } from '$lib/stores/toast.js';
	import { celebrationConfetti } from '$lib/utils/confetti.js';
	import { playSuccessSound, playCoinSound, playAchievementSound } from '$lib/utils/sounds.js';

	export let data;

	let { track, dayLabel, daySlug, problems, stats, totalBloksEarned, lastCompletedAt, todayCompletions = 0, user } = data;

	// Daily limit for DSA bootcamp
	const DSA_BOOTCAMP_DAILY_LIMIT = 20;

	// Get day metadata
	$: dayMeta = BOOTCAMP_DAYS[dayLabel] || {};

	// Cooldown state
	let canCompleteNow = true;
	let cooldownTimeString = '';
	let cooldownInterval;
	
	// Loading state
	let submittingProblemId = null;

	// Celebration modal state
	let showCelebration = false;
	let celebrationBloks = 0;
	let celebrationProblemTitle = '';

	// Badge unlock modal state
	let showBadgeModal = false;
	let newlyEarnedBadges = [];

	// Track locally completed problems
	let locallyCompletedIds = new Set();
	
	// Track local stat increases for optimistic UI
	let localStatsIncrease = 0;
	let localBloksIncrease = 0;

	// Group problems as sections (all in one section for this day)
	$: sections = [
		{
			name: dayMeta.subtitle || `${dayLabel} Problems`,
			problems: problems
		}
	];

	onMount(() => {
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

	async function handleProblemComplete(event) {
		const problemId = event.detail;

		if (submittingProblemId) return;
		
		// For DSA bootcamp: Check daily limit instead of cooldown
		if ($page.params.trackName === 'dsa-bootcamp') {
			if (!canCompleteToday(todayCompletions, DSA_BOOTCAMP_DAILY_LIMIT)) {
				const message = formatDailyLimitMessage(0);
				toast.info(`🎯 ${message}\n\nRest up and return tomorrow! 💪`, 5000);
				return;
			}
		} else {
			// For other tracks: Check cooldown
			if (!canCompleteNow) {
				toast.info(`⏱️ Take a quick break! You can submit again in ${cooldownTimeString}.\n\nCome back stronger! 💪`, 5000);
				return;
			}
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

			const result = await markProblemComplete(supabase, user.id, problemId, problem.bloks);
			await updateLastCompletedAt(supabase, user.id);

			lastCompletedAt = new Date().toISOString();
			
			// Update cooldown status (disabled for dsa-bootcamp)
			if ($page.params.trackName !== 'dsa-bootcamp') {
				updateCooldownStatus();
			} else {
				// For DSA bootcamp, increment today's completion count
				todayCompletions += 1;
			}
			
			locallyCompletedIds.add(problemId);

			problems = problems.map(p =>
				p.id === problemId
					? { ...p, isCompleted: true, completedAt: new Date().toISOString(), bloksEarnedFromThis: problem.bloks }
					: p
			);

			// Track local increases for optimistic UI
			localStatsIncrease += 1;
			localBloksIncrease += problem.bloks;

			playSuccessSound();
			setTimeout(() => playCoinSound(), 200);

			celebrationConfetti({
				particleCount: 150,
				spread: 100,
				colors: ['#f59e0b', '#d97706', '#14b8a6']
			});

			celebrationBloks = problem.bloks;
			celebrationProblemTitle = problem.title;
			showCelebration = true;

			if (result.newBadges && result.newBadges.length > 0) {
				newlyEarnedBadges = result.newBadges;
				setTimeout(() => {
					playAchievementSound();
					showBadgeModal = true;
				}, 500);
			}

			await invalidate(`/tracks/${track.name}/${daySlug}`);

		} catch (error) {
			console.error('Error marking problem complete:', error);
			if (error.message?.includes('duplicate')) {
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

	$: {
		problems = data.problems.map(p => {
			if (locallyCompletedIds.has(p.id) && !p.isCompleted) {
				return {
					...p,
					isCompleted: true,
					completedAt: p.completedAt || new Date().toISOString(),
					bloksEarnedFromThis: p.bloksEarnedFromThis || p.bloks
				};
			}
			return p;
		});

		// Merge server data with local optimistic updates
		stats = {
			...data.stats,
			problemsCompleted: (data.stats?.problemsCompleted || 0) + localStatsIncrease
		};
		totalBloksEarned = (data.totalBloksEarned || 0) + localBloksIncrease;
		lastCompletedAt = data.lastCompletedAt;
		todayCompletions = data.todayCompletions || 0;
		
		// Update cooldown status (disabled for dsa-bootcamp)
		if ($page.params.trackName !== 'dsa-bootcamp') {
			updateCooldownStatus();
		}
	}
</script>

<svelte:head>
	<title>{dayLabel} - {track.name} - KodeBloks</title>
</svelte:head>

<div class="day-page">
	<!-- Back Button -->
	<div class="back-button-container">
		<a href="/tracks/{$page.params.trackName}" class="back-button">
			<svg class="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to {track.display_name || track.name}
		</a>
	</div>

	<!-- Day Header -->
	<div class="day-header {dayMeta.color}">
		<div class="day-icon-large">{dayMeta.icon || '📚'}</div>
		<div class="day-header-content">
			<div class="day-label">{dayLabel}</div>
			<h1 class="day-title">{dayMeta.title || dayLabel}</h1>
			<p class="day-description">{dayMeta.subtitle || ''}</p>
		</div>
	</div>

	<!-- Progress Stats -->
	<div class="progress-stats">
		<div class="stat-card">
			<div class="stat-value">{stats.problemsCompleted}/{stats.totalProblems}</div>
			<div class="stat-label">Problems Solved</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">🧱 {totalBloksEarned}</div>
			<div class="stat-label">Bloks Earned</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.totalProblems > 0 ? Math.round((stats.problemsCompleted / stats.totalProblems) * 100) : 0}%</div>
			<div class="stat-label">Completion</div>
		</div>
	</div>

	<!-- Problems -->
	<SectionsView 
		{sections}
		{locallyCompletedIds}
		{submittingProblemId}
		{canCompleteNow}
		onProblemComplete={(problemId) => handleProblemComplete({ detail: problemId })}
	/>
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
	.day-page {
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

	.day-header {
		background: white;
		border-radius: 1rem;
		padding: 2.5rem;
		margin-bottom: 2rem;
		display: flex;
		align-items: center;
		gap: 2rem;
		border: 2px solid #e5e7eb;
	}

	.day-header.bg-blue-100 { background: linear-gradient(135deg, #dbeafe 0%, #ffffff 100%); border-color: #93c5fd; }
	.day-header.bg-purple-100 { background: linear-gradient(135deg, #f3e8ff 0%, #ffffff 100%); border-color: #d8b4fe; }
	.day-header.bg-green-100 { background: linear-gradient(135deg, #d1fae5 0%, #ffffff 100%); border-color: #6ee7b7; }
	.day-header.bg-pink-100 { background: linear-gradient(135deg, #fce7f3 0%, #ffffff 100%); border-color: #f9a8d4; }
	.day-header.bg-yellow-100 { background: linear-gradient(135deg, #fef3c7 0%, #ffffff 100%); border-color: #fde047; }
	.day-header.bg-indigo-100 { background: linear-gradient(135deg, #e0e7ff 0%, #ffffff 100%); border-color: #a5b4fc; }
	.day-header.bg-red-100 { background: linear-gradient(135deg, #fee2e2 0%, #ffffff 100%); border-color: #fca5a5; }
	.day-header.bg-teal-100 { background: linear-gradient(135deg, #ccfbf1 0%, #ffffff 100%); border-color: #5eead4; }
	.day-header.bg-orange-100 { background: linear-gradient(135deg, #ffedd5 0%, #ffffff 100%); border-color: #fdba74; }

	.day-icon-large {
		font-size: 5rem;
		line-height: 1;
	}

	.day-header-content {
		flex: 1;
	}

	.day-label {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.day-title {
		font-size: 2.5rem;
		font-weight: 800;
		color: #111827;
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.day-description {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.6;
	}

	.progress-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		text-align: center;
		border: 2px solid #e5e7eb;
		transition: all 0.2s;
	}

	.stat-card:hover {
		border-color: #f59e0b;
		transform: translateY(-2px);
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 800;
		color: #111827;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 768px) {
		.day-page {
			padding: 1rem;
		}

		.day-header {
			flex-direction: column;
			text-align: center;
			padding: 2rem 1.5rem;
		}

		.day-icon-large {
			font-size: 4rem;
		}

		.day-title {
			font-size: 2rem;
		}

		.progress-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
