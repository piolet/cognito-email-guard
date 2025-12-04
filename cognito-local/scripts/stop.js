#!/usr/bin/env node
const { execSync } = require('node:child_process');

try {
  execSync("lsof -ti tcp:9229 | xargs kill -9", { stdio: 'inherit' });
} catch (error) {
  console.error('No process found on port 9229 or failed to stop.');
}

