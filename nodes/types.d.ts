// Type declarations for Node.js built-ins and global APIs
declare module 'crypto' {
	export function createHmac(algorithm: string, key: Buffer | string): {
		update(data: string): {
			digest(encoding: string): string;
		};
	};
}

declare const Buffer: {
	from(data: string, encoding: string): Buffer;
};

declare function fetch(
	input: string,
	init?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{
	ok: boolean;
	text: () => Promise<string>;
	json: () => Promise<any>;
}>;

declare function encodeURIComponent(str: string): string;

declare module '@azure/cosmos' {
	export interface TokenCredential {
		getToken(): Promise<{
			token: string;
			expiresOnTimestamp: number;
		}>;
	}

	export class CosmosClient {
		constructor(options: {
			endpoint: string;
			key?: string;
			aadCredentials?: TokenCredential;
		});
		database(id: string): any;
	}
}
