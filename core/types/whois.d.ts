declare module 'whois' {
    export interface LookupOptions {
        server?: string;
        follow?: number;
        timeout?: number;
        [key: string]: any;
    }

    export function lookup(
        address: string,
        callback: (err: Error | null, data: string) => void
    ): void;

    export function lookup(
        address: string,
        options: LookupOptions,
        callback: (err: Error | null, data: string) => void
    ): void;
}
