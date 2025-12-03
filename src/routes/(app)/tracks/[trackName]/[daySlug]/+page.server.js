/**
 * @fileoverview Individual day page for course tracks
 * Displays all problems for a specific day using the standard problem display template
 */

import { getTrackByName } from '$lib/api/problems.js';
import { getProblemsWithProgress, getLastCompletedAt } from '$lib/api/submissions.js';
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
	const daySlug = event.params.daySlug;

	try {
		// Fetch track info
		const track = await getTrackByName(supabase, trackName);
		
		if (!track) {
			throw redirect(303, '/dashboard');
		}

		// Get all problems with user progress
		const problemsWithProgress = await getProblemsWithProgress(supabase, user.id, track.id);

		// Convert day slug to day label (e.g., "day-1" -> "Day 1")
		const dayLabel = daySlug
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		// Filter problems for this specific day
		const dayProblems = problemsWithProgress.filter(problem => 
			problem.section_tags?.includes(dayLabel)
		);

		if (dayProblems.length === 0) {
			throw redirect(303, `/tracks/${trackName}`);
		}

		// Calculate stats for this day
		const completedProblems = dayProblems.filter(p => p.isCompleted).length;
		const totalBloksEarned = dayProblems
			.filter(p => p.isCompleted)
			.reduce((sum, p) => sum + (p.bloksEarnedFromThis || 0), 0);

		const stats = {
			problemsCompleted: completedProblems,
			totalProblems: dayProblems.length
		};

		// Get last completed timestamp for cooldown
		const lastCompletedAt = await getLastCompletedAt(supabase, user.id);

		return {
			track,
			dayLabel,
			daySlug,
			problems: dayProblems,
			stats,
			totalBloksEarned,
			lastCompletedAt,
			user
		};
	} catch (err) {
		console.error('Error loading day page:', err);
		throw redirect(303, '/dashboard');
	}
};
