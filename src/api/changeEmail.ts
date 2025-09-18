import { normalizeEmail } from "../lib/email.js";
import { emailExists } from "../lib/db.js";
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

type Body = { newEmail?: string };

const client = new CognitoIdentityProviderClient({});

export const handler = async (event: any) => {
    try {
        if (!process.env.USER_POOL_ID)
            throw new Error("USER_POOL_ID not set");

        const body: Body = JSON.parse(event.body || "{}");
        const newEmail = body.newEmail?.trim();
        if (!newEmail) return resp(400, { error: "NEW_EMAIL_REQUIRED" });

        const normal = normalizeEmail(newEmail);
        if (await emailExists(normal)) {
            return resp(409, { error: "EMAIL_ALREADY_USED" });
        }

        // Récupérer l'identité (sub/username) depuis le JWT validé par l'authorizer
        // httpApi authorizer JWT -> claims en event.requestContext.authorizer.jwt.claims
        const claims = event.requestContext?.authorizer?.jwt?.claims;
        if (!claims) return resp(401, { error: "UNAUTHORIZED" });

        // Le Username côté Cognito est souvent sub, mais ça peut être l’email.
        // Pour sûreté, on récupère l'utilisateur via AdminGetUser sur le sub (si tu stockes le sub côté app).
        const username = claims["cognito:username"];
        if (!username) return resp(401, { error: "NO_USERNAME" });

        // (Optionnel) Vérifie que l'utilisateur existe
        await client.send(
            new AdminGetUserCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: username
            })
        );

        // Met à jour l’email (et reset la vérification)
        await client.send(
            new AdminUpdateUserAttributesCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: username,
                UserAttributes: [
                    { Name: "email", Value: newEmail },
                    { Name: "email_verified", Value: "false" }
                ]
            })
        );

        // Cognito enverra un code de vérification si tu l’as configuré.
        return resp(200, { ok: true });
    } catch (e: any) {
        console.error(e);
        return resp(500, { error: "INTERNAL_ERROR", detail: e?.message });
    }
};

function resp(statusCode: number, body: any) {
    return {
        statusCode,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    };
}
