import { Notifier } from './notifier';
import { SlackNotifier } from './notifiers/slack-notifier';
import { DiscordNotifier } from './notifiers/discord-notifier';

export enum NotifierType {
	SLACK = 'slack',
	DISCORD = 'discord',
}

export class NotifierFactory {
	static create(type: NotifierType, webhookUrl: string): Notifier {
		switch (type) {
			case NotifierType.SLACK:
				return new SlackNotifier(webhookUrl);
			case NotifierType.DISCORD:
				return new DiscordNotifier(webhookUrl);
			default:
				throw new Error(`Unsupported notifier type: ${type}`);
		}
	}

	static createFromEnv(env: {
		NOTIFIER_TYPE?: string;
		SLACK_WEBHOOK_URL?: string;
		DISCORD_WEBHOOK_URL?: string;
	}): Notifier[] {
		const notifiers: Notifier[] = [];

		if (env.NOTIFIER_TYPE) {
			const type = env.NOTIFIER_TYPE.toLowerCase() as NotifierType;

			if (type === NotifierType.SLACK && env.SLACK_WEBHOOK_URL) {
				notifiers.push(this.create(NotifierType.SLACK, env.SLACK_WEBHOOK_URL));
			} else if (type === NotifierType.DISCORD && env.DISCORD_WEBHOOK_URL) {
				notifiers.push(this.create(NotifierType.DISCORD, env.DISCORD_WEBHOOK_URL));
			}
		} else {
			if (env.SLACK_WEBHOOK_URL) {
				notifiers.push(this.create(NotifierType.SLACK, env.SLACK_WEBHOOK_URL));
			}
			if (env.DISCORD_WEBHOOK_URL) {
				notifiers.push(this.create(NotifierType.DISCORD, env.DISCORD_WEBHOOK_URL));
			}
		}

		if (notifiers.length === 0) {
			throw new Error('No valid notifier configuration found. Please set SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL');
		}

		return notifiers;
	}
}
