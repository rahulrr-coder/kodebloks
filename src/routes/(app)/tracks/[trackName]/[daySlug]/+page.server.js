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

	console.log('Loading day page:', { trackName, daySlug });

	try {
		// Fetch track info
		const track = await getTrackByName(supabase, trackName);
		
		if (!track) {
			console.error('Track not found:', trackName);
			throw redirect(303, '/dashboard');
		}

		console.log('Track found:', track.name);

		// Get all problems with user progress - correct parameter order
		const problemsWithProgress = await getProblemsWithProgress(supabase, trackName, user.id);

		console.log('Total problems loaded:', problemsWithProgress.length);

		// Convert day slug to day label (e.g., "day-1" -> "Day 1")
		const dayLabel = daySlug
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		console.log('Looking for day:', dayLabel);

		// Filter problems for this specific day
		// Database only has section_tags array (no section field)
		const dayProblems = problemsWithProgress.filter(problem => {
			// Check if section_tags includes this day label
			const hasDay = problem.section_tags?.includes(dayLabel);
			
			if (hasDay) {
				console.log('Problem matched:', problem.title, 'tags:', problem.section_tags);
			}
			return hasDay;
		});

		console.log('Day problems found:', dayProblems.length);

		if (dayProblems.length === 0) {
			console.error('No problems found for day:', dayLabel);
			console.log('Sample problem tags:', problemsWithProgress.slice(0, 5).map(p => ({
				title: p.title,
				tags: p.section_tags
			})));
			console.log('Expected tag:', dayLabel);
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
