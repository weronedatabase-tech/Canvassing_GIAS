const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    /    manageStore\(eventId, 'products'\);/g,
    "    // manageStore(eventId, 'products');\n    document.getElementById('pName').value = '';\n    document.getElementById('pPrice').value = '';\n    document.getElementById('pDesc').value = '';\n    document.getElementById('pImg').value = '';\n    document.getElementById('adminProductsList').innerHTML = renderAdminProductsList(State.productsCache, eventId);\n    const productsListEl = document.getElementById('adminProductsList');\n    if (productsListEl && window.Sortable) {\n        new Sortable(productsListEl, {\n            handle: '.drag-handle',\n            animation: 150,\n            onEnd: async function (evt) {\n                const oldIndex = evt.oldIndex;\n                const newIndex = evt.newIndex;\n                if (oldIndex === newIndex) return;\n                const movedItem = State.productsCache.splice(oldIndex, 1)[0];\n                State.productsCache.splice(newIndex, 0, movedItem);\n                sessionStorage.setItem(`products_${eventId}`, JSON.stringify(State.productsCache));\n                const productIds = State.productsCache.map(p => p.id);\n                await apiCall('ADMIN_REORDER_PRODUCTS', { eventId, productIds }, true);\n            }\n        });\n    }"
);

fs.writeFileSync('frontend/js/app.js', code);
