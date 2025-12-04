/**
 * @fileoverview API functions for problem submissions and completion tracking
 * Aligned with new database schema (user_submissions, user_profiles, etc.)
 */

import { getCurrentWeekStart } from '$lib/utils/dateUtils.js';
import { checkAndAwardBadges } from '$lib/services/badges.js';

// Named constant for weekly qualification threshold
const WEEKLY_QUALIFICATION_THRESHOLD = 150;

/**
 * Update user's weekly streak when they qualify
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @param {string} weekStartStr - Week start date string (YYYY-MM-DD)
 */
async function updateWeeklyStreak(supabase, userId, weekStartStr) {
	// Check if user just qualified this week
	const { data: thisWeek } = await supabase
		.from('weekly_progress')
		.select('qualified, bloks_earned, streak_updated')
		.eq('user_id', userId)
		.eq('week_start_date', weekStartStr)
		.single();

	if (!thisWeek || !thisWeek.qualified || thisWeek.streak_updated) {
		return; // Not qualified yet or streak already updated
	}

	// Get previous week's progress to check streak
	const prevWeekDate = new Date(weekStartStr);
	prevWeekDate.setDate(prevWeekDate.getDate() - 7);
	const prevWeekStr = prevWeekDate.toISOString().split('T')[0];

	const { data: prevWeek } = await supabase
		.from('weekly_progress')
		.select('qualified')
		.eq('user_id', userId)
		.eq('week_start_date', prevWeekStr)
		.maybeSingle();

	// Get current profile stats
	const { data: profile } = await supabase
		.from('user_profiles')
		.select('consecutive_qualified_weeks, highest_consecutive_weeks, total_qualified_weeks')
		.eq('user_id', userId)
		.single();

	if (!profile) return;

	let newConsecutiveWeeks;
	if (prevWeek && prevWeek.qualified) {
		// Continue streak
		newConsecutiveWeeks = (profile.consecutive_qualified_weeks || 0) + 1;
	} else {
		// New streak starts
		newConsecutiveWeeks = 1;
	}

	const newHighestWeeks = Math.max(newConsecutiveWeeks, profile.highest_consecutive_weeks || 0);

	// Check if this week has already been counted in total_qualified_weeks
	const { data: alreadyCounted } = await supabase
		.from('weekly_progress')
		.select('qualified, counted_in_total')
		.eq('user_id', userId)
		.eq('week_start_date', weekStartStr)
		.maybeSingle();

	let newTotalWeeks = profile.total_qualified_weeks || 0;
	if (!alreadyCounted) {
		newTotalWeeks += 1;
		// Mark this week as counted to prevent future increments
		await supabase
			.from('weekly_progress')
			.update({ counted_in_total: true })
			.eq('user_id', userId)
			.eq('week_start_date', weekStartStr);
	}

	// Update profile with new streak info
	await supabase
		.from('user_profiles')
		.update({
			consecutive_qualified_weeks: newConsecutiveWeeks,
			highest_consecutive_weeks: newHighestWeeks,
			total_qualified_weeks: newTotalWeeks,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', userId);

	// Mark streak as updated for this week to prevent duplicate updates
	await supabase
		.from('weekly_progress')
		.update({ streak_updated: true })
		.eq('user_id', userId)
		.eq('week_start_date', weekStartStr);
}

/**
 * Get all submissions for a user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @returns {Promise<Array<Object>>} Array of submission records
 */
export async function getUserSubmissions(supabase, userId) {
	const { data, error } = await supabase
		.from('user_submissions')
		.select(`
			*,
			problem:problems(*)
		`)
		.eq('user_id', userId)
		.order('submitted_at', { ascending: false });

	if (error) throw error;
	return data || [];
}

/**
 * Check if user has completed a specific problem
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @param {string} problemId - Problem UUID
 * @returns {Promise<Object|null>} Submission record or null
 */
export async function getSubmissionForProblem(supabase, userId, problemId) {
	const { data, error } = await supabase
		.from('user_submissions')
		.select('*')
		.eq('user_id', userId)
		.eq('problem_id', problemId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

/**
 * Mark a problem as complete
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @param {string} problemId - Problem UUID
 * @param {number} bloksEarned - Bloks value of the problem
 * @returns {Promise<Object>} Created submission record
 */
export async function markProblemComplete(supabase, userId, problemId, bloksEarned) {
	// 1. Insert submission record
	const { data: submission, error: submissionError } = await supabase
		.from('user_submissions')
		.insert({
			user_id: userId,
			problem_id: problemId,
			bloks_earned: bloksEarned,
			submitted_at: new Date().toISOString()
		})
		.select()
		.single();

	if (submissionError) throw submissionError;

	// Fetch problem details (track_id) for updating track_progress
	const { data: problem, error: problemError } = await supabase
		.from('problems')
		.select('track_id')
		.eq('id', problemId)
		.single();

	if (problemError) {
		console.error(`Error fetching problem details - track progress will not be updated: ${problemError}`);
	}

	// 3. Update user_profiles (lifetime stats)
	const { error: profileError } = await supabase.rpc('increment_user_stats', {
		user_id_param: userId,
		bloks_param: bloksEarned
	});

	if (profileError) {
		console.error('Error updating profile stats:', profileError);
		// Fallback: manual update
		try {
			const { data: profile, error: profileFetchError } = await supabase
				.from('user_profiles')
				.select('total_bloks_lifetime, total_problems_solved')
				.eq('user_id', userId)
				.single();

			if (profileFetchError) {
				console.error('Error fetching user profile for fallback:', profileFetchError);
			}

			if (profile) {
				const { error: fallbackUpdateError } = await supabase
					.from('user_profiles')
					.update({
						total_bloks_lifetime: (profile.total_bloks_lifetime || 0) + bloksEarned,
						total_problems_solved: (profile.total_problems_solved || 0) + 1,
						updated_at: new Date().toISOString()
					})
					.eq('user_id', userId);

				if (fallbackUpdateError) {
					console.error('Fallback update of user profile stats failed:', fallbackUpdateError);
				}
			}
		} catch (fallbackErr) {
			console.error('Exception during fallback profile update:', fallbackErr);
		}
	}

	// 4. Update weekly_progress
	const weekStartStr = getCurrentWeekStart();

	// Check if weekly_progress record exists
	const { data: weeklyProgress } = await supabase
		.from('weekly_progress')
		.select('bloks_earned, problems_solved, qualified')
		.eq('user_id', userId)
		.eq('week_start_date', weekStartStr)
		.maybeSingle();

	if (weeklyProgress) {
		// Update existing record
		const newBloksTotal = (weeklyProgress.bloks_earned || 0) + bloksEarned;
		const wasQualified = weeklyProgress.qualified;
		const nowQualified = newBloksTotal >= WEEKLY_QUALIFICATION_THRESHOLD;
		
		await supabase
			.from('weekly_progress')
			.update({
				bloks_earned: newBloksTotal,
				problems_solved: (weeklyProgress.problems_solved || 0) + 1,
				qualified: nowQualified
			})
			.eq('user_id', userId)
			.eq('week_start_date', weekStartStr);

		// Update streak if they just qualified (updateWeeklyStreak will check streak_updated)
		if (!wasQualified && nowQualified) {
			await updateWeeklyStreak(supabase, userId, weekStartStr);
		}
	} else {
		// Insert new record
		const nowQualified = bloksEarned >= WEEKLY_QUALIFICATION_THRESHOLD;
		
		await supabase
			.from('weekly_progress')
			.insert({
				user_id: userId,
				week_start_date: weekStartStr,
				bloks_earned: bloksEarned,
				problems_solved: 1,
				qualified: nowQualified
			});
		
		// Update streak if they qualified immediately
		if (nowQualified) {
			await updateWeeklyStreak(supabase, userId, weekStartStr);
		}
	}

	// 5. Update track_progress (if we have track_id)
	if (problem?.track_id) {
		const { data: trackProgress } = await supabase
			.from('track_progress')
			.select('problems_solved, total_bloks_earned')
			.eq('user_id', userId)
			.eq('track_id', problem.track_id)
			.maybeSingle();

		if (trackProgress) {
			// Update existing record
			await supabase
				.from('track_progress')
				.update({
					problems_solved: (trackProgress.problems_solved || 0) + 1,
					total_bloks_earned: (trackProgress.total_bloks_earned || 0) + bloksEarned,
					last_solved_at: new Date().toISOString()
				})
				.eq('user_id', userId)
				.eq('track_id', problem.track_id);
		} else {
			// Insert new record
			await supabase
				.from('track_progress')
				.insert({
					user_id: userId,
					track_id: problem.track_id,
					problems_solved: 1,
					total_bloks_earned: bloksEarned,
					last_solved_at: new Date().toISOString()
				});
		}
	}

	// 6. Check and award badges based on updated stats
	let newBadges = [];
	try {
		newBadges = await checkAndAwardBadges(userId, supabase);
		if (newBadges.length > 0) {
			console.log(`🎉 User ${userId} earned ${newBadges.length} new badge(s)!`);
		}
	} catch (badgeError) {
		console.error('Error checking/awarding badges:', badgeError);
		// Don't fail the submission if badge awarding fails
	}

	return {
		submission,
		newBadges
	};
}

/**
 * Update user's last completion timestamp
 * NO-OP: We track submissions in user_submissions table, not a separate timestamp
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Empty object for compatibility
 */
export async function updateLastCompletedAt(supabase, userId) {
	// This function is kept for API compatibility but does nothing
	// The submission timestamp is already recorded in user_submissions.submitted_at
	return {};
}

/**
 * Get user's last completion timestamp from most recent submission
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @returns {Promise<Date|null>} Last completion timestamp
 */
export async function getLastCompletedAt(supabase, userId) {
	try {
		const { data, error } = await supabase
			.from('user_submissions')
			.select('submitted_at')
			.eq('user_id', userId)
			.order('submitted_at', { ascending: false })
			.limit(1)
			.single();

		if (error) {
			// No submissions yet
			if (error.code === 'PGRST116') {
				return null;
			}
			console.warn('Could not fetch last submission:', error.message);
			return null;
		}
		return data?.submitted_at || null;
	} catch (err) {
		console.warn('Error fetching last submission:', err);
		return null;
	}
}

/**
 * Get user's completion count for today (for a specific track)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} userId - User UUID
 * @param {string} trackId - Track UUID
 * @returns {Promise<number>} Number of problems completed today
 */
export async function getTodayCompletionCount(supabase, userId, trackId) {
	try {
		// Get start of today in UTC
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		const todayStr = today.toISOString();

		const { data, error } = await supabase
			.from('user_submissions')
			.select('id', { count: 'exact', head: false })
			.eq('user_id', userId)
			.gte('submitted_at', todayStr)
			.in('problem_id', 
				supabase
					.from('problems')
					.select('id')
					.eq('track_id', trackId)
			);

		if (error) {
			console.warn('Error fetching today completion count:', error);
			return 0;
		}

		return data?.length || 0;
	} catch (err) {
		console.warn('Error calculating today completion count:', err);
		return 0;
	}
}

/**
 * Get problems with user's completion status
 * OPTIMIZED: Uses single query with LEFT JOIN for better performance
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client instance
 * @param {string} trackName - Track name (e.g., 'building-blocks')
 * @param {string} userId - User UUID
 * @returns {Promise<Array<Object>>} Problems with isCompleted and completedAt fields
 */
export async function getProblemsWithProgress(supabase, trackName, userId) {
	// Get track first
	const { data: track, error: trackError } = await supabase
		.from('tracks')
		.select('id')
		.eq('name', trackName)
		.single();

	if (trackError || !track) return [];

	// OPTIMIZED: Single query with LEFT JOIN instead of 3 separate queries
	const { data: problems, error: problemsError } = await supabase
		.from('problems')
		.select(`
			*,
			user_submissions!left (
				problem_id,
				submitted_at,
				bloks_earned
			)
		`)
		.eq('track_id', track.id)
		.eq('user_submissions.user_id', userId)
		.order('sort_order');

	if (problemsError) throw problemsError;

	// Transform data: user_submissions array will have 0 or 1 items
	const problemsWithProgress = problems.map((problem) => {
		const submission = problem.user_submissions?.[0];
		return {
			...problem,
			user_submissions: undefined, // Remove the join data
			isCompleted: !!submission,
			completedAt: submission?.submitted_at || null,
			bloksEarnedFromThis: submission?.bloks_earned || 0
		};
	});

	return problemsWithProgress;
}
