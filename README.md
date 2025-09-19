# cognito-email-guard

## install
pnpm i

## deploy
pnpm run deploy --stage dev

### ou en prod
pnpm run deploy --stage prod

## pour tester en local
npx serverless invoke local -f preSignUp --path events/preSignUp.json

#### astuce pour voir les logs
NODE_OPTIONS="--inspect" npx serverless invoke local -f preSignUp --path events/preSignUp.json
