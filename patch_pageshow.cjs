const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

// 1. Add caching to renderStoreShop so it doesn't hit the network on "Back"
code = code.replace(
    "State.products = await apiCall('GET_STORE', { eventId: storeId });\n    sessionStorage.setItem(`products_${storeId}`, JSON.stringify(State.products));",
    `const cachedProducts = sessionStorage.getItem(\\\`products_\${storeId}\\\`);
    if (cachedProducts) {
        State.products = JSON.parse(cachedProducts);
    } else {
        State.products = await apiCall('GET_STORE', { eventId: storeId });
        sessionStorage.setItem(\\\`products_\${storeId}\\\`, JSON.stringify(State.products));
    }`
);

// 2. Add pageshow listener at the bottom
code += `
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        State.cart = JSON.parse(localStorage.getItem('cart')) || [];
        Router.init();
    }
});
`;

fs.writeFileSync('frontend/js/app.js', code);
