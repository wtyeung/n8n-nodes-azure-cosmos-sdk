// Type declarations for Node.js built-ins
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
