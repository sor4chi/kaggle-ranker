import { describe, it, expect, vi } from 'vitest';
import { KaggleRanker } from './ranker';
import type { KaggleClient } from './client';
import type { KaggleCompetition } from './types';
import type { Logger } from '../logger';

function mockLogger(): Logger {
	return { info: vi.fn(), error: vi.fn() };
}

function makeCompetition(overrides?: Partial<KaggleCompetition>): KaggleCompetition {
	return {
		id: 'comp1',
		title: 'Test Competition',
		url: '/competitions/comp1',
		deadline: '2025-12-31',
		category: 'Featured',
		reward: '$10,000',
		teamCount: 100,
		userHasEntered: false,
		...overrides,
	};
}

function makeCsv(rows: string[][]): string {
	return ['Rank,TeamId,TeamName,LastSubmissionDate,Score,SubmissionCount,TeamMemberUserNames', ...rows.map((r) => r.join(','))].join(
		'\n'
	);
}

function mockClient(
	competitions: KaggleCompetition[],
	leaderboards: Record<string, string>
): KaggleClient {
	return {
		getActiveCompetitions: vi.fn().mockResolvedValue(competitions),
		downloadLeaderboard: vi.fn().mockImplementation((id: string) => {
			if (leaderboards[id]) return Promise.resolve(leaderboards[id]);
			return Promise.reject(new Error(`No leaderboard for ${id}`));
		}),
	} as unknown as KaggleClient;
}

describe('KaggleRanker', () => {
	it('should find target users in leaderboard', async () => {
		const csv = makeCsv([
			['1', '100', 'Team Alpha', '2025-01-01', '0.95', '5', 'alice'],
			['2', '101', 'Team Beta', '2025-01-01', '0.90', '3', 'bob'],
			['3', '102', 'Team Gamma', '2025-01-01', '0.85', '2', 'charlie'],
		]);

		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice', 'charlie']);

		expect(rankings).toHaveLength(2);
		expect(rankings[0]).toMatchObject({ userId: 'alice', rank: 1, teamName: 'Team Alpha', score: '0.95' });
		expect(rankings[1]).toMatchObject({ userId: 'charlie', rank: 3, teamName: 'Team Gamma', score: '0.85' });
	});

	it('should match users case-insensitively', async () => {
		const csv = makeCsv([['1', '100', 'Team A', '2025-01-01', '0.95', '5', 'Alice']]);

		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['ALICE']);

		expect(rankings).toHaveLength(1);
		expect(rankings[0].userId).toBe('ALICE');
	});

	it('should handle multiple team members', async () => {
		const csv = makeCsv([['1', '100', 'Dream Team', '2025-01-01', '0.99', '10', '"alice, bob, charlie"']]);

		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['bob']);

		expect(rankings).toHaveLength(1);
		expect(rankings[0]).toMatchObject({ userId: 'bob', rank: 1, teamName: 'Dream Team' });
	});

	it('should return empty when no target users found', async () => {
		const csv = makeCsv([['1', '100', 'Team A', '2025-01-01', '0.95', '5', 'stranger']]);

		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(0);
	});

	it('should search across multiple competitions', async () => {
		const csv1 = makeCsv([['1', '100', 'Team A', '2025-01-01', '0.95', '5', 'alice']]);
		const csv2 = makeCsv([['3', '200', 'Team B', '2025-01-01', '0.80', '2', 'alice']]);

		const competitions = [makeCompetition({ id: 'comp1', title: 'Comp 1' }), makeCompetition({ id: 'comp2', title: 'Comp 2' })];
		const client = mockClient(competitions, { comp1: csv1, comp2: csv2 });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(2);
		expect(rankings[0]).toMatchObject({ competitionId: 'comp1', rank: 1 });
		expect(rankings[1]).toMatchObject({ competitionId: 'comp2', rank: 3 });
	});

	it('should continue when one competition leaderboard fails', async () => {
		const csv = makeCsv([['1', '100', 'Team A', '2025-01-01', '0.95', '5', 'alice']]);
		const competitions = [makeCompetition({ id: 'comp1' }), makeCompetition({ id: 'comp-broken' })];
		const client = mockClient(competitions, { comp1: csv });
		const logger = mockLogger();
		const ranker = new KaggleRanker(client, logger);

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(1);
		expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('comp-broken'), expect.any(Error));
	});

	it('should return empty for no active competitions', async () => {
		const client = mockClient([], {});
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(0);
	});

	it('should return empty for csv with only headers', async () => {
		const csv = 'Rank,TeamId,TeamName,LastSubmissionDate,Score,SubmissionCount,TeamMemberUserNames';
		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(0);
	});

	it('should skip rows without team members', async () => {
		const csv = makeCsv([
			['1', '100', 'Team A', '2025-01-01', '0.95', '5', ''],
			['2', '101', 'Team B', '2025-01-01', '0.90', '3', 'alice'],
		]);

		const client = mockClient([makeCompetition()], { comp1: csv });
		const ranker = new KaggleRanker(client, mockLogger());

		const rankings = await ranker.findUserRankings(['alice']);

		expect(rankings).toHaveLength(1);
		expect(rankings[0].rank).toBe(2);
	});
});
