/**
 * @fileoverview Daily limit utility functions
 * Manages daily submission limits for specific tracks (e.g., DSA Bootcamp: 20/day)
 */

/**
 * Check if user can complete another problem today based on daily limit
 * @param {number} todayCompletions - Number of problems completed today
 * @param {number} dailyLimit - Maximum problems allowed per day
 * @returns {boolean} - True if user can complete another problem
 */
export function canCompleteToday(todayCompletions, dailyLimit) {
	return todayCompletions < dailyLimit;
}

/**
 * Get remaining problems for today
 * @param {number} todayCompletions - Number of problems completed today
 * @param {number} dailyLimit - Maximum problems allowed per day
 * @returns {number} - Number of problems remaining
 */
export function getRemainingProblems(todayCompletions, dailyLimit) {
	return Math.max(0, dailyLimit - todayCompletions);
}

/**
 * Format daily limit message
 * @param {number} remaining - Number of problems remaining
 * @returns {string} - Formatted message
 */
export function formatDailyLimitMessage(remaining) {
	if (remaining === 0) {
		return "You've reached your daily limit! Come back tomorrow for more. 🎯";
	}
	if (remaining === 1) {
		return `${remaining} problem remaining today`;
	}
	return `${remaining} problems remaining today`;
}
