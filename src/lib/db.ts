import {Pool, RowDataPacket, createPool} from "mysql2/promise";
// import {connect, Connection} from '@planetscale/database';
import { DATABASE_URL } from '../config/';

let conn: Pool | null = null;
// let conn: Connection | null = null;

type Config = {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
}
const initialize: () => Config = () => {
    const config: Config = {
        host: 'aws.connect.psdb.cloud',
        user: '',
        password: '',
        database: '',
        port: 3306
    }
    if (!DATABASE_URL) return config;
    const url = new URL(DATABASE_URL);
    config.host = url.hostname;
    config.user = url.username;
    config.password = url.password;
    config.port = Number(url.port) || 3306;
    const pathname = url.pathname;
    if (pathname && pathname.length > 1) {
        config.database = pathname.slice(1);
    }
    return config;
}

// export async function getPool(): Promise<Connection> {
export function getPool(): Pool {
    if (conn) return conn;

    const config = initialize();
    console.log('DB config:', { ...config });
    // return connect(config)
    return createPool({
        ...config,
        ssl: { rejectUnauthorized: false }, // PlanetScale: SSL recommandé
        connectionLimit: 4,
        waitForConnections: true,
        queueLimit: 0
    })
    //     .then((pool) => {
    //     conn = pool;
    //     return pool;
    // }).catch((err) => {
    //     console.error('Erreur de connexion à la base de données :', err);
    //     throw err;
    // }
    // if (!pool) {
    //     pool = mysql.createPool({
    //         host: process.env.DB_HOST!,
    //         port: Number(process.env.DB_PORT || 3306),
    //         user: process.env.DB_USER!,
    //         password: process.env.DB_PASSWORD!,
    //         database: process.env.DB_NAME!,
    //         waitForConnections: true,
    //         connectionLimit: 4,
    //         queueLimit: 0,
    //         ssl: { rejectUnauthorized: true } // PlanetScale: SSL recommandé
    //     });
    // }
    // return pool;
}

/** renvoie true si un utilisateur existe déjà pour cet email normalisé */
export async function emailExists(normalEmail: string): Promise<boolean> {
    const pool = getPool();
    // On interroge la colonne virtuale indexée usr_email_normal
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT usr_id FROM usr_user WHERE usr_email_normal = ? LIMIT 1`,
        [normalEmail]
    )
    console.log(rows);
    return rows.length > 0;
    // // On interroge la colonne virtuale indexée usr_email_normal
    // const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    //     `SELECT usr_id FROM usr_user WHERE usr_email_normal = ? LIMIT 1`,
    //     [normalEmail]
    // );
    // return rows.length > 0;
}
