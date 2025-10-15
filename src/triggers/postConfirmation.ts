// src/triggers/postConfirmation.ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import {findUserByEmail} from "../lib/db"; // ton helper mysql2 (PlanetScale-ready)
import { API_URL } from "../config";

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export const handler: PostConfirmationTriggerHandler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const userPoolId = event.userPoolId;
    const username   = event.userName; // sub (UUID Cognito)
    const email      = (event.request.userAttributes?.email || "").trim();
    const firstName  = event.request.userAttributes?.given_name || event.request.userAttributes?.name || "";
    const lastName   = event.request.userAttributes?.family_name || "";
    const phone  = event.request.userAttributes?.phone_number || null;
    const userType   = event.request.userAttributes?.['custom:user_type'] || 'customer';

    console.log(`User ${username} (${email}) signed up as ${userType}`);

    // Idempotence : si déjà migré/créé avant, on ne refait rien
    // (si tu avais déjà custom:usr_id dans l’événement, tu pourrais court-circuiter)

    const user = await findUserByEmail(email);
    if (user) {
        const err = new Error("EMAIL_ALREADY_USED");
        err.name = "EmailExists";
        throw err;
    }

    const body = {
        email,
        roles: userType === 'merchant' ? ['ROLE_OWNER'] : ['ROLE_USER'],
        firstName,
        lastName,
        newsletter: true,
        password: 'invalid',
        lastConnectionAt: null
    };

    const res = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": process.env.API_INTERNAL_KEY || "", // clé d'auth interne optionnelle
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("API responded with error:", res.status, text);
        throw new Error(`API returned ${res.status}`);
    }

    const userResponse: any = await res.json();

    // Attends une réponse du type :
    // {
    //   "usr_id": 42,
    //   "usr_roles": ["ROLE_USER", "ROLE_OWNER"]
    // }

    let usrId: number = userResponse.usr_id;
    let rolesJson: string = JSON.stringify(userResponse.usr_roles ?? ["ROLE_USER"]);

    // 2) pousse les attributs vers Cognito
    try {
        await cognito.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: username, // sub
            UserAttributes: [
                { Name: "custom:usr_id", Value: String(usrId) },
                { Name: "custom:roles",  Value: rolesJson },
                // garde ces lignes si tu es sûr des valeurs :
                // { Name: "given_name", Value: firstName || "" },
                // { Name: "family_name", Value: lastName || "" },
                // Si phone est au format E.164 et "confirmé" chez toi :
                // ...(phone ? [{ Name: "phone_number", Value: phone }, { Name: "phone_number_verified", Value: "true" }] : []),
            ]
        }));
    } catch (err) {
        console.error("Erreur lors de la mise à jour Cognito:", err);
        throw err;
    }

    console.info("PostConfirmation terminée avec succès pour", email);
    return event;
};
