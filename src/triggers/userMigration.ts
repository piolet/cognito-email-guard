// src/triggers/userMigration.ts
import type {Context, UserMigrationTriggerEvent, UserMigrationTriggerHandler} from "aws-lambda";
import { UserStatus } from "aws-lambda";
import { findUserByEmail, type UserRow } from "../lib/db";
import { verifyPassword } from "../lib/verify-password";

function rolesToJson(roles: unknown): string {
    console.log("rolesToJson: input=", roles);
    if (!roles) return '["ROLE_USER"]';
    try {
        const parsed = typeof roles === "string" ? JSON.parse(roles) : roles;
        const newRoles = Array.isArray(parsed) ? parsed : ["ROLE_USER"];
        if (newRoles.length === 0) newRoles.push("ROLE_USER");
        return JSON.stringify(newRoles);
    } catch {
        return '["ROLE_USER"]';
    }
}

function buildUserAttributes(row: UserRow) {
    return {
        email: row.usr_email,
        email_verified: "true",
        given_name: row.usr_first_name ?? "",
        family_name: row.usr_last_name ?? "",
        ...(row.usr_phone
            ? { phone_number: row.usr_phone, phone_number_verified: "true" }
            : {}),
        "custom:id": String(row.usr_id),
        "custom:firstName": row.usr_first_name ?? "",
        "custom:lastName": row.usr_last_name ?? "",
        "custom:newsletter": `${row.usr_newsletter ?? false}`,
        "custom:roles": rolesToJson(row.usr_roles),
    };
}

export const handler: UserMigrationTriggerHandler = async (
    event: UserMigrationTriggerEvent,
    context: Context
) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("UserMigration event", event, event.request?.password ? "with password" : "no password");
    const { triggerSource, userName: email, request } = event;
    const row: UserRow | null = await findUserByEmail(email);
    console.log("Legacy user row for", email, row ? "found" : "not found");
    if (!row) throw new Error("User not found in legacy DB");

    let finalUserStatus = "CONFIRMED" as UserStatus;
    if (triggerSource === "UserMigration_Authentication") {
        console.info("verifyPassword:start");
        const t0 = Date.now();
        const ok = await verifyPassword(request?.password || "", row.usr_password);
        console.info("verifyPassword:end ms=", Date.now() - t0, "ok=", ok);
        if (!ok) throw new Error("Invalid legacy credentials");
    } else if (triggerSource === "UserMigration_ForgotPassword") {
        // pas de mot de passe à vérifier ici
        finalUserStatus = "RESET_REQUIRED" as UserStatus;
    }

    event.response.userAttributes = buildUserAttributes(row);
    event.response.finalUserStatus = finalUserStatus;
    event.response.messageAction = "SUPPRESS";
    // Note: Cognito définira le mot de passe SAISI comme mot de passe du compte (=> l’utilisateur garde son mot de passe).

    console.log("Response to Cognito:", JSON.stringify(event.response));
    return event;
};
