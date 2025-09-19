// src/lib/db.ts
import { connect, type Connection as PSConnection } from "@planetscale/database";
import { DBClient, type ParsedDbUrl } from "./types";

/** Implémentation PlanetScale (HTTPS + fetch) */
export class PlanetScaleClient implements DBClient {
    private conn: PSConnection;

    constructor(urlConf: ParsedDbUrl | null) {
        const host = urlConf?.host || process.env.DB_HOST || "aws.connect.psdb.cloud";
        const username = urlConf?.user || process.env.DB_USER || "";
        const password = urlConf?.password || process.env.DB_PASSWORD || "";
        const database = urlConf?.database || process.env.DB_NAME || "";

        if (!username) throw new Error("DB user manquant pour PlanetScale");
        if (!password) throw new Error("DB password manquant pour PlanetScale");
        if (!database) throw new Error("DB name manquant pour PlanetScale");

        // @planetscale/database utilise l'attribut 'username'
        this.conn = connect({ host, username, password });
        // NB: pour PS, le 'database' se passe dans la requête (USE) ou on prefixe les tables complètement qualifiées
        // Ici on fera un 'USE' implicite par requête si nécessaire, sinon mettez le nom du schéma dans vos queries si multi-schema.
    }

    async execute<T = any[]>(sql: string, params: any[] = []): Promise<T> {
        // @planetscale/database accepte les placeholders '?'
        const { rows } = await this.conn.execute(sql, params);
        // rows est un tableau d'objets simple
        return rows as T;
    }

    async close() {
        // rien à fermer côté PS client HTTP
    }
}
