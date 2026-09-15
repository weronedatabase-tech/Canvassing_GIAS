const fs = require('fs');
const text = fs.readFileSync('server.js', 'utf8');
console.log(text.includes('console.log("Fetching GAS:", GAS_URL)'));
