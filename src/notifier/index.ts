import type { UserRanking } from '../kaggle/types';
import type { Logger } from '../logger';
import { SlackNotifier } from './slack';
import { DiscordNotifier } from './discord';

export interface Notifier {
	sendRankings(rankings: UserRanking[]): Promise<void>;
	sendError(error: string): Promise<void>;
}

export class Notificator {
	private constructor(
		private readonly notifiers: Notifier[],
		private readonly logger: Logger
	) {}

	static of(notifiers: Notifier[], logger: Logger): Notificator {
		return new Notificator(notifiers, logger);
	}

	static create(
		env: Partial<Pick<Env, 'SLACK_WEBHOOK_URL' | 'DISCORD_WEBHOOK_URL'>>,
		logger: Logger
	): Notificator {
		const notifiers: Notifier[] = [];

		if (env.SLACK_WEBHOOK_URL) {
			notifiers.push(new SlackNotifier(env.SLACK_WEBHOOK_URL));
		}
		if (env.DISCORD_WEBHOOK_URL) {
			notifiers.push(new DiscordNotifier(env.DISCORD_WEBHOOK_URL));
		}

		if (notifiers.length === 0) {
			throw new Error('No valid notifier configuration found. Please set SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL');
		}

		return new Notificator(notifiers, logger);
	}

	get count(): number {
		return this.notifiers.length;
	}

	async sendRankings(rankings: UserRanking[]): Promise<void> {
		const results = await Promise.allSettled(
			this.notifiers.map((n) => n.sendRankings(rankings))
		);

		const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
		for (const e of errors) {
			this.logger.error('Notifier failed:', e.reason);
		}

		if (errors.length === results.length) {
			throw new Error('All notifiers failed to send rankings');
		}
	}

	async sendError(error: unknown): Promise<void> {
		const message = error instanceof Error ? error.message : String(error);
		await Promise.allSettled(this.notifiers.map((n) => n.sendError(message)));
	}
}
