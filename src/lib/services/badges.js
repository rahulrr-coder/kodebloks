/**
 * @fileoverview Badge service for checking and awarding achievements
 */

import { ACHIEVEMENTS } from '$lib/config/badges.js';
import { createSupabaseServerClient } from '$lib/supabase.js';

/**
 * Check and award new badges to a user based on their current stats
 * @param {string} userId - User ID
 * @param {Object} supabaseOrEvent - Either a Supabase client or SvelteKit event
 * @returns {Promise<Array>} Array of newly awarded badges
 */
export async function checkAndAwardBadges(userId, supabaseOrEvent) {
	// Support both Supabase client and event object
	const supabase = supabaseOrEvent.from ? supabaseOrEvent : createSupabaseServerClient(supabaseOrEvent);

	try {
		// Parallelize initial data fetching for faster badge checking
		const [profileResult, submissionsResult, userBadgesResult] = await Promise.all([
			// Query 1: User profile stats
			supabase
				.from('user_profiles')
				.select('total_problems_solved, consecutive_qualified_weeks, total_bloks_lifetime')
				.eq('user_id', userId)
				.single(),

			// Query 2: Get user submissions with problem difficulty for difficulty counts
			supabase
				.from('user_submissions')
				.select('problems(difficulty)')
				.eq('user_id', userId),

			// Query 3: Already earned badges
			supabase
				.from('user_badges')
				.select('badge_id')
				.eq('user_id', userId)
		]);

		// Check for profile fetch error
		if (profileResult.error) {
			console.error('Error fetching user profile for badge check:', profileResult.error);
			return [];
		}

		const profile = profileResult.data;

		// Process submissions for difficulty counts
		if (submissionsResult.error) {
			console.error('Error fetching user submissions:', submissionsResult.error);
		}

		// Calculate difficulty counts from submissions
		const difficultyCount = {};
		if (submissionsResult.data) {
			submissionsResult.data.forEach(submission => {
				const difficulty = submission.problems?.difficulty;
				if (difficulty) {
					difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
				}
			});
		}

		// Build stats object for achievement checking
		const stats = {
			totalSolved: profile.total_problems_solved || 0,
			totalPoints: profile.total_bloks_lifetime || 0,
			streakWeeks: profile.consecutive_qualified_weeks || 0,
			difficultyCount: difficultyCount
		};

		// Process user badges
		if (userBadgesResult.error) {
			console.error('Error fetching user badges:', userBadgesResult.error);
			return [];
		}

		const earnedBadgeIds = new Set((userBadgesResult.data || []).map(b => b.badge_id));

		// Check which achievements are unlocked based on current stats
		const unlockedAchievements = ACHIEVEMENTS.filter(achievement => achievement.condition(stats));

		// Get badge IDs from database for unlocked achievements
		const { data: availableBadges, error: availableError } = await supabase
			.from('badges')
			.select('id, name, display_name, icon, description')
			.in('name', unlockedAchievements.map(a => a.id));

		if (availableError) {
			console.error('Error fetching available badges:', availableError);
			return [];
		}

		// Find newly unlocked badges (unlocked but not yet awarded)
		const newBadges = [];
		for (const badge of availableBadges || []) {
			if (!earnedBadgeIds.has(badge.id)) {
				newBadges.push(badge);
			}
		}

		// Award new badges in parallel for faster processing
		if (newBadges.length === 0) {
			return [];
		}

		const awardPromises = newBadges.map(badge =>
			supabase
				.from('user_badges')
				.insert({
					user_id: userId,
					badge_id: badge.id,
					earned_at: new Date().toISOString()
				})
				.then(({ error }) => ({ badge, error }))
		);

		const results = await Promise.all(awardPromises);

		const awardedBadges = [];
		for (const { badge, error } of results) {
			if (error) {
				console.error(`Error awarding badge ${badge.name}:`, error);
			} else {
				console.log(`✨ Badge awarded: ${badge.display_name} to user ${userId}`);
				awardedBadges.push(badge);
			}
		}

		return awardedBadges;

	} catch (error) {
		console.error('Error in checkAndAwardBadges:', error);
		return [];
	}
}

