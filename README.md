# cognito-email-guard

## install
pnpm i

## deploy
pnpm run deploy --stage dev

### ou en prod
pnpm run deploy --stage prod

## pour tester en local
npx serverless invoke local -f preSignUp --path events/preSignUp.json
npx serverless invoke local -f customMessage --path events/customMessage.json
npx serverless invoke local -f userMigration --path events/userMigration.json

#### astuce pour voir les logs
NODE_OPTIONS="--inspect" npx serverless invoke local -f preSignUp --path events/preSignUp.json

## pour stocker les templates email dans ssm
HEUSTACH_API_KEY=ma-clef && node script/publish-template.mjs --prefix cognito-email-guard/dev/message

Les différents codes sont : 
 - cognito-sign-up
 - cognito-admin-create-user
 - cognito-authentication
 - cognito-forgot-password
 - cognito-resend-code
 - cognito-update-user-attribute
 - cognito-verify-user-attribute