import { normalizeEmail } from "../lib/email.js";
import { emailExists } from "../lib/db.js";

import type {
    PreSignUpTriggerEvent,
    PreSignUpTriggerHandler,
} from "aws-lambda";

/**
 * Empêche l'inscription si l'email (normalisé) existe déjà
 * dans la table usr_user (PlanetScale).
 */
export const handler: PreSignUpTriggerHandler = async (
    event: PreSignUpTriggerEvent
) => {
    const email =
        event.request.userAttributes?.email ||
        event.request.userAttributes?.email_verified && event.userName; // garde-fou

    if (!email) {
        throw new Error("EMAIL_REQUIRED");
    }

    const normal = normalizeEmail(email);

    const exists = await emailExists(normal);
    if (exists) {
        // Le message est renvoyé au client Cognito (UserExists côté app)
        const err = new Error("EMAIL_ALREADY_USED");
        // Optionnel: err.name = "EmailExists";
        throw err;
    }

    // Optionnel: auto-confirm/auto-verify si tu veux
    // event.response.autoConfirmUser = true;
    // event.response.autoVerifyEmail = true;

    return event;
};
