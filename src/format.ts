import type { UserRanking } from './kaggle/types';

export function groupByCompetition(rankings: UserRanking[]): Map<string, UserRanking[]> {
	const groups = new Map<string, UserRanking[]>();

	for (const ranking of rankings) {
		const key = ranking.competitionId;
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(ranking);
	}

	for (const [, compRankings] of groups) {
		compRankings.sort((a, b) => a.rank - b.rank);
	}

	return groups;
}

export function formatTimestamp(date: Date = new Date()): string {
	return date.toISOString();
}

export function formatTimeRemaining(deadline: string): string {
	const now = new Date();
	const deadlineDate = new Date(deadline);
	const diffMs = deadlineDate.getTime() - now.getTime();

	if (diffMs < 0) return 'ended';

	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} left`;
	} else if (diffDays < 30) {
		return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`;
	} else {
		const diffMonths = Math.floor(diffDays / 30);
		return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} left`;
	}
}

export function getRankSuffix(rank: number): string {
	const lastDigit = rank % 10;
	const lastTwoDigits = rank % 100;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';

	switch (lastDigit) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
}
