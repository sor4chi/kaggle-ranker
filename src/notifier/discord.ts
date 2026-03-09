import { BaseNotifier } from './base';

export class DiscordNotifier extends BaseNotifier {
	protected buildPayload(text: string): Record<string, unknown> {
		return { content: text };
	}

	protected bold(text: string): string {
		return `**${text}**`;
	}
}
