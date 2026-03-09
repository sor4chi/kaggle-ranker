import { describe, it, expect } from 'vitest';
import { parseCsvLine, findColumnIndex, parseCsv } from './csv';

describe('parseCsvLine', () => {
	it('should parse simple CSV line', () => {
		expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
	});

	it('should handle quoted fields', () => {
		expect(parseCsvLine('"hello","world"')).toEqual(['hello', 'world']);
	});

	it('should handle commas inside quotes', () => {
		expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
	});

	it('should handle escaped quotes', () => {
		expect(parseCsvLine('"a""b",c')).toEqual(['a"b', 'c']);
	});

	it('should trim whitespace', () => {
		expect(parseCsvLine(' a , b , c ')).toEqual(['a', 'b', 'c']);
	});

	it('should handle empty fields', () => {
		expect(parseCsvLine('a,,c')).toEqual(['a', '', 'c']);
	});

	it('should handle single field', () => {
		expect(parseCsvLine('hello')).toEqual(['hello']);
	});

	it('should handle empty string', () => {
		expect(parseCsvLine('')).toEqual(['']);
	});

	it('should handle complex Kaggle leaderboard format', () => {
		const line = '1,12345,"Team Name",2025-01-01,0.95,5,"user1, user2, user3"';
		const result = parseCsvLine(line);
		expect(result[0]).toBe('1');
		expect(result[2]).toBe('Team Name');
		expect(result[6]).toBe('user1, user2, user3');
	});

	it('should handle mixed quoted and unquoted fields', () => {
		expect(parseCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
	});
});

describe('findColumnIndex', () => {
	it('should find column index case-insensitively', () => {
		const header = ['Rank', 'TeamName', 'Score'];
		expect(findColumnIndex(header, 'rank')).toBe(0);
		expect(findColumnIndex(header, 'teamname')).toBe(1);
		expect(findColumnIndex(header, 'SCORE')).toBe(2);
	});

	it('should return -1 for missing columns', () => {
		expect(findColumnIndex(['a', 'b'], 'c')).toBe(-1);
	});
});

describe('parseCsv', () => {
	it('should parse multi-line CSV', () => {
		const csv = 'a,b,c\n1,2,3\n4,5,6';
		const result = parseCsv(csv);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual(['a', 'b', 'c']);
		expect(result[1]).toEqual(['1', '2', '3']);
	});

	it('should skip empty lines', () => {
		const csv = 'a,b\n\n1,2\n';
		const result = parseCsv(csv);
		expect(result).toHaveLength(2);
	});
});
