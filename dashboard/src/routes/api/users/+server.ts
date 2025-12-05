import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminCreateUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

export const GET: RequestHandler = async ({ url }) => {
  const endpoint = url.searchParams.get('endpoint');
  const userPoolId = url.searchParams.get('userPoolId');

  if (!endpoint || !userPoolId) {
    return json({ error: 'endpoint et userPoolId sont requis' }, { status: 400 });
  }

  const client = new CognitoIdentityProviderClient({
    region: 'eu-west-3',
    endpoint,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  });

  try {
    const command = new ListUsersCommand({ UserPoolId: userPoolId });
    const response = await client.send(command);
    return json({ users: response.Users ?? [] });
  } catch (error) {
    console.error('ListUsers failed', error);
    return json({ error: "Impossible de lister les utilisateurs" }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const payload = await request.json();
  const { endpoint, userPoolId, username, email, tempPassword } = payload;
  if (!endpoint || !userPoolId || !username || !email) {
    return json({ error: 'endpoint, userPoolId, username et email sont requis' }, { status: 400 });
  }

  const client = new CognitoIdentityProviderClient({
    region: 'eu-west-3',
    endpoint,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  });

  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: tempPassword,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' }
      ]
    });
    await client.send(command);
    return json({ ok: true });
  } catch (error) {
    console.error('AdminCreateUser failed', error);
    return json({ error: "Impossible de créer l'utilisateur" }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const payload = await request.json();
  const { endpoint, userPoolId, username } = payload;
  if (!endpoint || !userPoolId || !username) {
    return json({ error: 'endpoint, userPoolId et username sont requis' }, { status: 400 });
  }

  const client = new CognitoIdentityProviderClient({
    region: 'eu-west-3',
    endpoint,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  });

  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    await client.send(command);
    return json({ ok: true });
  } catch (error) {
    console.error('AdminDeleteUser failed', error);
    return json({ error: "Impossible de supprimer l'utilisateur" }, { status: 500 });
  }
};
