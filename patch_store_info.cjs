const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const isStoreOpenHelper = `
function isStoreOpen(store) {
    if (!store.isOpen) return false;
    if (store.closingDate) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const closeStr = store.closingDate.substring(0, 10);
        if (todayStr > closeStr) return false;
    }
    return true;
}
`;

if (!code.includes('function isStoreOpen(store)')) {
    code = code.replace("async function loadMasterConfig(force = false) {", isStoreOpenHelper + "\nasync function loadMasterConfig(force = false) {");
}

const originalFilter = `    const openStores = config.stores.filter(s => {
        if (!s.isOpen) return false;
        if (s.closingDate) {
            const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const closeStr = s.closingDate.substring(0, 10);
            if (todayStr > closeStr) return false;
        }
        return true;
    });`;
const newFilter = `    const openStores = config.stores.filter(s => isStoreOpen(s));`;
code = code.replace(originalFilter, newFilter);

const renderStoreInfoOriginal = `    container.innerHTML = \`
        <div class="fade-in pb-8">
            \${store.bannerImageId ? \\\`<img src="https://lh3.googleusercontent.com/d/\${store.bannerImageId}" class="w-full h-48 md:h-64 object-cover shadow-sm">\\\` : ''}
            <div class="p-4 max-w-xl mx-auto -mt-8 relative z-10">
                <div class="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-sm border border-gray-400 dark:border-gray-800">
                    <button onclick="Router.navigate('store_shop', {id: '\${storeId}'})" class="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-3 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 text-lg mb-6 tracking-tight">Start Shopping</button>
                    <div class="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-400 max-w-none text-sm leading-relaxed mb-6">\${store.infoHtml}</div>
                    <button onclick="Router.navigate('store_shop', {id: '\${storeId}'})" class="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white py-3 rounded-xl font-bold hover:shadow-md transition-transform active:scale-95 text-lg">Start Shopping</button>
                </div>
            </div>
        </div>
    \`;`;

const renderStoreInfoReplacement = `    const actuallyOpen = isStoreOpen(store);
    
    container.innerHTML = \`
        <div class="fade-in pb-8">
            \${store.bannerImageId ? \\\`<img src="https://lh3.googleusercontent.com/d/\${store.bannerImageId}" class="w-full h-48 md:h-64 object-cover shadow-sm">\\\` : ''}
            <div class="p-4 max-w-xl mx-auto -mt-8 relative z-10">
                <div class="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-sm border border-gray-400 dark:border-gray-800">
                    \${actuallyOpen 
                        ? \\\`<button onclick="Router.navigate('store_shop', {id: '\${storeId}'})" class="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-3 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 text-lg mb-6 tracking-tight">Start Shopping</button>\\\`
                        : \\\`<button disabled class="w-full bg-gray-300 text-gray-500 dark:bg-gray-800 dark:text-gray-500 py-3 rounded-xl font-bold text-lg mb-6 tracking-tight cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\\\`
                    }
                    <div class="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-400 max-w-none text-sm leading-relaxed mb-6">\${store.infoHtml}</div>
                    \${actuallyOpen 
                        ? \\\`<button onclick="Router.navigate('store_shop', {id: '\${storeId}'})" class="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white py-3 rounded-xl font-bold hover:shadow-md transition-transform active:scale-95 text-lg">Start Shopping</button>\\\`
                        : \\\`<button disabled class="w-full bg-gray-200 text-gray-500 dark:bg-gray-900 dark:text-gray-600 py-3 rounded-xl font-bold text-lg cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\\\`
                    }
                </div>
            </div>
        </div>
    \`;`;

code = code.replace(renderStoreInfoOriginal, renderStoreInfoReplacement);

fs.writeFileSync('frontend/js/app.js', code);
