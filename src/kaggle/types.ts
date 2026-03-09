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

export interface UserRanking {
	userId: string;
	teamName: string;
	rank: number;
	score: string;
	competitionTitle: string;
	competitionId: string;
	competitionDeadline: string;
}
