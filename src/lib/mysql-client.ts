// src/lib/db.ts
import type { RowDataPacket } from "mysql2/promise";
import { createPool, Pool } from "mysql2/promise";
import { DBClient, type ParsedDbUrl } from "./types";
import { isPlanetScaleHost } from "./functions";

/** Implémentation mysql2 (local/On-prem) */
export class Mysql2Client implements DBClient {
    private pool: Pool;

    constructor(urlConf: ParsedDbUrl | null) {
        // On permet aussi le fallback via variables simples si pas de DATABASE_URL
        const host = urlConf?.host || process.env.DB_HOST || "127.0.0.1";
        const user = urlConf?.user || process.env.DB_USER || "";
        const password = urlConf?.password || process.env.DB_PASSWORD || "";
        const database = urlConf?.database || process.env.DB_NAME || "";
        const port = urlConf?.port || Number(process.env.DB_PORT || 3306);

        // TLS seulement si PlanetScale (utile si certains devs pointent directement PS depuis local)
        const useTls = isPlanetScaleHost(host);

        // Sanity check
        if (!user) throw new Error("DB user manquant (DB_USER ou dans DATABASE_URL)");
        if (!database) throw new Error("DB name manquant (DB_NAME ou dans DATABASE_URL)");

        this.pool = createPool({
            host,
            user,
            password,
            database,
            port,
            connectionLimit: 4,
            waitForConnections: true,
            queueLimit: 0,
            ...(useTls ? { ssl: { rejectUnauthorized: true } } : {}),
        });
    }

    async execute<T = RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
        const [rows] = await this.pool.execute(sql, params);
        return rows as T;
    }

    async close() {
        await this.pool.end();
    }
}
