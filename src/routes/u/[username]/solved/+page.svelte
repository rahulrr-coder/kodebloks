<script>
	import { ArrowLeft, ExternalLink, Trophy, Calendar, Target } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import DifficultyBadge from '$lib/components/common/DifficultyBadge.svelte';

	export let data;

	const { profile, submissions, isPublicView } = data;

	// Group submissions by track
	const submissionsByTrack = {};
	submissions.forEach(sub => {
		const trackName = sub.problems?.tracks?.display_name || 'Other';
		if (!submissionsByTrack[trackName]) {
			submissionsByTrack[trackName] = {
				icon: sub.problems?.tracks?.icon || '📚',
				problems: []
			};
		}
		submissionsByTrack[trackName].problems.push(sub);
	});

	// Calculate stats
	const totalProblems = submissions.length;
	const totalBloks = submissions.reduce((sum, sub) => sum + (sub.bloks_earned || 0), 0);
	const difficultyCount = {
		easy: submissions.filter(s => s.problems?.difficulty === 'easy').length,
		medium: submissions.filter(s => s.problems?.difficulty === 'medium').length,
		hard: submissions.filter(s => s.problems?.difficulty === 'hard').length
	};

	// Format date
	function formatDate(dateStr) {
		if (!dateStr) return 'Unknown';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get platform badge color
	function getPlatformColor(platform) {
		const colors = {
			leetcode: 'bg-orange-100 text-orange-700',
			codeforces: 'bg-blue-100 text-blue-700',
			hackerrank: 'bg-green-100 text-green-700',
			gfg: 'bg-emerald-100 text-emerald-700',
			other: 'bg-gray-100 text-gray-700'
		};
		return colors[platform] || colors.other;
	}
</script>

<svelte:head>
	<title>{profile?.display_name || profile?.username}'s Solved Problems | KodeBloks</title>
	<meta name="description" content="View all problems solved by {profile?.display_name || profile?.username} on KodeBloks" />
</svelte:head>

<div class="min-h-screen bg-neutral-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8" in:fade={{ duration: 300 }}>
			<a 
				href="/u/{profile.username}" 
				class="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4 transition-colors"
			>
				<ArrowLeft size={20} />
				Back to Profile
			</a>
			
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-4xl font-bold text-neutral-900 mb-2">
						Problems Solved
					</h1>
					<p class="text-lg text-neutral-600">
						by {profile?.display_name || profile?.username}
					</p>
				</div>
				{#if isPublicView}
					<span class="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Public View</span>
				{/if}
			</div>
		</div>

		<!-- Stats Summary -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div class="card text-center" in:fly={{ y: 20, duration: 500, delay: 100 }}>
				<div class="text-amber-600 mb-2 flex justify-center">
					<Trophy size={28} />
				</div>
				<div class="text-3xl font-bold text-neutral-900">{totalProblems}</div>
				<div class="text-sm text-neutral-600">Total Solved</div>
			</div>

			<div class="card text-center" in:fly={{ y: 20, duration: 500, delay: 200 }}>
				<div class="text-amber-600 mb-2 flex justify-center">
					<Target size={28} />
				</div>
				<div class="text-3xl font-bold text-neutral-900">{totalBloks}</div>
				<div class="text-sm text-neutral-600">Bloks Earned</div>
			</div>

			<div class="card" in:fly={{ y: 20, duration: 500, delay: 300 }}>
				<div class="text-sm text-neutral-600 mb-2 text-center">By Difficulty</div>
				<div class="flex justify-around items-center">
					<div class="text-center">
						<div class="text-xl font-bold text-green-600">{difficultyCount.easy}</div>
						<div class="text-xs text-neutral-500">Easy</div>
					</div>
					<div class="text-center">
						<div class="text-xl font-bold text-yellow-600">{difficultyCount.medium}</div>
						<div class="text-xs text-neutral-500">Medium</div>
					</div>
					<div class="text-center">
						<div class="text-xl font-bold text-red-600">{difficultyCount.hard}</div>
						<div class="text-xs text-neutral-500">Hard</div>
					</div>
				</div>
			</div>

			<div class="card text-center" in:fly={{ y: 20, duration: 500, delay: 400 }}>
				<div class="text-amber-600 mb-2 flex justify-center">
					<Calendar size={28} />
				</div>
				<div class="text-lg font-bold text-neutral-900">
					{submissions.length > 0 ? formatDate(submissions[0].submitted_at).split(',')[0] : 'N/A'}
				</div>
				<div class="text-sm text-neutral-600">Latest Solve</div>
			</div>
		</div>

		<!-- Problems List -->
		{#if submissions.length === 0}
			<div class="card text-center py-12" in:fade={{ duration: 300 }}>
				<div class="text-6xl mb-4">🎯</div>
				<p class="text-lg text-neutral-600">No problems solved yet</p>
			</div>
		{:else}
			<!-- Group by Track -->
			{#each Object.entries(submissionsByTrack) as [trackName, trackData], i}
				<div class="card mb-6" in:fly={{ y: 30, duration: 500, delay: 100 + i * 50 }}>
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">{trackData.icon}</span>
						<div>
							<h2 class="text-2xl font-bold text-neutral-900">{trackName}</h2>
							<p class="text-sm text-neutral-600">{trackData.problems.length} problems</p>
						</div>
					</div>

					<div class="space-y-3">
						{#each trackData.problems as submission}
							<div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-2">
										<h3 class="font-semibold text-neutral-900">
											{submission.problems?.title || 'Unknown Problem'}
										</h3>
										<DifficultyBadge difficulty={submission.problems?.difficulty} />
										<span class="text-xs {getPlatformColor(submission.problems?.external_platform)} px-2 py-1 rounded-full font-medium uppercase">
											{submission.problems?.external_platform || 'other'}
										</span>
									</div>
									<div class="flex items-center gap-4 text-sm text-neutral-600">
										<span class="flex items-center gap-1">
											<Target size={14} />
											{submission.bloks_earned} bloks
										</span>
										<span class="flex items-center gap-1">
											<Calendar size={14} />
											{formatDate(submission.submitted_at)}
										</span>
									</div>
								</div>
								
								{#if submission.problems?.external_url}
									<a
										href={submission.problems.external_url}
										target="_blank"
										rel="noopener noreferrer"
										class="btn btn-secondary flex items-center gap-2"
									>
										<ExternalLink size={16} />
										View Problem
									</a>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.card {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
		border: 1px solid rgb(229 229 229);
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.btn-secondary {
		background: white;
		color: rgb(64 64 64);
		border: 1px solid rgb(212 212 212);
	}

	.btn-secondary:hover {
		background: rgb(250 250 250);
		border-color: rgb(163 163 163);
	}
</style>
