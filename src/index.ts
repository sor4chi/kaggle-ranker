import { run } from './app';

export default {
	async fetch(): Promise<Response> {
		return new Response('Hello, world!');
	},

	async scheduled(_event: ScheduledController, env: Env): Promise<void> {
		await run(env);
	},
} satisfies ExportedHandler<Env>;
