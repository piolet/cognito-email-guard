import { emailExists } from "../lib/db";
import type {
    PreSignUpTriggerEvent,
    PreSignUpTriggerHandler,
} from "aws-lambda";

/**
 * Empêche l'inscription si l'email (normalisé) existe déjà
 * dans la table usr_user (PlanetScale).
 */
export const handler: (
    event: PreSignUpTriggerEvent,
    context: never,
    callback: (error?: Error, result?: PreSignUpTriggerEvent) => void
) => void = async (event, _, callback) => {
    const email =
        event.request.userAttributes?.email ||
        event.request.userAttributes?.email_verified && event.userName; // garde-fou
    // récupérer l'attribut cgu_accepted si besoin

    console.log("PreSignUp event", JSON.stringify(event));
    const cguAccepted = event.request.userAttributes?.['custom:cguAccepted'] === 'true';

    if (!cguAccepted) {
        const err = new Error("CGU_ACCEPTANCE_REQUIRED");
        err.name = "CguAcceptanceRequired";
        callback(err, event);
        return
    }

    if (!email) {
        const err = new Error("EMAIL_REQUIRED");
        err.name = "EmailRequired";
        callback(err, event);
        return
    }

    const exists = await emailExists(email);
    if (exists) {
        // Le message est renvoyé au client Cognito (UserExists côté app)
        const err = new Error("EMAIL_ALREADY_USED");
        err.name = "EmailExists";
        callback(err, event);
        return
    }

    // Optionnel: auto-confirm/auto-verify si tu veux
    // event.response.autoConfirmUser = true;
    // event.response.autoVerifyEmail = true;

    callback(undefined, event)
};
