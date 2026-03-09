import { describe, it, expect, vi } from 'vitest';
import { createConfigProvider } from './index';
import { EnvProvider } from './env';
import type { Logger } from '../logger';

function mockLogger(): Logger {
	return { info: vi.fn(), error: vi.fn() };
}

describe('createConfigProvider', () => {
	it('should default to env provider', () => {
		const provider = createConfigProvider({ TARGET_USER_IDS: 'user1' }, mockLogger());
		expect(provider).toBeInstanceOf(EnvProvider);
	});

	it('should create env provider explicitly', () => {
		const provider = createConfigProvider({ CONFIG_PROVIDER: 'env', TARGET_USER_IDS: 'user1' }, mockLogger());
		expect(provider).toBeInstanceOf(EnvProvider);
	});

	it('should throw for spreadsheet provider without credentials', () => {
		expect(() =>
			createConfigProvider({ CONFIG_PROVIDER: 'spreadsheet' }, mockLogger())
		).toThrow('GOOGLE_SERVICE_ACCOUNT_KEY is required');
	});

	it('should throw for spreadsheet provider without spreadsheet id', () => {
		expect(() =>
			createConfigProvider(
				{ CONFIG_PROVIDER: 'spreadsheet', GOOGLE_SERVICE_ACCOUNT_KEY: '{}' },
				mockLogger()
			)
		).toThrow('SPREADSHEET_ID is required');
	});

	it('should throw for unknown provider type', () => {
		expect(() =>
			createConfigProvider({ CONFIG_PROVIDER: 'unknown' }, mockLogger())
		).toThrow('Unknown config provider: unknown');
	});
});

describe('EnvProvider', () => {
	it('should parse comma-separated user IDs', async () => {
		const provider = new EnvProvider({ TARGET_USER_IDS: 'user1, user2, user3' });
		const config = await provider.resolve();
		expect(config.targetUserIds).toEqual(['user1', 'user2', 'user3']);
	});

	it('should filter empty entries', async () => {
		const provider = new EnvProvider({ TARGET_USER_IDS: 'user1,,user2,' });
		const config = await provider.resolve();
		expect(config.targetUserIds).toEqual(['user1', 'user2']);
	});

	it('should throw when TARGET_USER_IDS is missing', async () => {
		const provider = new EnvProvider({});
		await expect(provider.resolve()).rejects.toThrow('TARGET_USER_IDS environment variable is required');
	});

	it('should throw when TARGET_USER_IDS is empty', async () => {
		const provider = new EnvProvider({ TARGET_USER_IDS: '  ,  , ' });
		await expect(provider.resolve()).rejects.toThrow('TARGET_USER_IDS must contain at least one user ID');
	});
});
