#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const targetDir = path.join(__dirname, '..', '.cognito');

if (!fs.existsSync(targetDir))
  fs.mkdirSync(targetDir, { recursive: true });

const configPath = path.join(targetDir, 'config.json');
if (!fs.existsSync(configPath))
  fs.writeFileSync(configPath, JSON.stringify({}, null, 2));

