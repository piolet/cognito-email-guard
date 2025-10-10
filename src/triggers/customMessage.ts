// src/customMessage.ts
// import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { loadTemplate } from "../lib/template";
import { STAGE } from "../config";

// const ssm = new SSMClient({});
//
// type TemplateKeys =
//     | "signup.subject" | "signup.html" | "signup.text"
//     | "resend.subject" | "resend.html" | "resend.text"
//     | "forgot.subject" | "forgot.html" | "forgot.text"
//     | "verifyattr.subject" | "verifyattr.html" | "verifyattr.text"
//     | "admincreate.subject" | "admincreate.html" | "admincreate.text";

// const NAMESPACE = process.env.TEMPLATE_NAMESPACE || "/heustach/cognito/email-templates";
const BRAND = process.env.DEFAULT_BRAND || "Heustach";

async function getParam(key: string) {
    try {
        // const name = `${NAMESPACE}/${key}`;
        const name = `/cognito-email-guard/${STAGE}/message/${key}`;
        const result = await loadTemplate(`cognito-email-guard/${STAGE}/message`, key);
        console.log(`Load template ${key} from ${name} =>`, result);
        return result;
        // const out = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: false }));
        // return out.Parameter?.Value || "";
    } catch {
        return null;
    }
}

function fill(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

export const handler = async (event: any) => {
    const trigger = event.triggerSource as string;
    const code = event.request.codeParameter;           // ex: {####}
    const link = event.request.linkParameter;           // ex: {##Click Here##}
    const email = event.request.userAttributes?.email || "";
    const username = event.userName || "";

    console.log("CustomMessage event:", { trigger, code, link, email, username });
    // détermine le jeu de templates
    let emailId: string | null = null;
    switch (trigger) {
        case "CustomMessage_SignUp":
            emailId = 'cognito-sign-up'
            break;
        case "CustomMessage_ResendCode":
            emailId = 'cognito-resend-code'
            break;
        case "CustomMessage_ForgotPassword":
            emailId = 'cognito-forgot-password'
            break;
        case "CustomMessage_VerifyUserAttribute":
            emailId = 'cognito-verify-user-attribute'
            break;
        case "CustomMessage_AdminCreateUser":
            emailId = 'cognito-admin-create-user'
            break;
        case "CustomMessage_Authentication":
            emailId = 'cognito-authentication'
            break;
        case "CustomMessage_UpdateUserAttribute":
            emailId = 'cognito-update-user-attribute'
            break;
        // default:
            // fallback général → réutilise signup
            // base = { subjectKey: "signup.subject", htmlKey: "signup.html", textKey: "signup.text" };
    }

    if (!emailId) {
        throw new Error(`Unsupported trigger source: ${trigger}`);
    }
    const template: { html: string, text: string, subject: string, to: string, from: string } | null = await getParam(emailId)

    console.log("Using template:", emailId, template);
    // charge les templates (SSM → modifiables sans redeploy)
    // const [subjectTpl, htmlTpl, textTpl] = await Promise.all([
    //     getParam(base.subjectKey),
    //     getParam(base.htmlKey),
    //     getParam(base.textKey),
    // ]);

    const vars = {
        BRAND,
        CODE: code ?? "",
        LINK: link ?? "",
        EMAIL: email,
        USERNAME: username,
    };

    // si pas de template défini en SSM, propose un défaut lisible
    const subject = (template?.subject || "{{BRAND}} – Votre code").trim();
    const html = (template?.html || `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h1>{{BRAND}}</h1>
      <p>Bonjour {{USERNAME}},</p>
      <p>Voici votre code&nbsp;: <strong style="font-size:20px">{{CODE}}</strong></p>
      <p>Ou cliquez ici&nbsp;: {{LINK}}</p>
      <p style="color:#666">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
    </div>
  `).trim();
    const text = (template?.text || `
    ${BRAND}
    Bonjour ${username},
    Code: ${code}
    Lien: ${link}
    Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
  `).trim();

    console.log("Generated email:", template?.html, html)
    // alimente la réponse Cognito (pas besoin d'appeler SES ici)
    event.response.emailSubject = fill(subject, vars);
    event.response.emailMessage = fill(html, vars);     // HTML accepté
    event.response.smsMessage = `Code ${BRAND}: ${code}`; // si tu veux aussi un SMS

    // Si tu veux forcer du plain-text, mets text en emailMessage
    // event.response.emailMessage = fill(text, vars);

    return event;
};