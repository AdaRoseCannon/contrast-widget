const package = require('./package.json');
const fs = require('fs');
delete package.scripts;
delete package.devDependencies;
fs.writeFile('./build/__about.json', JSON.stringify(package, null, '  '), err => err && process.exit(1));
