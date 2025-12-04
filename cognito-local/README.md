# Cognito Local Wrapper

Ce sous-projet encapsule [jagregory/cognito-local](https://github.com/jagregory/cognito-local) pour offrir une expérience homogène au sein du monorepo Heustach.

## Installation

```bash
pnpm install --filter cognito-local...
```

## Utilisation

```bash
pnpm --filter cognito-local dev
```

Variables d'environnement optionnelles dans `.env` (facultatives) :

- `COGNITO_LOCAL_PORT` (par défaut `9229`)
- `COGNITO_LOCAL_DEBUG` pour activer les logs détaillés
- `COGNITO_LOCAL_DATA_DIR` pour pointer vers un répertoire de persistance custom

## Devutils

```bash
pnpm --filter cognito-local clean    # supprime les données persistées
pnpm --filter cognito-local stop     # tue le process sur le port 9229
```

### Création d'un pool d'utilisateurs exemple

```bash
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local aws --endpoint http://localhost:9229 cognito-idp create-user-pool --pool-name heustach-local
```

