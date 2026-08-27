const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    /await apiCall\('ADMIN_SAVE_PRODUCT', \{ eventId, product \}\);\n\s*manageStore\(eventId, 'products'\);/g,
    "const updatedProducts = await apiCall('ADMIN_SAVE_PRODUCT', { eventId, product });\n    State.productsCache = updatedProducts;\n    sessionStorage.setItem(`products_${eventId}`, JSON.stringify(updatedProducts));\n    manageStore(eventId, 'products');"
);

fs.writeFileSync('frontend/js/app.js', code);
