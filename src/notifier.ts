import type { UserRanking } from './types';

export interface Notifier {
	sendRankings(rankings: UserRanking[]): Promise<void>;
	sendError(error: string): Promise<void>;
}

export class NotifierUtils {
	static groupByCompetition(rankings: UserRanking[]): Map<string, UserRanking[]> {
		const groups = new Map<string, UserRanking[]>();

		for (const ranking of rankings) {
			const key = ranking.competitionId;
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(ranking);
		}

		for (const [_, compRankings] of groups) {
			compRankings.sort((a, b) => a.rank - b.rank);
		}

		return groups;
	}

	static formatTimestamp(date: Date = new Date()): string {
		return date.toISOString();
	}

	static formatTimeRemaining(deadline: string): string {
		const now = new Date();
		const deadlineDate = new Date(deadline);
		const diffMs = deadlineDate.getTime() - now.getTime();

		if (diffMs < 0) {
			return 'ended';
		}

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
}
