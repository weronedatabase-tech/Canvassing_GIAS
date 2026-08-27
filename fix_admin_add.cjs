const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    /    manageStore\(eventId, 'products'\); \/\/ reload section and stay on tab\n\}/g,
    `    // manageStore(eventId, 'products');
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('pImg').value = '';
    document.getElementById('adminProductsList').innerHTML = renderAdminProductsList(State.productsCache, eventId);
    const productsListEl = document.getElementById('adminProductsList');
    if (productsListEl && window.Sortable) {
        new Sortable(productsListEl, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: async function (evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                if (oldIndex === newIndex) return;
                const movedItem = State.productsCache.splice(oldIndex, 1)[0];
                State.productsCache.splice(newIndex, 0, movedItem);
                sessionStorage.setItem(\`products_\${eventId}\`, JSON.stringify(State.productsCache));
                const productIds = State.productsCache.map(p => p.id);
                await apiCall('ADMIN_REORDER_PRODUCTS', { eventId, productIds }, true);
            }
        });
    }
}`
);

fs.writeFileSync('frontend/js/app.js', code);