/**
 * Get all badges earned by a user
 * @param {string} userId - User ID
 * @param {Object} supabaseOrEvent - Either a Supabase client or SvelteKit event
 * @returns {Promise<Array>} Array of earned badges with details
 */
export async function getUserBadges(userId, supabaseOrEvent) {
	// Support both Supabase client and event object
	const supabase = supabaseOrEvent.from ? supabaseOrEvent : createSupabaseServerClient(supabaseOrEvent);

	const { data, error } = await supabase
		.from('user_badges')
		.select(`
			earned_at,
			badges (
				id,
				name,
				display_name,
				description,
				icon,
				color,
				badge_type
			)
		`)
		.eq('user_id', userId)
		.order('earned_at', { ascending: false });

	if (error) {
		console.error('Error fetching user badges:', error);
		return [];
	}

	return data || [];
}

/**
 * Initialize badge data in database if not exists
 * This should be run once to populate the badges table
 * @param {Object} event - SvelteKit event for creating Supabase client
 */
export async function initializeBadges(event) {
	const supabase = createSupabaseServerClient(event);

	const badgeData = [
		{
			name: 'first-steps',
			display_name: 'First Steps',
			description: 'Solved your first problem',
			badge_type: 'problem_milestone',
			problems_requirement: 1,
			icon: '🎯',
			color: 'blue',
			sort_order: 1
		},
		{
			name: 'problem-solver',
			display_name: 'Problem Solver',
			description: 'Solved 10 problems',
			badge_type: 'problem_milestone',
			problems_requirement: 10,
			icon: '🔥',
			color: 'green',
			sort_order: 2
		},
		{
			name: 'rising-star',
			display_name: 'Rising Star',
			description: 'Solved 25 problems',
			badge_type: 'problem_milestone',
			problems_requirement: 25,
			icon: '⭐',
			color: 'yellow',
			sort_order: 3
		},
		{
			name: 'half-century',
			display_name: 'Half Century',
			description: 'Solved 50 problems',
			badge_type: 'problem_milestone',
			problems_requirement: 50,
			icon: '💯',
			color: 'purple',
			sort_order: 4
		},
		{
			name: 'consistent',
			display_name: 'Consistent',
			description: 'Maintained a 4 week streak',
			badge_type: 'weekly_milestone',
			week_requirement: 4,
			icon: '💪',
			color: 'purple',
			sort_order: 5
		},
		{
			name: 'marathon-runner',
			display_name: 'Marathon Runner',
			description: 'Maintained a 12 week streak',
			badge_type: 'weekly_milestone',
			week_requirement: 12,
			icon: '🏃',
			color: 'indigo',
			sort_order: 6
		},
		{
			name: 'hard-worker',
			display_name: 'Hard Worker',
			description: 'Solved 5 hard problems',
			badge_type: 'special',
			problems_requirement: 5,
			icon: '🎖️',
			color: 'red',
			sort_order: 7
		},
		{
			name: 'point-master',
			display_name: 'Point Master',
			description: 'Earned 50+ bloks',
			badge_type: 'special',
			icon: '👑',
			color: 'indigo',
			sort_order: 8
		},
		{
			name: 'point-legend',
			display_name: 'Point Legend',
			description: 'Earned 100+ bloks',
			badge_type: 'special',
			icon: '💎',
			color: 'pink',
			sort_order: 9
		}
	];

	for (const badge of badgeData) {
		const { error } = await supabase
			.from('badges')
			.upsert(badge, { onConflict: 'name' });

		if (error) {
			console.error(`Error initializing badge ${badge.name}:`, error);
		}
	}

	console.log('✅ Badge database initialized');
}
