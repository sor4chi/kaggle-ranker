export interface Logger {
	info(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

export class CompositeLogger implements Logger {
	private handlers: Logger[] = [];

	addHandler(handler: Logger): this {
		this.handlers.push(handler);
		return this;
	}

	info(...args: unknown[]): void {
		for (const h of this.handlers) {
			h.info(...args);
		}
	}

	error(...args: unknown[]): void {
		for (const h of this.handlers) {
			h.error(...args);
		}
	}
}

export const consoleHandler: Logger = {
	info: (...args) => console.log('[Kaggle Ranker]', ...args),
	error: (...args) => console.error('[Kaggle Ranker]', ...args),
};
