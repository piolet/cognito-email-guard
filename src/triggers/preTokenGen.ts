import type { PreTokenGenerationTriggerEvent, PreTokenGenerationTriggerHandler } from "aws-lambda";
import { dbExecute } from "../lib/db"; // ton helper d'accès DB
// dbExecute("SELECT ...", [params]) → à adapter à ton abstraction

export const handler: PreTokenGenerationTriggerHandler = async (event: PreTokenGenerationTriggerEvent) => {
    const attrs = event.request.userAttributes || {};
    const email = attrs.email || "";
    const given = attrs.given_name || "";
    const family = attrs.family_name || "";
    const phone = attrs.phone_number || "";

    // Récupère id + roles depuis ta base (ex: via usr_email_normal)
    // À adapter à ton schéma réel :
    const rows = await dbExecute<{ usr_id: number, usr_roles: string }[]>(
        "SELECT usr_id, JSON_EXTRACT(usr_roles, '$') AS usr_roles FROM usr_user WHERE usr_email_normal = ? LIMIT 1",
        [email.toLowerCase()]
    );

    console.log("PreTokenGen: found rows =", rows);

    let id = "";
    let rolesArray: string[] = ["ROLE_USER"];
    if (rows.length) {
        id = String(rows[0].usr_id);
        try {
            const parsed = JSON.parse(rows[0].usr_roles || "[]");
            if (Array.isArray(parsed)) rolesArray = parsed;
        } catch {}
    }

    event.request.userAttributes = {...event.request.userAttributes, id}
    const claims = {
        // Tes clés EXACTES (strings uniquement dans PreTokenGen)
        id,                                 // "11"
        email,                              // "piolet@piggums.fr"
        firstName: given,                   // "Louis"
        lastName: family,                   // "Dijoux"
        phone: phone || "",                 // ""
        roles: JSON.stringify(rolesArray)   // '["ROLE_ADMIN","ROLE_USER",...]'
    };

    event.response = event.response || {};
    event.response.claimsOverrideDetails = event.response.claimsOverrideDetails || {};
    event.response.claimsOverrideDetails.claimsToAddOrOverride = {
        ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
        ...claims
    };

    console.log("PreTokenGen: final claims =", event);
    // Facultatif : si tu utilises des Groupes Cognito mais veux forcer le set
    // event.response.claimsOverrideDetails.groupOverrideDetails = {
    //   groupsToOverride: rolesArray
    // };

    return event;
};
