import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST!,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER!,
            password: process.env.DB_PASSWORD!,
            database: process.env.DB_NAME!,
            waitForConnections: true,
            connectionLimit: 4,
            queueLimit: 0,
            ssl: { rejectUnauthorized: true } // PlanetScale: SSL recommandé
        });
    }
    return pool;
}

/** renvoie true si un utilisateur existe déjà pour cet email normalisé */
export async function emailExists(normalEmail: string): Promise<boolean> {
    const pool = getPool();
    // On interroge la colonne virtuale indexée usr_email_normal
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        `SELECT usr_id FROM usr_user WHERE usr_email_normal = ? LIMIT 1`,
        [normalEmail]
    );
    return rows.length > 0;
}
