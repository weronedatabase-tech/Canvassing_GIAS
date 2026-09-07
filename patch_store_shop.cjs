const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const storeShopOrig = `async function renderStoreShop(container, storeId) {
    const config = await loadMasterConfig();
    const store = config.stores.find(s => s.id === storeId);
    if (!store) return;`;
    
const storeShopNew = `async function renderStoreShop(container, storeId) {
    const config = await loadMasterConfig();
    const store = config.stores.find(s => s.id === storeId);
    if (!store) return;
    
    if (!isStoreOpen(store)) {
        return Router.navigate('store_info', {id: storeId});
    }`;
    
code = code.replace(storeShopOrig, storeShopNew);
fs.writeFileSync('frontend/js/app.js', code);
