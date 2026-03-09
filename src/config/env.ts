import type { AppConfig, ConfigProvider } from './index';

export class EnvProvider implements ConfigProvider {
	constructor(private readonly env: { TARGET_USER_IDS?: string }) {}

	async resolve(): Promise<AppConfig> {
		if (!this.env.TARGET_USER_IDS) {
			throw new Error('TARGET_USER_IDS environment variable is required');
		}

		const targetUserIds = this.env.TARGET_USER_IDS.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);

		if (targetUserIds.length === 0) {
			throw new Error('TARGET_USER_IDS must contain at least one user ID');
		}

		return { targetUserIds };
	}
}
