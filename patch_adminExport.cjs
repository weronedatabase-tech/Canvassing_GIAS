const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const exportHelper = `
function exportConfirmPrompt(unpaidOrders) {
    return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4';
        div.innerHTML = \`
            <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
                <h3 class="text-lg font-bold mb-2 text-amber-600"><i class="fas fa-exclamation-triangle"></i> Unpaid Orders Detected</h3>
                <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">The following orders have not been marked as paid. Please select the ones you want to <strong>INCLUDE</strong> in the vendor export.</p>
                <div class="flex-1 overflow-y-auto mb-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-2 space-y-2">
                    \${unpaidOrders.map(o => \`
                        <label class="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                            <input type="checkbox" class="export-include-cb w-5 h-5 rounded text-blue-600 accent-blue-600" value="\${o.orderId}">
                            <div>
                                <p class="font-bold text-sm">\${escapeHTML(o.customer)} (\${escapeHTML(o.orderId)})</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">$\${o.total.toFixed(2)} - \${o.items.map(i => i.qty + 'x ' + escapeHTML(i.name)).join(', ')}</p>
                            </div>
                        </label>
                    \`).join('')}
                </div>
                <div class="flex gap-2 shrink-0">
                    <button class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors" id="ex-cancel">Cancel Export</button>
                    <button class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors" id="ex-proceed">Proceed to Export</button>
                </div>
            </div>
        \`;
        document.body.appendChild(div);
        
        document.getElementById('ex-cancel').onclick = () => { div.remove(); resolve(null); };
        document.getElementById('ex-proceed').onclick = () => {
            const included = Array.from(document.querySelectorAll('.export-include-cb:checked')).map(cb => cb.value);
            div.remove();
            resolve(included);
        };
    });
}
`;

if (!code.includes('function exportConfirmPrompt')) {
    code = code.replace("async function adminExportVendorOrder", exportHelper + "\nasync function adminExportVendorOrder");
}

const origExport = `    try {
        const itemStats = {};
        State.ordersCache.forEach(o => {
            o.items.forEach(item => {
                if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
                itemStats[item.name].qty += item.qty;
                itemStats[item.name].revenue += item.total;
            });
        });`;

const replaceExport = `    try {
        const unpaidOrders = State.ordersCache.filter(o => !o.paymentConfirmed);
        let excludeOrders = [];
        if (unpaidOrders.length > 0) {
            const includedUnpaid = await exportConfirmPrompt(unpaidOrders);
            if (includedUnpaid === null) {
                btn.innerHTML = '<i class="fas fa-file-export"></i> Export';
                btn.disabled = false;
                return;
            }
            // Exclude orders that are unpaid AND were not selected to be included
            excludeOrders = unpaidOrders.filter(o => !includedUnpaid.includes(o.orderId)).map(o => o.orderId);
        }

        const itemStats = {};
        State.ordersCache.forEach(o => {
            if (excludeOrders.includes(o.orderId)) return;
            o.items.forEach(item => {
                if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
                itemStats[item.name].qty += item.qty;
                itemStats[item.name].revenue += item.total;
            });
        });`;

code = code.replace(origExport, replaceExport);
fs.writeFileSync('frontend/js/app.js', code);
