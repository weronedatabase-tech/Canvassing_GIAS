const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

// Update cache in manageStore
code = code.replace(
    /State\.productsCache = products;/g,
    "State.productsCache = products;\n    sessionStorage.setItem(`products_${storeId}`, JSON.stringify(products));"
);

// Update cache in Sortable
code = code.replace(
    /State\.productsCache\.splice\(newIndex, 0, movedItem\);/g,
    "State.productsCache.splice(newIndex, 0, movedItem);\n                    sessionStorage.setItem(`products_${storeId}`, JSON.stringify(State.productsCache));"
);

// Update cache in adminDeleteProduct
code = code.replace(
    /State\.productsCache = State\.productsCache\.filter\(p => p\.id !== productId\);/g,
    "State.productsCache = State.productsCache.filter(p => p.id !== productId);\n        sessionStorage.setItem(`products_${eventId}`, JSON.stringify(State.productsCache));"
);

fs.writeFileSync('frontend/js/app.js', code);
