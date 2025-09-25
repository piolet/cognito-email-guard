import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import crypto from "crypto";
import zlib from "zlib";
import { minify as minifyHtml } from "html-minifier-terser";

// Usage:
// node scripts/publish-template-from-api.mjs \
//   --prefix myapp/templates/email \
//   --message-id email-registration \
//   --url https://email-formatter.heustach.fr/api/format \
//   --secure --kms-id alias/app-secrets
//
// Options:
//   --stage        : dev|prod (défaut: dev)
//   --prefix       : chemin SSM (sans / initial), ex: myapp/templates/email
//   --message-id   : identifiant de message, ex: email-registration
//   --url          : endpoint API qui renvoie {html,text,to,from,subject}
//   --method       : GET|POST (défaut: POST)
//   --auth-env     : nom de la variable d'env contenant le Bearer, défaut: EMAIL_FORMATTER_KEY
//   --chunk-size   : défaut 3500
//   --version      : défaut Date.now()
//   --secure       : stocker en SecureString
//   --kms-id       : alias/arn de la clé KMS (optionnel)
//   --region       : sinon AWS_REGION env
//   --no-minify    : ne pas minifier le HTML

// ---- parse args
const args = Object.fromEntries(
    process.argv.slice(2)
        .map((a, i, arr) => (a.startsWith("--") ? [a.slice(2), arr[i + 1] ?? true] : null))
        .filter(Boolean)
);

const stage = args.stage || 'dev';                     // ex: dev
const prefix = args.prefix;                     // ex: myapp/templates/email
const messageId = args["message-id"];              // ex: email-registration
const url = args.url || 'https://email-formatter.heustach.fr';
const authEnvVar = args["auth-env"] || "HEUSTACH_API_KEY";
const chunkSize = parseInt(args["chunk-size"] || "3500", 10);
const version = args.version || String(Date.now());
const type = args.secure ? "SecureString" : "String";
const kmsId = args["kms-id"] || null;
const region = process.env.AWS_REGION || args.region || "eu-west-3";
const doMinify = args["no-minify"] ? false : true;

if (!prefix || !messageId || !url) {
    console.error("Usage: --prefix <ssm/path> --message-id <id> --url <endpoint> [--method POST|GET] [--secure] [--kms-id ...]");
    console.error("prefix", prefix);
    console.error("messageId", messageId);
    console.error("url", url);
    process.exit(1);
}

const bearer = process.env[authEnvVar] || "";
if (!bearer) {
    console.warn(`Attention: variable d'env ${authEnvVar} absente — l'appel API se fera SANS Authorization`);
}

// ---- call API
async function fetchTemplate() {
    const headers = { "content-type": "application/json" };
    if (bearer) headers["authorization"] = `Bearer ${bearer}`;

    // créer une const baseUrl qui, en fonction de stage, va modifier l'url en ajoutant "${stage}." avant le domaine principal, sauf si stage est "prod"
    // ex: stage = dev https://email-formatter.heustach.fr => https://email-formatter.dev.heustach.fr
    // ex: stage = prod https://email-formatter.heustach.fr => https://email-formatter.heustach.fr
    // ex: stage = test https://api.example.com => https://api.test.example.com
    let baseUrl = url;
    if (stage && stage !== "prod") {
        const urlObj = new URL(url);
        const hostParts = urlObj.hostname.split(".");
        if (hostParts.length > 1) {
            hostParts.splice(1, 0, stage);
            urlObj.hostname = hostParts.join(".");
            baseUrl = urlObj.toString();
        }
    }

    console.log(`Appel API ${baseUrl} ${stage} (messageId=${messageId})`);

    const body = JSON.stringify({
        emailId: messageId,
        content: {
            code: "{####}",
        }
    });
    const res = await fetch(`${baseUrl}api/format`, { method: 'POST', headers, body });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`API ${res.status} ${res.statusText}: ${t}`);
    }
    const json = await res.json();
    if (!json || typeof json.html !== "string") {
        throw new Error("Réponse API invalide: champ 'html' manquant");
    }
    return json;
}

// ---- ssm helpers
const ssm = new SSMClient({ region });
async function putParam(name, value) {
    const cmd = new PutParameterCommand({
        Name: name,
        Type: type,
        Value: value,
        Overwrite: true,
        ...(kmsId ? { KeyId: kmsId } : {})
    });
    await ssm.send(cmd);
}

// ---- main
(async () => {
    const {html, ...rest } = await fetchTemplate();

    if (!html || html.length < 20)
        throw new Error("Template HTML vide ou trop court");

    const htmlToZip = doMinify
        ? await minifyHtml(html, {
            collapseWhitespace: true,
            conservativeCollapse: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: false,
            keepClosingSlash: true,
            minifyCSS: true,
            minifyJS: true,
            html5: true,
            caseSensitive: false
        })
        : html;
    console.log(`Template HTML ${html.length} chars vers ${doMinify ? "minifié" : "non minifié"} ${htmlToZip.length} chars`);
    // gzip + base64
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify({html: htmlToZip, ...rest}), "utf8"));
    const b64 = gz.toString("base64");
    const sha256 = crypto.createHash("sha256").update(b64).digest("hex");

    // split
    const parts = [];
    for (let i = 0; i < b64.length; i += chunkSize) {
        parts.push(b64.slice(i, i + chunkSize));
    }
    if (parts.length === 0)
        throw new Error("Aucun chunk généré");

    const basePath = `/${prefix}/${messageId}`;
    console.log(`Upload vers SSM sous ${basePath} (${parts.length} chunks)`);

    for (let i = 0; i < parts.length; i++) {
        const key = `${basePath}/parts/part-${String(i + 1).padStart(5, "0")}`;
        const chunk = parts[i];
        if (chunk.length > 4000)
            throw new Error(`Chunk ${i + 1} trop grand (${chunk.length} chars) > 4000 — réduis chunk-size`);

        await putParam(key, chunk);
        console.log(`✓ ${key} (${chunk.length})`);
    }

    const manifest = {
        prefix: basePath,
        version,
        numParts: parts.length,
        encoding: "base64+gzip",
        sha256,
        updatedAt: new Date().toISOString(),
        source: { url, messageId }
    };
    await putParam(`${basePath}/manifest`, JSON.stringify(manifest));
    console.log(`✔ Manifest: ${basePath}/manifest`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
