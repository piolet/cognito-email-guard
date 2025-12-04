#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

const projectRoot = path.join(__dirname, '..');
const resolvePackage = () => {
  try {
    const pkgPath = require.resolve('cognito-local/package.json', { paths: [projectRoot] });
    return path.join(path.dirname(pkgPath), 'lib', 'bin', 'start.js');
  } catch (error) {
    console.error('Unable to resolve cognito-local package. Did you install dependencies?', error);
    process.exit(1);
  }
};

dotenv.config({ path: path.join(projectRoot, '.env') });

const dataDir = process.env.COGNITO_LOCAL_DATA_DIR || path.join(projectRoot, '.cognito');
const configPath = path.join(dataDir, 'config.json');
if (!fs.existsSync(dataDir))
  fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(configPath))
  fs.writeFileSync(configPath, JSON.stringify({}, null, 2));

const port = Number(process.env.COGNITO_LOCAL_PORT || process.env.PORT || 9229);
const env = {
  ...process.env,
  PORT: port,
  DEBUG: process.env.COGNITO_LOCAL_DEBUG || process.env.DEBUG || undefined,
  COGNITO_LOCAL_DATA_DIR: dataDir
};

const entryPoint = resolvePackage();
const child = spawn(process.execPath, [entryPoint], {
  stdio: 'inherit',
  cwd: projectRoot,
  env
});

child.on('error', error => {
  console.error('Failed to start cognito-local:', error);
});

child.on('close', code => {
  process.exit(code ?? 0);
});
