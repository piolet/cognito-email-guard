// pipeline.js
// Usage (exemples):
//   STAGE=dev AWS_REGION=eu-west-1 node pipeline.js env
//   STAGE=dev node pipeline.js robots ./apps/front/static/robots.txt
//
// Prérequis: AWS creds disponibles dans l'env (role CI, keys, etc.)

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { promises as fs } from "fs";
import path from "node:path";

// ---------- config ----------
const STAGE = process.env.STAGE || "dev";
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-west-1";
const ENV_FILE = ".env.local";

// Liste des paramètres à récupérer => [ssmPathSuffix, ENV_KEY, {quote?: boolean}]
const PARAMS = [
    {ssmKey: "tva-rate", envKey: "TVA_RATE"},
    {ssmKey: "sms-notification-cost", envKey: "SMS_NOTIFICATION_COST"},
    {ssmKey: "email-notification-cost", envKey: "EMAIL_NOTIFICATION_COST"},
    {ssmKey: "email-notification-paid-count", envKey: "PUBLIC_EMAIL_NOTIFICATION_PAID_COUNT"},
    {ssmKey: "firebase-fcm-vapid-key", envKey: "PUBLIC_FIREBASE_FCM_VAPID_KEY"},
    {ssmKey: "api-societe-token", envKey: "API_SOCIETE_TOKEN"},
    {ssmKey: "matomo-url", envKey: "PUBLIC_MATOMO_URL"},
    {ssmKey: "matomo-id", envKey: "PUBLIC_MATOMO_SITE_ID"},
    {ssmKey: "matomo-tag", envKey: "PUBLIC_MATOMO_SITE_TAG"},
    {ssmKey: "gouv-secret-key", envKey: "SECRET_SIRET_KEY"},
    {ssmKey: "fees", envKey: "PUBLIC_HEUSTACH_FEES"},
    {ssmKey: "api-key", envKey: "HEUSTACH_API_KEY"},
    {ssmKey: "unknown-api-key", envKey: "HEUSTACH_UNKNOWN_API_KEY"},
    {ssmKey: "instagram-access-token", envKey: "INSTAGRAM_ACCESS_TOKEN"},
    {ssmKey: "stripe-public-key", envKey: "PUBLIC_STRIPE_KEY"},
    {ssmKey: "stripe-secret-key", envKey: "SECRET_STRIPE_KEY"},
    {ssmKey: "stripe-endpoint", envKey: "SECRET_STRIPE_ENDPOINT"},
    {ssmKey: "stripe-payment-conf-id", envKey: "PAYMENT_CONF_ID"},
    {ssmKey: "jwt-public-key", envKey: "PUBLIC_ACCESS_KEY", quote: true},
    {ssmKey: "dev-mode", envKey: "DEV_MODE"},
].map(({ssmKey, envKey, quote}) => ({
    ssmPath: `/heustach-${STAGE}/${ssmKey}`,
    envKey: envKey,
    quote,
}));

// ---------- helpers ----------
const ssm = new SSMClient({ region: AWS_REGION });

async function getParameter(name) {
    const out = await ssm.send(new GetParameterCommand({
        Name: name,
        WithDecryption: true,
    }));
    return out?.Parameter?.Value ?? "";
}

