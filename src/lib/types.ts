export interface DBClient {
    execute<T = any[]>(sql: string, params?: any[]): Promise<T>;
    close(): Promise<void>;
}

export type ParsedDbUrl = {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
};
