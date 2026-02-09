import type { KaggleCompetition } from './types';
import { unzipSync } from 'fflate';

export class KaggleClient {
	private readonly baseUrl = 'https://www.kaggle.com/api/v1';
	private readonly authHeader: string;

	constructor(apiToken: string) {
		this.authHeader = `Bearer ${apiToken}`;
	}

	async getActiveCompetitions(): Promise<KaggleCompetition[]> {
		const response = await fetch(`${this.baseUrl}/competitions/list`, {
			headers: {
				Authorization: this.authHeader,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch competitions: ${response.status} ${response.statusText}`);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const competitions: any[] = await response.json();

		const now = new Date();

		const filtered = competitions
			.filter((comp) => {
				if (!comp.deadline) return false;

				const deadline = new Date(comp.deadline);
				if (deadline < now) return false;

				const category = comp.category || comp.categoryNullable || '';

				if (category === 'Getting Started' || category === 'Playground') {
					return false;
				}

				return true;
			})
			.map((comp) => {
				const urlParts = comp.url?.split('/') || [];
				const competitionRef = urlParts[urlParts.length - 1] || String(comp.id);

				return {
					id: competitionRef,
					title: comp.title || comp.titleNullable || '',
					url: comp.url || comp.urlNullable || '',
					deadline: comp.deadline || '',
					category: comp.category || comp.categoryNullable || '',
					reward: comp.reward || comp.rewardNullable || '',
					teamCount: comp.teamCount || 0,
					userHasEntered: comp.userHasEntered || false,
				};
			});

		console.log(`Filtered ${filtered.length} active competitions from ${competitions.length} total`);
		if (filtered.length > 0) {
			console.log(
				'Active competitions:',
				filtered.map((c) => `${c.title} (${c.category}, ${c.reward})`)
			);
		}

		return filtered;
	}

	async downloadLeaderboard(competitionId: string): Promise<string> {
		console.log(`Downloading complete leaderboard for ${competitionId}...`);

		const response = await fetch(`${this.baseUrl}/competitions/${competitionId}/leaderboard/download`, {
			headers: {
				Authorization: this.authHeader,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to download leaderboard for ${competitionId}: ${response.status} ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		try {
			const unzipped = unzipSync(uint8Array);
			const csvFileName = Object.keys(unzipped).find((name) => name.endsWith('.csv'));

			if (!csvFileName) {
				throw new Error(`No CSV file found in ZIP archive for ${competitionId}`);
			}

			console.log(`Extracted ${csvFileName} from ZIP archive`);

			const csvData = new TextDecoder().decode(unzipped[csvFileName]);
			console.log(`Successfully downloaded ${csvData.split('\n').length - 1} rows for ${competitionId}`);

			return csvData;
		} catch (error) {
			console.error(`Failed to unzip leaderboard for ${competitionId}:`, error);
			throw new Error(
				`Failed to extract leaderboard CSV from ZIP: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
