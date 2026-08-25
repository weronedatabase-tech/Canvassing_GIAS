import fs from 'fs';
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    /function renderAdminSummary\(orders, products\) {/g,
    "function renderAdminSummary(orders, products, storeId) {"
);

code = code.replace(
    /\$\{renderAdminSummary\(orders, products\)\}/g,
    "${renderAdminSummary(orders, products, storeId)}"
);

code = code.replace(
    /panelSummary\.innerHTML = renderAdminSummary\(State\.ordersCache, State\.productsCache\);/g,
    "panelSummary.innerHTML = renderAdminSummary(State.ordersCache, State.productsCache, eventId);"
);

code = code.replace(
    /<h4 class="font-bold text-sm mb-3 text-gray-900 dark:text-gray-100">Item Breakdown<\/h4>/g,
    `<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
            <div class="flex items-center gap-3">
                <h4 class="font-bold text-sm text-gray-900 dark:text-gray-100">Item Breakdown</h4>
                <button id="exportVendorBtn" onclick="adminExportVendorOrder('\${storeId}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><i class="fas fa-file-export"></i> Export</button>
                <a id="viewExportLink" href="#" target="_blank" class="hidden text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"><i class="fas fa-external-link-alt"></i> View Sheet</a>
            </div>
            <button onclick="adminOpenVendorFolder('\${storeId}')" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><i class="fas fa-folder-open"></i> Open Vendor Folder</button>
        </div>`
);

const newFunctions = `
async function adminExportVendorOrder(eventId) {
    const btn = document.getElementById('exportVendorBtn');
    const link = document.getElementById('viewExportLink');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    btn.disabled = true;
    
    try {
        const itemStats = {};
        State.ordersCache.forEach(o => {
            o.items.forEach(item => {
                if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
                itemStats[item.name].qty += item.qty;
                itemStats[item.name].revenue += item.total;
            });
        });
        
        const statsArray = Object.keys(itemStats).map(name => ({
            name,
            price: itemStats[name].revenue / itemStats[name].qty,
            qty: itemStats[name].qty,
            revenue: itemStats[name].revenue
        }));
        
        const store = State.masterConfig.stores.find(s => s.id === eventId);
        const res = await apiCall('ADMIN_EXPORT_VENDOR_ORDER', { eventId, eventName: store.name, itemStats: statsArray }, true);
        
        link.href = res.sheetUrl;
        link.classList.remove('hidden');
        customAlert('Export successful!');
    } catch(e) {
        console.error(e);
        customAlert('Export failed.');
    } finally {
        btn.innerHTML = '<i class="fas fa-file-export"></i> Export';
        btn.disabled = false;
    }
}

async function adminOpenVendorFolder(eventId) {
    try {
        const res = await apiCall('ADMIN_GET_VENDOR_FOLDER', { eventId }, true);
        window.open(res.folderUrl, '_blank');
    } catch(e) {
        console.error(e);
        customAlert('Failed to open folder.');
    }
}
`;

fs.writeFileSync('frontend/js/app.js', code + newFunctions);
