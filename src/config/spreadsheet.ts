import type { AppConfig, ConfigProvider } from './index';
import type { Logger } from '../logger';

interface SpreadsheetOptions {
	serviceAccountKey: string;
	spreadsheetId: string;
	sheetName?: string;
	logger: Logger;
}

interface GoogleTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

interface ServiceAccountKey {
	client_email: string;
	private_key: string;
}

export class SpreadsheetProvider implements ConfigProvider {
	private readonly serviceAccountKey: ServiceAccountKey;
	private readonly spreadsheetId: string;
	private readonly sheetName: string;
	private readonly logger: Logger;

	constructor(options: SpreadsheetOptions) {
		this.serviceAccountKey = JSON.parse(options.serviceAccountKey) as ServiceAccountKey;
		this.spreadsheetId = options.spreadsheetId;
		this.sheetName = options.sheetName ?? 'Sheet1';
		this.logger = options.logger;
	}

	async resolve(): Promise<AppConfig> {
		const accessToken = await this.getAccessToken();
		const range = `${this.sheetName}!A2:A`;
		const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;

		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google Sheets API error (${response.status}): ${body}`);
		}

		const data = (await response.json()) as { values?: string[][] };
		const targetUserIds = (data.values ?? [])
			.flat()
			.map((id) => id.trim())
			.filter((id) => id.length > 0);

		if (targetUserIds.length === 0) {
			throw new Error(`No user IDs found in spreadsheet (sheet: ${this.sheetName})`);
		}

		this.logger.info(`Loaded ${targetUserIds.length} user IDs from spreadsheet`);
		return { targetUserIds };
	}

	private async getAccessToken(): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const header = { alg: 'RS256', typ: 'JWT' };
		const payload = {
			iss: this.serviceAccountKey.client_email,
			scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600,
		};

		const encodedHeader = base64url(JSON.stringify(header));
		const encodedPayload = base64url(JSON.stringify(payload));
		const unsignedToken = `${encodedHeader}.${encodedPayload}`;

		const signature = await this.sign(unsignedToken, this.serviceAccountKey.private_key);
		const jwt = `${unsignedToken}.${signature}`;

		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: jwt,
			}),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google OAuth error (${response.status}): ${body}`);
		}

		const token = (await response.json()) as GoogleTokenResponse;
		return token.access_token;
	}

	private async sign(input: string, privateKeyPem: string): Promise<string> {
		const keyData = pemToArrayBuffer(privateKeyPem);
		const key = await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
			'sign',
		]);
		const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
		return base64url(signature);
	}
}

function base64url(input: string | ArrayBuffer): string {
	const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
	const b64 = pem.replace(/-----BEGIN [A-Z ]+-----/g, '').replace(/-----END [A-Z ]+-----/g, '').replace(/\s/g, '');
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}
