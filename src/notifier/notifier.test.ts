import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { groupByCompetition, formatTimeRemaining, formatTimestamp } from '../format';
import { Notificator, Notifier } from './index';
import type { UserRanking } from '../kaggle/types';
import type { Logger } from '../logger';

function mockLogger(): Logger {
	return { info: vi.fn(), error: vi.fn() };
}

function mockNotifier(overrides?: Partial<Notifier>): Notifier {
	return {
		sendRankings: vi.fn().mockResolvedValue(undefined),
		sendError: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe('groupByCompetition', () => {
	it('should group rankings by competition', () => {
		const rankings: UserRanking[] = [
			{
				userId: 'user1',
				teamName: 'Team A',
				rank: 1,
				score: '0.95',
				competitionTitle: 'Competition 1',
				competitionId: 'comp1',
				competitionDeadline: '2025-12-31',
			},
			{
				userId: 'user2',
				teamName: 'Team B',
				rank: 2,
				score: '0.90',
				competitionTitle: 'Competition 1',
				competitionId: 'comp1',
				competitionDeadline: '2025-12-31',
			},
			{
				userId: 'user3',
				teamName: 'Team C',
				rank: 5,
				score: '0.85',
				competitionTitle: 'Competition 2',
				competitionId: 'comp2',
				competitionDeadline: '2025-11-30',
			},
		];

		const groups = groupByCompetition(rankings);

		expect(groups.size).toBe(2);
		expect(groups.get('comp1')).toHaveLength(2);
		expect(groups.get('comp2')).toHaveLength(1);
	});

	it('should sort rankings by rank within each competition', () => {
		const rankings: UserRanking[] = [
			{
				userId: 'user1',
				teamName: 'Team A',
				rank: 3,
				score: '0.90',
				competitionTitle: 'Competition 1',
				competitionId: 'comp1',
				competitionDeadline: '2025-12-31',
			},
			{
				userId: 'user2',
				teamName: 'Team B',
				rank: 1,
				score: '0.95',
				competitionTitle: 'Competition 1',
				competitionId: 'comp1',
				competitionDeadline: '2025-12-31',
			},
			{
				userId: 'user3',
				teamName: 'Team C',
				rank: 2,
				score: '0.92',
				competitionTitle: 'Competition 1',
				competitionId: 'comp1',
				competitionDeadline: '2025-12-31',
			},
		];

		const groups = groupByCompetition(rankings);
		const comp1Rankings = groups.get('comp1')!;

		expect(comp1Rankings[0].rank).toBe(1);
		expect(comp1Rankings[1].rank).toBe(2);
		expect(comp1Rankings[2].rank).toBe(3);
	});
});

describe('formatTimeRemaining', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return "ended" for past deadlines', () => {
		expect(formatTimeRemaining('2024-12-31T00:00:00Z')).toBe('ended');
	});

	it('should return hours for deadlines within 24 hours', () => {
		expect(formatTimeRemaining('2025-01-01T12:00:00Z')).toBe('12 hours left');
	});

	it('should return hour (singular) for 1 hour', () => {
		expect(formatTimeRemaining('2025-01-01T01:00:00Z')).toBe('1 hour left');
	});

	it('should return days for deadlines within 30 days', () => {
		expect(formatTimeRemaining('2025-01-15T00:00:00Z')).toBe('14 days left');
	});

	it('should return day (singular) for 1 day', () => {
		expect(formatTimeRemaining('2025-01-02T12:00:00Z')).toBe('1 day left');
	});

	it('should return months for deadlines beyond 30 days', () => {
		expect(formatTimeRemaining('2025-03-15T00:00:00Z')).toBe('2 months left');
	});

	it('should return month (singular) for ~1 month', () => {
		expect(formatTimeRemaining('2025-02-05T00:00:00Z')).toBe('1 month left');
	});
});

describe('formatTimestamp', () => {
	it('should return ISO string for given date', () => {
		const date = new Date('2025-01-01T12:00:00Z');
		expect(formatTimestamp(date)).toBe('2025-01-01T12:00:00.000Z');
	});

	it('should return current time ISO string when no date provided', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

		expect(formatTimestamp()).toBe('2025-01-01T00:00:00.000Z');

		vi.useRealTimers();
	});
});

describe('Notificator', () => {
	it('should create from env with slack webhook', () => {
		const notificator = Notificator.create(
			{ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test' },
			mockLogger()
		);
		expect(notificator.count).toBe(1);
	});

	it('should create from env with discord webhook', () => {
		const notificator = Notificator.create(
			{ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
			mockLogger()
		);
		expect(notificator.count).toBe(1);
	});

	it('should create both notifiers when both webhooks are set', () => {
		const notificator = Notificator.create(
			{
				SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
				DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
			},
			mockLogger()
		);
		expect(notificator.count).toBe(2);
	});

	it('should throw when no webhooks are set', () => {
		expect(() => Notificator.create({}, mockLogger())).toThrow('No valid notifier configuration found');
	});

	it('sendRankings should call all notifiers', async () => {
		const n1 = mockNotifier();
		const n2 = mockNotifier();
		const notificator = Notificator.of([n1, n2], mockLogger());
		const rankings: UserRanking[] = [];

		await notificator.sendRankings(rankings);

		expect(n1.sendRankings).toHaveBeenCalledWith(rankings);
		expect(n2.sendRankings).toHaveBeenCalledWith(rankings);
	});

	it('sendRankings should not throw on partial failure', async () => {
		const n1 = mockNotifier();
		const n2 = mockNotifier({ sendRankings: vi.fn().mockRejectedValue(new Error('fail')) });
		const notificator = Notificator.of([n1, n2], mockLogger());

		await expect(notificator.sendRankings([])).resolves.toBeUndefined();
	});

	it('sendRankings should throw when all notifiers fail', async () => {
		const n1 = mockNotifier({ sendRankings: vi.fn().mockRejectedValue(new Error('fail1')) });
		const n2 = mockNotifier({ sendRankings: vi.fn().mockRejectedValue(new Error('fail2')) });
		const notificator = Notificator.of([n1, n2], mockLogger());

		await expect(notificator.sendRankings([])).rejects.toThrow('All notifiers failed');
	});

	it('sendError should attempt all notifiers even if some fail', async () => {
		const n1 = mockNotifier({ sendError: vi.fn().mockRejectedValue(new Error('fail')) });
		const n2 = mockNotifier();
		const notificator = Notificator.of([n1, n2], mockLogger());

		await notificator.sendError(new Error('test error'));

		expect(n1.sendError).toHaveBeenCalledWith('test error');
		expect(n2.sendError).toHaveBeenCalledWith('test error');
	});
});
