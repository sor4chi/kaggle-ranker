import { BaseNotifier } from './base';

export class SlackNotifier extends BaseNotifier {
	protected buildPayload(text: string): Record<string, unknown> {
		return { text };
	}

	protected bold(text: string): string {
		return `*${text}*`;
	}
}
