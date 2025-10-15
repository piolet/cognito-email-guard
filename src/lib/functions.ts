import type {DBClient, ParsedDbUrl} from "./types";
import {PlanetScaleClient} from "./planetscale-client";
import {Mysql2Client} from "./mysql-client";
import { DATABASE_URL } from "../config";

/** Parse DATABASE_URL de forme mysql://user:pass@host:port/db */
function parseDbUrl(urlStr?: string): ParsedDbUrl | null {
    if (!urlStr) return null;
    const url = new URL(urlStr);
    const db = (url.pathname || "").replace(/^\//, "");
    return {
        host: url.hostname,
        user: decodeURIComponent(url.username || ""),
        password: decodeURIComponent(url.password || ""),
        port: Number(url.port) || 3306,
        database: db || "",
    };
}

/** Détermine si c'est PlanetScale (host *.psdb.cloud) */
export function isPlanetScaleHost(host?: string) {
    return !!host && /\.psdb\.cloud$/i.test(host);
}

export function createDbClient(): DBClient {
    const fromUrl = parseDbUrl(DATABASE_URL);
    const driver = (process.env.DB_DRIVER || "").toLowerCase(); // 'pscale' | 'mysql' | ''
    const isPlanetScale = driver === "pscale" || isPlanetScaleHost(fromUrl?.host);

    if (isPlanetScale) return new PlanetScaleClient(fromUrl);
    return new Mysql2Client(fromUrl);
}