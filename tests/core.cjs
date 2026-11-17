// Load the browser engine itself so tests cannot drift from production.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = {module: {exports: {}}, console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/legacy/core.js'), 'utf8'), sandbox);
module.exports = sandbox.module.exports;
