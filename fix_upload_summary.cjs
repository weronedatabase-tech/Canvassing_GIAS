const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    /    State\.masterConfig = await apiCall\('ADMIN_SAVE_STORE', \{ payload \}\);\n    saveState\(\);\n    \/\/ manageStore\(eventId, 'products'\);\n    document\.getElementById\('pName'\)\.value(.|\n)*?\}\);\n    \}\n\}/g,
    `    State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload });\n    saveState();\n    manageStore(eventId, 'products');\n}`
);

fs.writeFileSync('frontend/js/app.js', code);
