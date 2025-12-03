/**
 * @fileoverview Track configuration and metadata
 * Defines all learning tracks in the platform
 */

/**
 * Track metadata and visual properties
 * @typedef {Object} TrackInfo
 * @property {string} color - Tailwind color name (e.g., 'blue', 'green')
 * @property {string} description - Short description of the track
 * @property {boolean} comingSoon - Whether the track is coming soon
 */

/**
 * All available tracks with their metadata
 * @type {Object.<string, TrackInfo>}
 */
export const TRACK_INFO = {
	'building-blocks': {
		color: 'blue',
		description: 'Master DSA fundamentals and essential building blocks',
		comingSoon: false
	},
	'deep-dive': {
		color: 'purple',
		description: 'Advanced algorithms and complex problem-solving patterns',
		comingSoon: false
	},
	'dsa-bootcamp': {
		color: 'orange',
		description: 'Complete 9-day DSA bootcamp with structured daily learning',
		comingSoon: false
	},
	'interview-essentials': {
		color: 'green',
		description: 'Essential patterns and questions for technical interviews',
		comingSoon: true
	}
};

/**
 * List of all track names in display order
 * @type {string[]}
 */
export const TRACK_NAMES = Object.keys(TRACK_INFO);

/**
 * Get track info by name
 * @param {string} trackName - Track name
 * @returns {TrackInfo|null} Track info or null if not found
 */
export function getTrackInfo(trackName) {
	return TRACK_INFO[trackName] || null;
}
