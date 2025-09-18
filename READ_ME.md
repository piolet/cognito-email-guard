pnpm i
pnpm run deploy -- --stage dev
### Récupère les Outputs: UserPoolId, UserPoolClientId
### Mets-les dans ton .env (ou re-déploie en les injectant via variables)
pnpm run deploy -- --stage dev


### pour tester en local
npx serverless invoke local -f preSignUp --path events/preSignUp.json

#### astuce pour voir les logs
NODE_OPTIONS="--inspect" npx serverless invoke local -f preSignUp --path events/preSignUp.json
