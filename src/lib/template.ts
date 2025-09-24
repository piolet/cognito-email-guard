import { SSMClient, GetParameterCommand, GetParametersCommand } from "@aws-sdk/client-ssm";
import crypto from "crypto";
import zlib from "zlib";

const ssm = new SSMClient({});
type Manifest = {
    prefix: string;   // ex: "/myapp/templates/email"
    version: string;
    numParts: number;
    encoding: "base64+gzip";
    sha256: string;
    updatedAt: string;
};

let cache: { version: string; template:  {html: string, text: string, subject: string, to: string, from: string} } | null = null;

export async function loadTemplate(manifestPath: string): Promise< {html: string, text: string, subject: string, to: string, from: string}> {
    // 1) Manifest
    const manParam = await ssm.send(new GetParameterCommand({
        Name: manifestPath, WithDecryption: true
    }));
    if (!manParam.Parameter?.Value) throw new Error("Manifest vide");
    const manifest: Manifest = JSON.parse(manParam.Parameter.Value);

    // Si déjà en cache pour cette version → retourne
    if (cache && cache.version === manifest.version) return cache.template;

    // 2) Lire les parts en batch (10 max par appel)
    const names: string[] = [];
    for (let i = 1; i <= manifest.numParts; i++) {
        const n = i.toString().padStart(5, "0");
        names.push(`${manifest.prefix}/parts/part-${n}`);
    }

    const chunks: string[] = [];
    for (let i = 0; i < names.length; i += 10) {
        const batch = names.slice(i, i + 10);
        const res = await ssm.send(new GetParametersCommand({
            Names: batch, WithDecryption: true
        }));
        // Remettre dans l'ordre exact
        const map = new Map((res.Parameters || []).map(p => [p.Name!, p.Value!]));
        for (const n of batch) {
            const v = map.get(n);
            if (v == null) throw new Error(`Part manquante: ${n}`);
            chunks.push(v);
        }
    }

    // 3) Recompose + vérifie hash + décode
    const b64 = chunks.join("");
    const sha = crypto.createHash("sha256").update(b64).digest("hex");
    if (sha !== manifest.sha256) throw new Error("Checksum mismatch");

    const gz = Buffer.from(b64, "base64");
    const buf = zlib.gunzipSync(gz);
    const text = buf.toString("utf8");

    const template: {html: string, text: string, subject: string, to: string, from: string} = JSON.parse(text);

    // 4) Cache mémoire (container-scoped)
    cache = { version: manifest.version, template };
    return template;
}
