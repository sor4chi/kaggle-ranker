import { CompositeLogger, consoleHandler } from './logger';
import { KaggleClient, KaggleRanker } from './kaggle';
import { Notificator } from './notifier';
import { createConfigProvider } from './config';

export async function run(env: Env): Promise<void> {
	const logger = new CompositeLogger().addHandler(consoleHandler);

	if (!env.KAGGLE_API_TOKEN) {
		throw new Error('KAGGLE_API_TOKEN environment variable is required');
	}

	const notificator = Notificator.create(env, logger);
	logger.info(`Initialized ${notificator.count} notifier(s)`);

	try {
		const config = await createConfigProvider(env, logger).resolve();
		logger.info(`Tracking ${config.targetUserIds.length} users: ${config.targetUserIds.join(', ')}`);

		const client = new KaggleClient(env.KAGGLE_API_TOKEN, logger);
		const ranker = new KaggleRanker(client, logger);

		logger.info('Fetching user rankings...');
		const rankings = await ranker.findUserRankings(config.targetUserIds);
		logger.info(`Found ${rankings.length} rankings`);

		await notificator.sendRankings(rankings);
		logger.info('All notifications sent successfully');
	} catch (error) {
		logger.error('Error in run:', error);
		await notificator.sendError(error);
		throw error;
	}
}
