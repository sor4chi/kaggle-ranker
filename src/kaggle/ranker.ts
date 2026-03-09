import type { Logger } from '../logger';
import { KaggleClient } from './client';
import { parseCsvLine, findColumnIndex } from './csv';
import type { UserRanking } from './types';

export class KaggleRanker {
	constructor(
		private readonly client: KaggleClient,
		private readonly logger: Logger
	) {}

	async findUserRankings(targetUserIds: string[]): Promise<UserRanking[]> {
		const rankings: UserRanking[] = [];

		const competitions = await this.client.getActiveCompetitions();
		this.logger.info(`Found ${competitions.length} active competitions`);

		for (const competition of competitions) {
			try {
				const leaderboardCsv = await this.client.downloadLeaderboard(competition.id);
				const matched = this.parseLeaderboard(leaderboardCsv, targetUserIds, competition);
				rankings.push(...matched);
			} catch (error) {
				this.logger.error(`Error fetching leaderboard for ${competition.id}:`, error);
			}
		}

		return rankings;
	}

	private parseLeaderboard(
		csv: string,
		targetUserIds: string[],
		competition: { id: string; title: string; deadline: string }
	): UserRanking[] {
		const rankings: UserRanking[] = [];
		const lines = csv.split('\n').filter((line) => line.trim());

		if (lines.length <= 1) return rankings;

		const header = parseCsvLine(lines[0]);
		const rankIdx = findColumnIndex(header, 'rank');
		const teamNameIdx = findColumnIndex(header, 'teamname');
		const scoreIdx = findColumnIndex(header, 'score');
		const memberIdx = findColumnIndex(header, 'teammemberusernames');

		this.logger.info(`CSV columns: ${header.join(', ')}`);
		this.logger.info(
			`Column indices - Rank: ${rankIdx}, TeamName: ${teamNameIdx}, Score: ${scoreIdx}, Members: ${memberIdx}`
		);

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const columns = parseCsvLine(line);

			const rank = rankIdx >= 0 ? parseInt(columns[rankIdx]) : i;
			const teamName = teamNameIdx >= 0 ? columns[teamNameIdx] : '';
			const score = scoreIdx >= 0 ? columns[scoreIdx] : 'N/A';
			const teamMembers = memberIdx >= 0 ? columns[memberIdx] : '';

			if (!teamMembers) continue;

			const memberUsernames = teamMembers.split(',').map((u) => u.trim().toLowerCase());
			const matchedUserId = targetUserIds.find((userId) => memberUsernames.includes(userId.toLowerCase()));

			if (matchedUserId) {
				this.logger.info(`Found user "${matchedUserId}" in ${competition.id}: Rank ${rank}, Team: ${teamName}`);

				rankings.push({
					userId: matchedUserId,
					teamName,
					rank,
					score,
					competitionTitle: competition.title,
					competitionId: competition.id,
					competitionDeadline: competition.deadline,
				});
			}
		}

		return rankings;
	}
}
