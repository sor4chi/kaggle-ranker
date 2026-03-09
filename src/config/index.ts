import type { Logger } from '../logger';
import { EnvProvider } from './env';
import { SpreadsheetProvider } from './spreadsheet';

export interface AppConfig {
	targetUserIds: string[];
}

export interface ConfigProvider {
	resolve(): Promise<AppConfig>;
}

export type ConfigProviderType = 'env' | 'spreadsheet';

export function createConfigProvider(
	env: Partial<Pick<Env, 'CONFIG_PROVIDER' | 'TARGET_USER_IDS' | 'GOOGLE_SERVICE_ACCOUNT_KEY' | 'SPREADSHEET_ID' | 'SHEET_NAME'>>,
	logger: Logger
): ConfigProvider {
	const type = (env.CONFIG_PROVIDER ?? 'env') as ConfigProviderType;

	switch (type) {
		case 'env':
			return new EnvProvider(env);

		case 'spreadsheet': {
			if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) {
				throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is required for spreadsheet config provider');
			}
			if (!env.SPREADSHEET_ID) {
				throw new Error('SPREADSHEET_ID is required for spreadsheet config provider');
			}
			return new SpreadsheetProvider({
				serviceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
				spreadsheetId: env.SPREADSHEET_ID,
				sheetName: env.SHEET_NAME,
				logger,
			});
		}

		default:
			throw new Error(`Unknown config provider: ${type}. Supported: env, spreadsheet`);
	}
}
