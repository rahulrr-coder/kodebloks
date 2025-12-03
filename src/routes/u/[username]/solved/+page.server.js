/**
 * @fileoverview Public solved problems page - shows all problems solved by a user
 */

import { createSupabaseServerClient } from '$lib/supabase.js';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	try {
		const { username } = event.params;

		if (!username) {
			throw error(400, 'Username is required');
		}

		const supabase = createSupabaseServerClient(event);

		// Fetch user profile by username
		const { data: profile, error: profileError } = await supabase
			.from('user_profiles')
			.select('user_id, username, display_name, avatar_id')
			.eq('username', username)
			.single();

		if (profileError || !profile) {
			console.error('Profile not found for username:', username, profileError);
			throw error(404, 'User not found');
		}

		// Fetch all submissions with problem details
		const { data: submissions, error: submissionsError } = await supabase
			.from('user_submissions')
			.select(`
				id,
				bloks_earned,
				submitted_at,
				problems (
					id,
					title,
					slug,
					difficulty,
					bloks,
					external_platform,
					external_url,
					track_id,
					tracks (
						name,
						display_name,
						icon
					)
				)
			`)
			.eq('user_id', profile.user_id)
			.order('submitted_at', { ascending: false });

		if (submissionsError) {
			console.error('Error fetching submissions:', submissionsError);
			throw error(500, 'Failed to load solved problems');
		}

		return {
			profile: {
				username: profile.username,
				display_name: profile.display_name,
				avatar_id: profile.avatar_id
			},
			submissions: submissions || [],
			isPublicView: true
		};
	} catch (err) {
		// If it's already a SvelteKit error (404, 400), re-throw it
		if (err.status) {
			throw err;
		}
		// Otherwise, log and throw 500
		console.error('Critical error in solved problems page load:', err);
		throw error(500, 'Failed to load solved problems');
	}
};
