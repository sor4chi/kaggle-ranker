import { describe, it, expect } from 'vitest';
import { CsvUtils } from './csv-utils';

describe('CsvUtils', () => {
	describe('parseCsvLine', () => {
		it('should parse simple CSV line', () => {
			const line = 'value1,value2,value3';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value1', 'value2', 'value3']);
		});

		it('should handle quoted fields', () => {
			const line = '"value1","value2","value3"';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value1', 'value2', 'value3']);
		});

		it('should handle commas inside quoted fields', () => {
			const line = '"value, with comma","normal value","another, comma"';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value, with comma', 'normal value', 'another, comma']);
		});

		it('should handle escaped quotes inside quoted fields', () => {
			const line = '"value with ""quotes""","normal value"';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value with "quotes"', 'normal value']);
		});

		it('should handle mixed quoted and unquoted fields', () => {
			const line = 'simple,"with comma, here",another';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['simple', 'with comma, here', 'another']);
		});

		it('should trim whitespace from unquoted fields', () => {
			const line = ' value1 , value2 , value3 ';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value1', 'value2', 'value3']);
		});

		it('should handle empty fields', () => {
			const line = 'value1,,value3';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['value1', '', 'value3']);
		});

		it('should handle Kaggle leaderboard format', () => {
			const line = '1,123,"Team Name",2025-01-01,0.95,5,"user1,user2"';
			const result = CsvUtils.parseCsvLine(line);
			expect(result).toEqual(['1', '123', 'Team Name', '2025-01-01', '0.95', '5', 'user1,user2']);
		});
	});

	describe('findColumnIndex', () => {
		it('should find column index case-insensitively', () => {
			const header = ['Rank', 'TeamName', 'Score'];
			expect(CsvUtils.findColumnIndex(header, 'rank')).toBe(0);
			expect(CsvUtils.findColumnIndex(header, 'TEAMNAME')).toBe(1);
			expect(CsvUtils.findColumnIndex(header, 'ScOrE')).toBe(2);
		});

		it('should return -1 for non-existent columns', () => {
			const header = ['Rank', 'TeamName', 'Score'];
			expect(CsvUtils.findColumnIndex(header, 'NotFound')).toBe(-1);
		});

		it('should handle Kaggle leaderboard header', () => {
			const header = [
				'Rank',
				'TeamId',
				'TeamName',
				'LastSubmissionDate',
				'Score',
				'SubmissionCount',
				'TeamMemberUserNames',
			];
			expect(CsvUtils.findColumnIndex(header, 'rank')).toBe(0);
			expect(CsvUtils.findColumnIndex(header, 'teamname')).toBe(2);
			expect(CsvUtils.findColumnIndex(header, 'teammemberusernames')).toBe(6);
		});
	});

	describe('parseCsv', () => {
		it('should parse multi-line CSV', () => {
			const csv = `Rank,TeamName,Score
1,"Team A",0.95
2,"Team B",0.90
3,"Team C",0.85`;
			const result = CsvUtils.parseCsv(csv);
			expect(result).toEqual([
				['Rank', 'TeamName', 'Score'],
				['1', 'Team A', '0.95'],
				['2', 'Team B', '0.90'],
				['3', 'Team C', '0.85'],
			]);
		});

		it('should filter out empty lines', () => {
			const csv = `Rank,Score

1,0.95

2,0.90
`;
			const result = CsvUtils.parseCsv(csv);
			expect(result).toEqual([
				['Rank', 'Score'],
				['1', '0.95'],
				['2', '0.90'],
			]);
		});

		it('should handle CSV with quoted fields containing newlines', () => {
			const csv = `Name,Value
"Simple",100
"Has,Comma",200`;
			const result = CsvUtils.parseCsv(csv);
			expect(result).toEqual([
				['Name', 'Value'],
				['Simple', '100'],
				['Has,Comma', '200'],
			]);
		});
	});
});
