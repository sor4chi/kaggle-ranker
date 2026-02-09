import { KaggleClient } from './kaggle-client';
import { KaggleRanker } from './ranker';
import { NotifierFactory } from './notifier-factory';

export default {
	async fetch(_req: Request): Promise<Response> {
		return new Response('Hello, world!');
	},

	async scheduled(event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
		console.log(`Kaggle Ranker triggered at ${event.cron}`);

		try {
			if (!env.KAGGLE_API_TOKEN) {
				throw new Error('KAGGLE_API_TOKEN environment variable is required');
			}

			if (!env.TARGET_USER_IDS) {
				throw new Error('TARGET_USER_IDS environment variable is required');
			}

			const notifiers = NotifierFactory.createFromEnv(env);
			console.log(`Initialized ${notifiers.length} notifier(s)`);

			const targetUserIds = env.TARGET_USER_IDS.split(',').map((id) => id.trim());
			console.log(`Tracking ${targetUserIds.length} users: ${targetUserIds.join(', ')}`);

			const kaggleClient = new KaggleClient(env.KAGGLE_API_TOKEN);
			const ranker = new KaggleRanker(kaggleClient);

			console.log('Fetching user rankings...');
			const rankings = await ranker.findUserRankings(targetUserIds);
			console.log(`Found ${rankings.length} rankings`);

			await Promise.all(
				notifiers.map(async (notifier, index) => {
					try {
						await notifier.sendRankings(rankings);
						console.log(`Rankings sent via notifier #${index + 1} successfully`);
					} catch (error) {
						console.error(`Failed to send via notifier #${index + 1}:`, error);
						throw error;
					}
				})
			);

			console.log('All notifications sent successfully');
		} catch (error) {
			console.error('Error in scheduled handler:', error);

			try {
				const notifiers = NotifierFactory.createFromEnv(env);
				await Promise.allSettled(
					notifiers.map((notifier) => notifier.sendError(error instanceof Error ? error.message : String(error)))
				);
			} catch (notifyError) {
				console.error('Failed to send error notification:', notifyError);
			}

			throw error;
		}
	},
} satisfies ExportedHandler<Env>;
