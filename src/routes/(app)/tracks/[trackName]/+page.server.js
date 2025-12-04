/**
 * @fileoverview Track page server-side data loading
 * Supports both regular tracks and course-style tracks (grouped by days)
 */

import { getTrackByName } from '$lib/api/problems.js';
import { getProblemsWithProgress, getLastCompletedAt, getTodayCompletionCount } from '$lib/api/submissions.js';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';

export const load = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	// Ensure user is authenticated
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error || !user) {
		throw redirect(303, '/login');
	}

	const trackName = event.params.trackName;

	try {
		// Fetch track info and problems
		const track = await getTrackByName(supabase, trackName);
		
		if (!track) {
			throw redirect(303, '/dashboard');
		}

		const problemsWithProgress = await getProblemsWithProgress(supabase, trackName, user.id);
		const lastCompletedAt = await getLastCompletedAt(supabase, user.id);
		
		// For DSA bootcamp, get today's completion count (daily limit: 20)
		let todayCompletions = 0;
		if (trackName === 'dsa-bootcamp') {
			todayCompletions = await getTodayCompletionCount(supabase, user.id, track.id);
		}
		
		// Check if this track has day-based structure (course style)
		const hasDayStructure = problemsWithProgress.some(p => 
			p.section_tags && p.section_tags.some(tag => tag.startsWith('Day '))
		);

		if (hasDayStructure) {
			// COURSE MODE: Group by days
			const groupedByDay = groupProblemsByDay(problemsWithProgress);
			
			return {
				track,
				problems: problemsWithProgress,
				groupedByDay,
				stats: calculateOverallStats(problemsWithProgress),
				totalBloksEarned: calculateTotalBloks(problemsWithProgress),
				lastCompletedAt,
				todayCompletions,
				user,
				isCourse: true
			};
		}

		// REGULAR MODE: Flat list
		const total = problemsWithProgress.length;
		const completed = problemsWithProgress.filter((p) => p.isCompleted).length;
		const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
		const totalBloksEarned = problemsWithProgress.reduce(
			(sum, p) => sum + (p.bloksEarnedFromThis || 0),
			0
		);

		return {
			track,
			problems: problemsWithProgress,
			stats: { total, completed, percentage },
			totalBloksEarned,
			lastCompletedAt,
			todayCompletions,
			user,
			isCourse: false
		};
	} catch (error) {
		console.error('Error loading track data:', error);
		throw redirect(303, '/dashboard');
	}
};

// Group problems by Day tag
function groupProblemsByDay(problems) {
	const grouped = {};

	problems.forEach((problem) => {
		const dayTag = problem.section_tags?.find(tag => tag.startsWith('Day ')) || 'Extras';
		
		if (!grouped[dayTag]) {
			grouped[dayTag] = [];
		}
		
		grouped[dayTag].push(problem);
	});

	// Sort by day number
	return Object.keys(grouped)
		.sort((a, b) => {
			const numA = parseInt(a.replace(/\D/g, '')) || 999;
			const numB = parseInt(b.replace(/\D/g, '')) || 999;
			return numA - numB;
		})
		.map(dayKey => ({
			day: dayKey,
			dayNumber: parseInt(dayKey.replace(/\D/g, '')) || 0,
			problems: grouped[dayKey],
			total: grouped[dayKey].length,
			completed: grouped[dayKey].filter(p => p.isCompleted).length
		}));
}

function calculateOverallStats(problems) {
	const total = problems.length;
	const completed = problems.filter(p => p.isCompleted).length;
	const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
	return { total, completed, percentage };
}

function calculateTotalBloks(problems) {
	return problems.reduce((sum, p) => sum + (p.bloksEarnedFromThis || 0), 0);
}
