import { KaggleClient } from './kaggle-client';
import { CsvUtils } from './csv-utils';
import type { UserRanking } from './types';

export class KaggleRanker {
	constructor(private client: KaggleClient) {}

	async findUserRankings(targetUserIds: string[]): Promise<UserRanking[]> {
		const rankings: UserRanking[] = [];

		try {
			const competitions = await this.client.getActiveCompetitions();
			console.log(`Found ${competitions.length} active competitions`);

			for (const competition of competitions) {
				try {
					const leaderboardCsv = await this.client.downloadLeaderboard(competition.id);
					const userRankingsForComp = this.parseLeaderboardCsv(leaderboardCsv, targetUserIds, competition);
					rankings.push(...userRankingsForComp);
				} catch (error) {
					console.error(`Error fetching leaderboard for ${competition.id}:`, error);
				}
			}
		} catch (error) {
			console.error('Error in findUserRankings:', error);
			throw error;
		}

		return rankings;
	}

	private parseLeaderboardCsv(
		csv: string,
		targetUserIds: string[],
		competition: { id: string; title: string; deadline: string }
	): UserRanking[] {
		const rankings: UserRanking[] = [];
		const lines = csv.split('\n').filter((line) => line.trim());

		if (lines.length <= 1) return rankings;

		const header = CsvUtils.parseCsvLine(lines[0]);

		const rankIndex = CsvUtils.findColumnIndex(header, 'rank');
		const teamNameIndex = CsvUtils.findColumnIndex(header, 'teamname');
		const scoreIndex = CsvUtils.findColumnIndex(header, 'score');
		const teamMemberIndex = CsvUtils.findColumnIndex(header, 'teammemberusernames');

		console.log(`CSV columns: ${header.join(', ')}`);
		console.log(
			`Found indices - Rank: ${rankIndex}, TeamName: ${teamNameIndex}, Score: ${scoreIndex}, Members: ${teamMemberIndex}`
		);

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const columns = CsvUtils.parseCsvLine(line);

			const rank = rankIndex >= 0 ? parseInt(columns[rankIndex]) : i;
			const teamName = teamNameIndex >= 0 ? columns[teamNameIndex] : '';
			const score = scoreIndex >= 0 ? columns[scoreIndex] : 'N/A';
			const teamMembers = teamMemberIndex >= 0 ? columns[teamMemberIndex] : '';

			if (!teamMembers) continue;

			const memberUsernames = teamMembers.split(',').map((u) => u.trim().toLowerCase());
			const matchedUserId = targetUserIds.find((userId) => memberUsernames.includes(userId.toLowerCase()));

			if (matchedUserId) {
				console.log(
					`Found target user "${matchedUserId}" in competition ${competition.id}: Rank ${rank}, Team: ${teamName}`
				);

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
