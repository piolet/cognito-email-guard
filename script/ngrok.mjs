import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import ngrok from '@ngrok/ngrok';
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// Obtenir le répertoire du script actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger le .env depuis la racine (un niveau au-dessus)
dotenv.config({ path: join(__dirname, "..", ".env") });
// const ngrok = require('@ngrok/ngrok');

(async function() {
    const listener = await ngrok.forward({
        // The port your app is running on.
        addr: 8000,
        host: "127.0.0.1",
        authtoken: process.env.NGROK_AUTHTOKEN,
        user_agent_filter: "*"

        // domain: process.env.NGROK_DOMAIN,
        // Secure your endpoint with a traffic policy.
        // This could also be a path to a traffic policy file.
        // traffic_policy: '{"on_http_request": [{"actions": [{"type": "oauth","config": {"provider": "google"}}]}]}'
    });

    const httpsUrl = listener.url();
    const envPath = join(process.cwd(), ".env");
    let envContent = "";

    // Lecture du fichier .env existant
    if (existsSync(envPath)) {
        envContent = await readFile(envPath, "utf-8");
    }

    // Mise à jour ou ajout de API_URL
    const apiUrlRegex = /^API_URL=.*$/m;
    const newLine = `API_URL=${httpsUrl}`;

    if (apiUrlRegex.test(envContent)) {
        // Remplacer la clé existante
        envContent = envContent.replace(apiUrlRegex, newLine);
        console.log("🔄 Clé API_URL mise à jour dans .env");
    } else {
        // Ajouter la nouvelle clé
        if (envContent && !envContent.endsWith("\n")) {
            envContent += "\n";
        }
        envContent += newLine + "\n";
        console.log("➕ Clé API_URL ajoutée dans .env");
    }

    // Écriture du fichier .env
    await writeFile(envPath, envContent, "utf-8");
    console.log(`💾 Fichier .env mis à jour avec API_URL=${httpsUrl}`);
    console.log("\n✨ Tunnel actif ! Appuyez sur Ctrl+C pour arrêter.");
    // Output ngrok url to console
    console.log(`Ingress established at ${httpsUrl}`);
})();

// Keep the process alive
process.stdin.resume();