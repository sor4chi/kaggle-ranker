export interface KaggleCompetition {
	id: string;
	title: string;
	url: string;
	deadline: string;
	category: string;
	reward: string;
	teamCount: number;
	userHasEntered: boolean;
}

export interface KaggleLeaderboardEntry {
	teamId: number;
	teamName: string;
	submissionDate: string;
	score: string;
	rank?: number;
}

export interface KaggleLeaderboardResponse {
	submissions: KaggleLeaderboardEntry[];
}

export interface BotConfig {
	targetUserIds: string[];
	kaggleUsername: string;
	kaggleKey: string;
	notifierType?: 'slack' | 'discord';
	slackWebhookUrl?: string;
	discordWebhookUrl?: string;
}

export interface UserRanking {
	userId: string;
	teamName: string;
	rank: number;
	score: string;
	competitionTitle: string;
	competitionId: string;
	competitionDeadline: string;
}
