<script>
	import { scale, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { getTrackInfo } from '$lib/config/tracks.js';
	
	export let data;
	
	const { tracks, user } = data;
	
	// Normalize track names for URL mapping
	const normalizeTrackName = (name) => {
		return name?.toLowerCase()
			.replace(/[_\s]+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
	};
	
	// Map database track names to our config keys and display info
	const trackConfig = {
		'buildingblocks': { 
			display: 'Building Blocks', 
			urlKey: 'building-blocks',
			order: 1,
			comingSoon: false
		},
		'building-blocks': { 
			display: 'Building Blocks', 
			urlKey: 'building-blocks',
			order: 1,
			comingSoon: false
		},
		'deepdive': { 
			display: 'Deep Dive', 
			urlKey: 'deep-dive',
			order: 2,
			comingSoon: false
		},
		'deep-dive': { 
			display: 'Deep Dive', 
			urlKey: 'deep-dive',
			order: 2,
			comingSoon: false
		},
		'interview-essentials': { 
			display: 'Interview Prep', 
			urlKey: 'interview-essentials',
			order: 3,
			comingSoon: true
		},
		'interviewessentials': { 
			display: 'Interview Prep', 
			urlKey: 'interview-essentials',
			order: 3,
			comingSoon: true
		},
		'interviewprep': { 
			display: 'Interview Prep', 
			urlKey: 'interview-essentials',
			order: 3,
			comingSoon: true
		},
		'dsa-bootcamp': { 
			display: 'DSA Bootcamp', 
			urlKey: 'dsa-bootcamp',
			order: 4,
			comingSoon: false
		},
		'dsabootcamp': { 
			display: 'DSA Bootcamp', 
			urlKey: 'dsa-bootcamp',
			order: 4,
			comingSoon: false
		}
	};
	
	// Process and filter tracks - deduplicate by urlKey
	const trackMap = new Map();
	tracks?.forEach(track => {
		const normalized = normalizeTrackName(track.name);
		const config = trackConfig[normalized];
		
		if (!config) return;
		
		// Only add if we haven't seen this urlKey before, or if this one has more problems
		const existing = trackMap.get(config.urlKey);
		if (!existing || track.totalProblems > existing.totalProblems) {
			trackMap.set(config.urlKey, {
				...track,
				displayName: config.display,
				urlKey: config.urlKey,
				order: config.order,
				isComingSoon: config.comingSoon
			});
		}
	});
	
	// Convert map to array and sort
	const orderedTracks = Array.from(trackMap.values())
		.sort((a, b) => a.order - b.order);
</script>

<svelte:head>
	<title>Learning Tracks - KodeBloks</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
	<!-- Header -->
	<div class="mb-12" in:fade={{ duration: 500, easing: cubicOut }}>
		<h1 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
			Learning Tracks
		</h1>
		<p class="text-lg md:text-xl text-neutral-600">
			Choose your path and master Data Structures & Algorithms
		</p>
	</div>

	<!-- Tracks Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
		{#each orderedTracks as track, i}
			{@const trackInfo = getTrackInfo(track.urlKey)}
			{@const progress = track.totalProblems > 0 ? (track.completedProblems / track.totalProblems) * 100 : 0}
			
			<article 
				class="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-neutral-200 hover:border-amber-400 group relative"
				in:scale={{ duration: 400, delay: 200 + i * 100, easing: cubicOut, start: 0.95 }}
			>
				{#if track.isComingSoon}
					<div class="absolute top-4 right-4 bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full z-10 shadow-md">
						Coming Soon
					</div>
				{/if}
				
				<div class="p-8">
					<!-- Track Name -->
					<h2 class="text-2xl font-bold text-neutral-900 mb-4">
						{track.displayName}
					</h2>
					
					<!-- Description -->
					<p class="text-neutral-600 mb-6 leading-relaxed">
						{track.description || trackInfo?.description || 'Master key programming concepts'}
					</p>
					
					{#if !track.isComingSoon}
						<!-- Stats -->
						<div class="space-y-3 mb-6">
							<div class="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
								<span class="text-sm font-medium text-neutral-700">Total Problems</span>
								<span class="text-lg font-bold text-neutral-900">{track.totalProblems}</span>
							</div>
							<div class="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
								<span class="text-sm font-medium text-amber-700">Completed</span>
								<span class="text-lg font-bold text-amber-700">
									{track.completedProblems}/{track.totalProblems}
								</span>
							</div>
						</div>
						
						<!-- Progress Bar -->
						<div class="w-full bg-neutral-200 rounded-full h-3 overflow-hidden mb-6">
							<div 
								class="h-full rounded-full transition-all duration-500 bg-linear-to-r from-amber-400 to-amber-600"
								style="width: {progress}%;"
							></div>
						</div>
						
						<!-- CTA Button - Enhanced -->
						<a
							href="/tracks/{track.urlKey}"
							class="cta-button group/btn"
							data-sveltekit-preload-data="hover"
						>
							<span class="cta-button-content">
								<span class="cta-button-text">Start Solving</span>
								<svg class="cta-arrow" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
								</svg>
							</span>
							<span class="cta-button-glow"></span>
						</a>
					{:else}
						<!-- Coming Soon State -->
						<div class="mb-6 p-5 bg-neutral-50 rounded-lg border border-neutral-200">
							<p class="text-sm text-neutral-600 text-center">
								This track is being prepared. Stay tuned!
							</p>
						</div>
						
						<!-- Disabled Button -->
						<button
							disabled
							class="block w-full text-center py-4 px-6 rounded-lg text-white font-semibold bg-neutral-400 cursor-not-allowed"
						>
							Coming Soon
						</button>
					{/if}
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	/* Enhanced CTA Button */
	.cta-button {
		position: relative;
		display: block;
		width: 100%;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		border-radius: 0.75rem;
		font-weight: 700;
		font-size: 1rem;
		text-align: center;
		color: white;
		text-decoration: none;
		overflow: hidden;
		box-shadow: 0 4px 14px 0 rgba(217, 119, 6, 0.39);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
	}
	
	.cta-button:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 20px 0 rgba(217, 119, 6, 0.5);
		background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
	}
	
	.cta-button:active {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px 0 rgba(217, 119, 6, 0.4);
	}
	
	.cta-button-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		z-index: 1;
	}
	
	.cta-button-text {
		font-weight: 700;
		letter-spacing: 0.025em;
	}
	
	.cta-arrow {
		width: 1.25rem;
		height: 1.25rem;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.cta-button:hover .cta-arrow {
		transform: translateX(4px);
		animation: arrow-pulse 0.6s ease-in-out infinite;
	}
	
	.cta-button-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.3) 100%);
		background-size: 200% 100%;
		background-position: 200% 0;
		transition: background-position 0.6s ease;
		border-radius: 0.75rem;
		pointer-events: none;
	}
	
	.cta-button:hover .cta-button-glow {
		background-position: -200% 0;
	}
	
	@keyframes arrow-pulse {
		0%, 100% {
			transform: translateX(4px);
		}
		50% {
			transform: translateX(8px);
		}
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.cta-button {
			padding: 0.875rem 1.25rem;
			font-size: 0.9375rem;
		}
	}
</style>