// Échappe une valeur pour .env en la mettant entre quotes simples,
// en remplaçant les ' internes par '"'"' (classique POSIX) puis on garde simple pour parser dotenv.
// La plupart des parsers .env acceptent les valeurs multi-lignes si entourées de quotes.
function quoteForDotenv(val) {
    // Remplace les single quotes par '"'"' (séquence qui casse et referme/rouvre en bash),
    // mais pour un fichier .env lu par dotenv, on peut simplement échapper en backslash les quotes.
    // Beaucoup de parsers n'aiment pas l'échappement POSIX. Simplifions: remplaçons ' par \'
    const safe = String(val).replace(/'/g, "\\'");
    return `'${safe}'`;
}

async function writeEnvFile(lines) {
    const content = lines.join("\n") + "\n";
    await fs.writeFile(ENV_FILE, content, "utf8");
    return path.resolve(ENV_FILE);
}

async function writeFirebaseConfig(jsonPath, jsPath) {
    const ssmPath = `/heustach-${STAGE}/firebase-api-key`;
    const raw = await getParameter(ssmPath);
    if (!raw) throw new Error(`Paramètre SSM vide: ${ssmPath}`);

    // 1) S'assurer que c'est un JSON valide (et récupérer apiKey pour .env)
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`Le contenu de ${ssmPath} n'est pas un JSON valide`);
    }

    // const apiKey = parsed.apiKey || parsed.api_key || "";
    // 2) Append/écrit dans .env.local la variable FIREBASE_API_KEY
    // (si tu veux l’ajouter dans la même passe que "env", tu peux, mais ici c’est explicite)
    // const line = `FIREBASE_API_KEY=${apiKey}\n`;
    // await fs.appendFile(ENV_FILE, line, "utf8");

    // 3) Écrire le JSON tel quel (jolis espacements facultatifs)
    //    garde la chaîne « raw » si tu veux préserver exactement ce qui est en SSM
    await fs.writeFile(jsonPath, JSON.stringify(parsed, null, 2) + "\n", "utf8");

    // 4) Écrire la version JS consommable par le front statique
    const jsContent = `self.firebaseConfig = ${JSON.stringify(parsed)};\n`;
    await fs.writeFile(jsPath, jsContent, "utf8");

    console.log(`Firebase config écrite:
  - ${path.resolve(jsonPath)}
  - ${path.resolve(jsPath)}`);
}

async function buildEnvFile() {
    const lines = [];
    for (const { ssmPath, envKey, quote } of PARAMS) {
        console.log(`Paramètre ${ssmPath} → ${envKey}`);
        const value = await getParameter(ssmPath);
        console.log(`Paramètre ${ssmPath} → ${envKey} (${value.length} chars)`);
        const line = quote
            ? `${envKey}=${quoteForDotenv(value)}`
            : `${envKey}=${value}`;
        lines.push(line);
    }
    const full = await writeEnvFile(lines);
    console.log(`.env.local écrit: ${full}`);
}

// Désactive robots seulement si STAGE=dev
async function disableRobots(filePath) {
    if (STAGE !== "dev") {
        console.log(`STAGE=${STAGE} → robots.txt inchangé`);
        return;
    }
    const content = `User-agent: *\nDisallow: /\n`;
    await fs.writeFile(filePath, content, "utf8");
    const abs = path.resolve(filePath);
    console.log(`robots.txt écrasé (dev): ${abs}\n${content}`);
}

// ---------- CLI ----------
const [cmd, arg1, arg2] = process.argv.slice(2);

(async () => {
    try {
        if (cmd === "env") {
            await buildEnvFile();
        } else if (cmd === "firebase") {
            // chemins par défaut si non fournis
            const jsonPath = arg1 || "./apps/front/src/lib/firebase-config.json";
            const jsPath   = arg2 || "./apps/front/static/firebase-config.js";
            await writeFirebaseConfig(jsonPath, jsPath);
        } else if (cmd === "robots") {
            if (!arg1)
                throw new Error("Chemin robots.txt manquant. Usage: node pipeline.js robots ./apps/front/static/robots.txt");

            await disableRobots(arg1);
        } else {
            console.log(`Usage:
  STAGE=<dev|prod> AWS_REGION=<region> node pipeline.js env
  STAGE=<dev|prod> node pipeline.js robots <path/to/robots.txt>
  STAGE=<dev|prod> node pipeline.js firebase [jsonPath] [jsPath]`);
            process.exit(2);
        }
    } catch (e) {
        console.error("Erreur:", e?.message || e);
        process.exit(1);
    }
})();
