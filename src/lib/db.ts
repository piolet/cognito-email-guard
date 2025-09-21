import type { DBClient } from "./types";
import { createDbClient } from "./functions";

/** Singleton lazy */
let _client: DBClient | null = null;
function getClient(): DBClient {
    if (!_client) _client = createDbClient();
    return _client;
}

/** Helpers de haut niveau */
export async function dbExecute<T = any[]>(sql: string, params?: any[]): Promise<T> {
    return getClient().execute<T>(sql, params);
}

export async function dbClose(): Promise<void> {
    if (!_client) return

    await _client.close();
    _client = null;
}

/** Votre fonction métier */
export async function emailExists(normalEmail: string): Promise<boolean> {
    // Remarque PlanetScale: pensez à faire `USE <db>` si besoin (ou préfixer le schéma)
    const rows = await dbExecute<{ usr_id: number }[]>(
        `SELECT usr_id FROM heustach.usr_user WHERE usr_email_normal = concat_ws('@', substring_index(substring_index(?, '@', 1), '+', 1), substring_index(?, '@', -1)) LIMIT 1`,
        [normalEmail, normalEmail]
    );
    return rows.length > 0;
}
