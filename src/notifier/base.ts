import type { UserRanking } from '../kaggle/types';
import type { Notifier } from './index';
import { groupByCompetition, formatTimeRemaining, getRankSuffix } from '../format';

export abstract class BaseNotifier implements Notifier {
	constructor(protected readonly webhookUrl: string) {}

	async sendRankings(rankings: UserRanking[]): Promise<void> {
		if (rankings.length === 0) {
			await this.post(this.buildPayload('No rankings found for tracked users in active competitions.'));
			return;
		}

		const message = this.formatRankingsMessage(rankings);
		await this.post(this.buildPayload(message));
	}

	async sendError(error: string): Promise<void> {
		await this.post(this.buildPayload(`❌ Error in Kaggle Ranker: ${error}`));
	}

	protected abstract buildPayload(text: string): Record<string, unknown>;

	protected abstract bold(text: string): string;

	private formatRankingsMessage(rankings: UserRanking[]): string {
		const groups = groupByCompetition(rankings);
		const lines: string[] = [];

		for (const [, compRankings] of groups) {
			const { competitionTitle, competitionDeadline } = compRankings[0];
			const timeRemaining = formatTimeRemaining(competitionDeadline);

			lines.push(`${this.bold(competitionTitle)} - (${timeRemaining})`);

			const rankGroups = new Map<number, string[]>();
			for (const ranking of compRankings) {
				if (!rankGroups.has(ranking.rank)) {
					rankGroups.set(ranking.rank, []);
				}
				rankGroups.get(ranking.rank)!.push(ranking.userId);
			}

			for (const [rank, userIds] of rankGroups) {
				lines.push(`${rank}${getRankSuffix(rank)}: ${userIds.join(', ')}`);
			}

			lines.push('');
		}

		return lines.join('\n');
	}

	private async post(payload: Record<string, unknown>): Promise<void> {
		const response = await fetch(this.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Webhook request failed (${response.status}): ${body}`);
		}
	}
}
