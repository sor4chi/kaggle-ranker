import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotifierUtils } from './notifier';
import type { UserRanking } from './types';

describe('NotifierUtils', () => {
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

			const groups = NotifierUtils.groupByCompetition(rankings);

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

			const groups = NotifierUtils.groupByCompetition(rankings);
			const comp1Rankings = groups.get('comp1')!;

			expect(comp1Rankings[0].rank).toBe(1);
			expect(comp1Rankings[1].rank).toBe(2);
			expect(comp1Rankings[2].rank).toBe(3);
		});
	});

	describe('formatTimeRemaining', () => {
		beforeEach(() => {
			// Mock current time to 2025-01-01 00:00:00
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return "ended" for past deadlines', () => {
			const deadline = '2024-12-31T00:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('ended');
		});

		it('should return hours for deadlines within 24 hours', () => {
			const deadline = '2025-01-01T12:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('12 hours left');
		});

		it('should return hour (singular) for 1 hour', () => {
			const deadline = '2025-01-01T01:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('1 hour left');
		});

		it('should return days for deadlines within 30 days', () => {
			const deadline = '2025-01-15T00:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('14 days left');
		});

		it('should return day (singular) for 1 day', () => {
			const deadline = '2025-01-02T12:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('1 day left');
		});

		it('should return months for deadlines beyond 30 days', () => {
			const deadline = '2025-03-15T00:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('2 months left');
		});

		it('should return month (singular) for ~1 month', () => {
			const deadline = '2025-02-05T00:00:00Z';
			expect(NotifierUtils.formatTimeRemaining(deadline)).toBe('1 month left');
		});
	});

	describe('formatTimestamp', () => {
		it('should return ISO string for given date', () => {
			const date = new Date('2025-01-01T12:00:00Z');
			expect(NotifierUtils.formatTimestamp(date)).toBe('2025-01-01T12:00:00.000Z');
		});

		it('should return current time ISO string when no date provided', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

			expect(NotifierUtils.formatTimestamp()).toBe('2025-01-01T00:00:00.000Z');

			vi.useRealTimers();
		});
	});
});
