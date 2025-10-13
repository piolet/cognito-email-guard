import {SSMClient, GetParameterCommand} from "@aws-sdk/client-ssm";
import zlib from "zlib";

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
const url = args.url || 'https://email-formatter.heustach.fr';
const authEnvVar = args["auth-env"] || "HEUSTACH_API_KEY";
const region = process.env.AWS_REGION || args.region || "eu-west-3";

if (!prefix || !url) {
    console.error("Usage: --prefix <ssm/path> --url <endpoint> [--method POST|GET] [--secure] [--kms-id ...]");
    console.error("prefix", prefix);
    console.error("url", url);
    process.exit(1);
}

const bearer = process.env[authEnvVar] || "";
if (!bearer) {
    console.warn(`Attention: variable d'env ${authEnvVar} absente — l'appel API se fera SANS Authorization`);
}
// ---- ssm helpers
const ssm = new SSMClient({ region });

export async function loadTemplate(emailId) {
    const manifestPath = `/${prefix}/${emailId}`
    // 1) Manifest
    const manParam = await ssm.send(new GetParameterCommand({
        Name: manifestPath, WithDecryption: true
    }));
    if (!manParam.Parameter?.Value) throw new Error("Param vide");
    const gz = Buffer.from(manParam.Parameter?.Value, "base64");
    const buf = zlib.gunzipSync(gz);
    const text = buf.toString("utf8");

    const template = JSON.parse(text);
    return { template};
}

// ---- main
(async () => {
    const emailIds = [
        'cognito-sign-up',
        'cognito-admin-create-user',
        'cognito-authentication',
        'cognito-forgot-password',
        'cognito-resend-code',
        'cognito-update-user-attribute',
        'cognito-verify-user-attribute',
    ]
    for (const emailId of emailIds) {
        const isAttribute = emailId.endsWith('-attribute');
        if (isAttribute) {
            const template1 = await loadTemplate(`${emailId}-email`);
            console.log(emailId + '-email', template1);
            const template2 = await loadTemplate(`${emailId}-phone-number`);
            console.log(emailId + '-phone-number', template2);
            continue;
        }

        const template = await loadTemplate(emailId);
        console.log(emailId, template);
    }
    console.log("Tous les messages publiés avec succès.");
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
