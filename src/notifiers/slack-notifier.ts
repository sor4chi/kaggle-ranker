import type { UserRanking } from '../types';
import { Notifier, NotifierUtils } from '../notifier';

export class SlackNotifier implements Notifier {
	constructor(private webhookUrl: string) {}

	async sendRankings(rankings: UserRanking[]): Promise<void> {
		if (rankings.length === 0) {
			await this.sendMessage({
				text: 'No rankings found for tracked users in active competitions.',
			});
			return;
		}

		const message = this.formatRankingsMessage(rankings);
		await this.sendMessage({ text: message });
	}

	async sendError(error: string): Promise<void> {
		await this.sendMessage({
			text: `❌ Error in Kaggle Ranker: ${error}`,
		});
	}

	private formatRankingsMessage(rankings: UserRanking[]): string {
		const competitionGroups = NotifierUtils.groupByCompetition(rankings);
		const lines: string[] = [];

		for (const [_competitionId, compRankings] of competitionGroups) {
			const competitionTitle = compRankings[0].competitionTitle;
			const deadline = compRankings[0].competitionDeadline;
			const timeRemaining = NotifierUtils.formatTimeRemaining(deadline);

			lines.push(`*${competitionTitle}* - (${timeRemaining})`);

			const rankGroups = new Map<number, string[]>();
			for (const ranking of compRankings) {
				if (!rankGroups.has(ranking.rank)) {
					rankGroups.set(ranking.rank, []);
				}
				rankGroups.get(ranking.rank)!.push(ranking.userId);
			}

			for (const [rank, userIds] of rankGroups) {
				const rankSuffix = this.getRankSuffix(rank);
				lines.push(`${rank}${rankSuffix}: ${userIds.join(', ')}`);
			}

			lines.push('');
		}

		return lines.join('\n');
	}

	private getRankSuffix(rank: number): string {
		const lastDigit = rank % 10;
		const lastTwoDigits = rank % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
			return 'th';
		}

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async sendMessage(payload: any): Promise<void> {
		const response = await fetch(this.webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Failed to send Slack message: ${response.status} ${response.statusText}`);
		}
	}
}
