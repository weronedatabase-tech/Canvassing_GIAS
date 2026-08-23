const State = {
    masterConfig: JSON.parse(sessionStorage.getItem('masterConfig')) || null,
    activeStoreId: localStorage.getItem('activeStoreId') || null,
    products: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    adminToken: localStorage.getItem('adminToken') || null,
    ordersCache: []
};

function saveState() {
    if (State.masterConfig) sessionStorage.setItem('masterConfig', JSON.stringify(State.masterConfig));
    if (State.activeStoreId) localStorage.setItem('activeStoreId', State.activeStoreId);
    localStorage.setItem('cart', JSON.stringify(State.cart));
}

function toggleDarkMode() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
}

function initTheme() {
    if (localStorage.theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}
initTheme();

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}


function customAlert(msg) {
    return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60';
        div.innerHTML = `
            <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
                <h3 class="text-lg font-bold mb-3">Notice</h3>
                <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">${msg}</p>
                <div class="flex justify-end">
                    <button class="bg-gray-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold w-full" id="ca-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        document.getElementById('ca-ok').onclick = () => { div.remove(); resolve(); };
    });
}

function customConfirm(msg) {
    return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60';
        div.innerHTML = `
            <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
                <h3 class="text-lg font-bold mb-3">Confirm Action</h3>
                <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">${msg}</p>
                <div class="flex justify-end gap-3">
                    <button class="flex-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold" id="cc-cancel">Cancel</button>
                    <button class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold" id="cc-ok">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        document.getElementById('cc-cancel').onclick = () => { div.remove(); resolve(false); };
        document.getElementById('cc-ok').onclick = () => { div.remove(); resolve(true); };
    });
}

function showLoading(show, text="Processing...") {
    const el = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').innerText = text;
    show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

async function apiCall(action, payload = {}, skipLoading = false) {
    if(!skipLoading) showLoading(true);
    try {
        const body = { action, ...payload };
        if (State.adminToken) body.password = State.adminToken;
        const res = await fetch('/api/gas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        const json = await res.json();
        
        if (!json.success) {
            // Detect if the user is hitting the old GAS deployment
            if (json.message && (json.message.includes('Invalid Action') || json.message.includes('Unknown action'))) {
                throw new Error("Backend Outdated! Please copy the latest contents of /backend/Code.js and paste it into your Google Apps Script editor. Then create a New Deployment.");
            }
            throw new Error(json.message);
        }
        return json.data;
    } catch(e) {
        customAlert(e.message);
        throw e;
    } finally {
        if(!skipLoading) showLoading(false);
    }
}

// Router
const Router = {
    navigate: (view, params = {}) => {
        let path = '/';
        if (view === 'store_info') path = `/store/${params.id}/info`;
        else if (view === 'store_shop') path = `/store/${params.id}/shop`;
        else if (view === 'cart') path = '/cart';
        else if (view === 'checkout') path = '/checkout';
        else if (view === 'admin_login') path = '/admin/login';
        else if (view === 'admin_dashboard') path = '/admin/dashboard';
        else if (view === 'admin_manage_store') path = `/admin/store/${params.id}`;
        else if (view === 'success') {
            const qs = new URLSearchParams(params).toString();
            path = `/success?${qs}`;
        }
        
        window.location.href = path; // True MPA behavior
    },
    init: () => {
        const path = window.location.pathname;
        let view = 'landing';
        let params = {};
        
        if (path.startsWith('/store/')) {
            const parts = path.split('/');
            params.id = parts[2];
            view = parts[3] === 'shop' ? 'store_shop' : 'store_info';
        } else if (path === '/cart') {
            view = 'cart';
        } else if (path === '/checkout') {
            view = 'checkout';
        } else if (path === '/admin/login') {
            view = 'admin_login';
        } else if (path === '/admin/dashboard') {
            view = 'admin_dashboard';
        } else if (path.startsWith('/admin/store/')) {
            const parts = path.split('/');
            params.id = parts[3];
            view = 'admin_manage_store';
        } else if (path === '/success') {
            view = 'success';
            const qs = new URLSearchParams(window.location.search);
            params = Object.fromEntries(qs.entries());
        }
        
        renderView(view, params);
    }
};

async function renderView(view, params = {}) {
    const container = document.getElementById('app-container');
    document.getElementById('backBtn').classList.toggle('hidden', view === 'landing');
    document.getElementById('headerCartIcon').classList.toggle('hidden', !['store_info', 'store_shop'].includes(view));
    
    container.innerHTML = '';
    
    if (view === 'landing') await renderLanding(container);
    else if (view === 'store_info') await renderStoreInfo(container, params.id);
    else if (view === 'store_shop') await renderStoreShop(container, params.id);
    else if (view === 'cart') await renderCartPage(container);
    else if (view === 'checkout') await renderCheckout(container);
    else if (view === 'success') await renderSuccess(container, params);
    else if (view === 'admin_login') renderAdminLogin(container);
    else if (view === 'admin_dashboard') await renderAdminDashboard(container);
    else if (view === 'admin_manage_store') await manageStore(params.id);
}

// ---- VIEWS ----

async function loadMasterConfig(force = false) {
    if (!State.masterConfig || force) {
        State.masterConfig = await apiCall('INIT');
        saveState();
    }
    return State.masterConfig;
}

async function renderLanding(container) {
    const config = await loadMasterConfig();
    document.getElementById('appTitleDisplay').innerText = "Fundraising Hub";
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const openStores = config.stores.filter(s => {
        if (!s.isOpen) return false;
        if (s.closingDate) {
            const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const closeStr = s.closingDate.substring(0, 10);
            if (todayStr > closeStr) return false;
        }
        return true;
    });

    let html = `<div class="p-3 fade-in">
        <h2 class="text-2xl font-display font-semibold mb-4 tracking-tight">Active Fundraisers</h2>
        <div class="grid gap-4">`;
        
    if (openStores.length === 0) {
        html += `<p class="text-gray-700 dark:text-gray-300 font-medium">No active fundraisers at the moment.</p>`;
    } else {
        html += openStores.map(s => `
            <div onclick="Router.navigate('store_info', {id: '${s.id}'})" class="bg-white dark:bg-[#111] p-4 rounded-xl shadow-sm border border-gray-400 dark:border-gray-800 cursor-pointer hover:shadow-md transition-all active:scale-95 group">
                ${s.bannerImageId ? `<img src="https://lh3.googleusercontent.com/d/${s.bannerImageId}" class="w-full h-36 object-cover rounded-lg mb-3 group-hover:opacity-95 transition-opacity">` : ''}
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">${escapeHTML(s.name)}</h3>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-400 mt-1"><i class="far fa-calendar-alt mr-1"></i> Closes: ${s.closingDate || 'No date set'}</p>
            </div>
        `).join('');
    }
    html += `</div></div>`;
    container.innerHTML = html;
}

async function renderStoreInfo(container, storeId) {
    const config = await loadMasterConfig();
    const store = config.stores.find(s => s.id === storeId);
    if (!store) return Router.navigate('landing');
    
    State.activeStoreId = storeId;
    saveState();
    document.getElementById('appTitleDisplay').innerText = store.name;
    
    container.innerHTML = `
        <div class="fade-in pb-8">
            ${store.bannerImageId ? `<img src="https://lh3.googleusercontent.com/d/${store.bannerImageId}" class="w-full h-48 md:h-64 object-cover shadow-sm">` : ''}
            <div class="p-4 max-w-xl mx-auto -mt-8 relative z-10">
                <div class="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-sm border border-gray-400 dark:border-gray-800">
                    <button onclick="Router.navigate('store_shop', {id: '${storeId}'})" class="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-3 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 text-lg mb-6 tracking-tight">Start Shopping</button>
                    <div class="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-400 max-w-none text-sm leading-relaxed mb-6">${store.infoHtml}</div>
                    <button onclick="Router.navigate('store_shop', {id: '${storeId}'})" class="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white py-3 rounded-xl font-bold hover:shadow-md transition-transform active:scale-95 text-lg">Start Shopping</button>
                </div>
            </div>
        </div>
    `;
}

async function renderStoreShop(container, storeId) {
    const config = await loadMasterConfig();
    const store = config.stores.find(s => s.id === storeId);
    if (!store) return;
    
    State.activeStoreId = storeId;
    saveState();
    
    const cachedProducts = sessionStorage.getItem(`products_${storeId}`);
    if (cachedProducts) {
        State.products = JSON.parse(cachedProducts);
    } else {
        State.products = await apiCall('GET_STORE', { eventId: storeId });
        sessionStorage.setItem(`products_${storeId}`, JSON.stringify(State.products));
    }
    
    updateCartCount();

    container.innerHTML = `
        <div class="p-4 fade-in pb-24">
            <h2 class="text-xl font-bold flex items-center gap-2 mb-4"><i class="fas fa-store"></i> ${store.name} Items</h2>
            
            ${store.summaryFileId ? (
                store.summaryFileType === 'image' 
                ? `<img src="https://lh3.googleusercontent.com/d/${store.summaryFileId}" class="w-full rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 object-contain max-h-[60vh]">`
                : `<a href="https://drive.google.com/file/d/${store.summaryFileId}/view" target="_blank" class="block w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-3 px-4 rounded-xl font-bold mb-6 text-center border border-blue-200 dark:border-blue-800 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"><i class="fas fa-file-pdf mr-2"></i> View ${store.summaryFileName || 'Products Summary'}</a>`
            ) : ''}
            
            <div class="grid grid-cols-1 gap-4" id="productList">
                ${State.products.length === 0 ? '<p>No items.</p>' : State.products.map(p => {
                    const inCart = State.cart.find(c => c.id === p.id);
                    const qtyHtml = inCart 
                        ? `<div class="flex items-center bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
                            <button onclick="updateQty('${p.id}', -1)" class="w-10 h-10 font-bold text-xl text-blue-600 dark:text-blue-400">-</button>
                            <span class="w-8 text-center font-bold" id="qty-${p.id}">${inCart.qty}</span>
                            <button onclick="updateQty('${p.id}', 1)" class="w-10 h-10 font-bold text-xl text-blue-600 dark:text-blue-400">+</button>
                           </div>`
                        : `<button onclick="updateQty('${p.id}', 1)" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Add to Cart</button>`;

                    return `
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3 flex gap-3 border dark:border-gray-700">
                        ${p.imageId ? `<img src="https://lh3.googleusercontent.com/d/${p.imageId}" class="w-24 h-24 object-cover rounded-md">` : '<div class="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">No Image</div>'}
                        <div class="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <h3 class="font-bold text-lg leading-tight dark:text-white break-words">${escapeHTML(p.name)}</h3>
                                <p class="text-xs text-gray-700 dark:text-gray-400 line-clamp-2 mt-1 break-words">${escapeHTML(p.description || '')}</p>
                            </div>
                            <div class="flex justify-between items-end mt-2">
                                <span class="font-bold text-blue-600 dark:text-blue-400 text-lg">$${p.price.toFixed(2)}</span>
                                <div id="btn-container-${p.id}">${qtyHtml}</div>
                            </div>
                        </div>
                    </div>`
                }).join('')}
            </div>
            
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
                <div class="max-w-lg mx-auto">
                    <button onclick="Router.navigate('cart')" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg flex justify-between px-6 items-center">
                        <span>View Cart</span>
                        <span id="bottomTotal" class="bg-green-700 px-2 py-1 rounded text-sm">$${getCartTotal()}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateQty(id, delta) {
    let item = State.cart.find(c => c.id === id);
    if (!item) {
        if (delta > 0) {
            const product = State.products.find(p => p.id === id);
            if (!product) return;
            item = { ...product, qty: 1 };
            State.cart.push(item);
        }
    } else {
        item.qty += delta;
        if (item.qty <= 0) {
            State.cart = State.cart.filter(c => c.id !== id);
        }
    }
    updateCartCount();
    saveState();
    
    // Re-render button container for this product if we are on shop page
    const btnContainer = document.getElementById(`btn-container-${id}`);
    if (btnContainer) {
        const inCart = State.cart.find(c => c.id === id);
        btnContainer.innerHTML = inCart 
            ? `<div class="flex items-center bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
                <button onclick="updateQty('${id}', -1)" class="w-10 h-10 font-bold text-xl text-blue-600 dark:text-blue-400">-</button>
                <span class="w-8 text-center font-bold">${inCart.qty}</span>
                <button onclick="updateQty('${id}', 1)" class="w-10 h-10 font-bold text-xl text-blue-600 dark:text-blue-400">+</button>
               </div>`
            : `<button onclick="updateQty('${id}', 1)" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Add to Cart</button>`;
    }
    
    // Re-render cart page completely if we are currently on it
    if (window.location.pathname === '/cart') {
        renderCartPage(document.getElementById('app-container'));
    }
    
    const totalEl = document.getElementById('bottomTotal');
    if(totalEl) totalEl.innerText = `$${getCartTotal()}`;
    
    if (window.location.search.includes('view=cart')) renderCartPage(document.getElementById('app-container'));
}

function getCartTotal() {
    return State.cart.reduce((s, c) => s + (c.price * c.qty), 0).toFixed(2);
}

function updateCartCount() {
    const count = State.cart.reduce((s, c) => s + c.qty, 0);
    const badge = document.getElementById('headerCartCount');
    badge.innerText = count;
    badge.classList.toggle('hidden', count === 0);
}

async function renderCartPage(container) {
    if (State.cart.length === 0) {
        container.innerHTML = `<div class="p-6 text-center"><p class="mb-4">Your cart is empty.</p><button onclick="Router.navigate('store_shop', {id: '${State.activeStoreId}'})" class="text-blue-600 underline">Back to Shop</button></div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="p-4 fade-in pb-24">
            <h2 class="text-xl font-bold mb-4">Your Cart</h2>
            <div class="space-y-3">
                ${State.cart.map(c => `
                    <div class="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded shadow">
                        <div>
                            <p class="font-bold">${escapeHTML(c.name)}</p>
                            <p class="text-sm text-gray-700">$${c.price.toFixed(2)} x ${c.qty} = <span class="font-bold text-gray-900 dark:text-white">$${(c.price * c.qty).toFixed(2)}</span></p>
                        </div>
                        <div class="flex items-center bg-blue-50 dark:bg-gray-700 rounded border border-blue-100 dark:border-gray-600">
                            <button onclick="updateQty('${c.id}', -1)" class="w-8 h-8 font-bold text-blue-600">-</button>
                            <span class="w-6 text-center text-sm font-bold">${c.qty}</span>
                            <button onclick="updateQty('${c.id}', 1)" class="w-8 h-8 font-bold text-blue-600">+</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-6 bg-white dark:bg-gray-800 p-4 rounded shadow">
                <div class="flex justify-between font-bold text-lg"><span>Total:</span><span>$${getCartTotal()}</span></div>
            </div>
            
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-30">
                <div class="max-w-lg mx-auto flex gap-2">
                    <button onclick="Router.navigate('store_shop', {id: '${State.activeStoreId}'})" class="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg font-bold">Back</button>
                    <button onclick="Router.navigate('checkout')" class="flex-[2] bg-green-600 text-white py-3 rounded-lg font-bold">Checkout</button>
                </div>
            </div>
        </div>
    `;
}

// Generate SGQR PayNow String
function generatePayNowString(proxyValue, amount, ref) {
    const tlv = (tag, val) => {
        const v = String(val);
        const l = v.length.toString().padStart(2, '0');
        return `${tag}${l}${v}`;
    };
    
    let proxyType = '0';
    let formattedProxy = (proxyValue || '').trim();
    if (formattedProxy.length === 8 && /^\d+$/.test(formattedProxy)) {
        formattedProxy = '+65' + formattedProxy;
    } else if (formattedProxy.length >= 9 && !formattedProxy.startsWith('+')) {
        proxyType = '2'; // UEN
    }
    
    let payload = tlv('00', '01') + tlv('01', '12'); 
    
    let accInfo = tlv('00', 'SG.PAYNOW') + tlv('01', proxyType) + tlv('02', formattedProxy) + tlv('03', '1'); // 1 means amount is not editable
    payload += tlv('26', accInfo) + tlv('52', '0000') + tlv('53', '702');
    
    if (amount && parseFloat(amount) > 0) {
        payload += tlv('54', parseFloat(amount).toFixed(2));
    }
    
    payload += tlv('58', 'SG') + tlv('59', 'NA') + tlv('60', 'Singapore');
    
    if (ref) payload += tlv('62', tlv('01', ref));
    payload += '6304'; 
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload + crc;
}

async function renderCheckout(container) {
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    
    // Generate order ID early for the QR reference
    const rand = Math.floor(1000 + Math.random() * 9000);
    const tempOrderId = `${store.name} - <PHONE> - ${rand}`; 

    container.innerHTML = `
        <div class="p-4 fade-in pb-10">
            <h2 class="text-xl font-bold mb-4">Checkout</h2>
            
            <form id="checkoutForm" onsubmit="handleOrderSubmit(event, '${rand}')" class="space-y-4">
                
                <div class="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-400 dark:border-gray-700">
                    <h3 class="font-bold mb-3 border-b pb-2 dark:border-gray-700">1. Your Details</h3>
                    <div><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Full Name</label><input type="text" id="custName" required class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600"></div>
                    <div class="grid grid-cols-2 gap-3 mt-3">
                        <div><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">WhatsApp No.</label><input type="tel" id="custPhone" oninput="updateQrRef(this.value, '${rand}')" required pattern="^[89][0-9]{7}$" placeholder="8 digits" class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600"></div>
                        <div><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Email</label><input type="email" id="custEmail" required class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600"></div>
                    </div>
                    <div class="mt-3">
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">I AM A...</label>
                        <select id="custType" required onchange="handleCustTypeChange()" class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Select...</option>
                            <option value="Volunteer">Volunteer</option>
                            <option value="Friend of Volunteer">Friend of Volunteer</option>
                            <option value="Caregiver">Caregiver</option>
                            <option value="Public">Public</option>
                        </select>
                    </div>
                    <div id="custRelationContainer" class="hidden mt-3">
                        <label id="custRelationLabel" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Name</label>
                        <input type="text" id="custRelationName" class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600">
                    </div>
                </div>

                <div id="paymentSection" class="hidden bg-white dark:bg-gray-800 border-2 border-purple-800 p-4 rounded shadow relative">
                    <h3 class="font-bold mb-2">2. Payment</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">PayNow to the number below or scan QR.</p>
                    
                    <div class="flex items-center gap-4">
                        <canvas id="qrCanvas" class="w-32 h-32 bg-white p-1 rounded"></canvas>
                        <div>
                            <p class="text-sm">Pay: <span class="text-xl font-bold text-purple-700 dark:text-purple-400">$${getCartTotal()}</span></p>
                            <p class="text-sm">To: <span class="font-mono font-bold">${store.paynowNumber || 'Not Set'}</span></p>
                            <p class="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded mt-1">Ref: <span id="qrRefDisplay" class="font-mono font-bold">${store.name} - ____ - ${rand}</span></p>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Upload Successful Payment Screenshot</label>
                        <input type="file" id="paymentProof" accept="image/*" required class="w-full text-sm">
                    </div>
                </div>
                
                <button type="submit" id="submitOrderBtn" class="hidden w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg">Confirm & Submit</button>
            </form>
        </div>
    `;

    // Render initial QR (will update when phone is typed)
    renderQR(store.paynowNumber, getCartTotal(), `${store.name} - 00000000 - ${rand}`);
}

function handleCustTypeChange() {
    const type = document.getElementById('custType').value;
    const container = document.getElementById('custRelationContainer');
    const label = document.getElementById('custRelationLabel');
    const input = document.getElementById('custRelationName');
    
    if (type === 'Friend of Volunteer') {
        container.classList.remove('hidden');
        label.innerText = "Volunteer's Name";
        input.required = true;
    } else if (type === 'Caregiver') {
        container.classList.remove('hidden');
        label.innerText = "Trainee's Name";
        input.required = true;
    } else {
        container.classList.add('hidden');
        input.required = false;
        input.value = '';
    }
}

function updateQrRef(phone, rand) {
    const val = phone.length >= 4 ? phone : '____';
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    const ref = `${store.name} - ${val} - ${rand}`;
    document.getElementById('qrRefDisplay').innerText = ref;
    renderQR(store.paynowNumber, getCartTotal(), ref);
    
    const paymentSection = document.getElementById('paymentSection');
    const submitBtn = document.getElementById('submitOrderBtn');
    
    if (/^[89]\d{7}$/.test(phone)) {
        paymentSection.classList.remove('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        paymentSection.classList.add('hidden');
        submitBtn.classList.add('hidden');
    }
}

function renderQR(phone, amount, ref) {
    if(!phone) return;
    const str = generatePayNowString(phone, amount, ref);
    new QRious({
        element: document.getElementById('qrCanvas'),
        value: str,
        size: 200,
        level: 'M'
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

async function handleOrderSubmit(e, rand) {
    e.preventDefault();
    const phone = document.getElementById('custPhone').value;
    const name = document.getElementById('custName').value;
    const email = document.getElementById('custEmail').value;
    const custType = document.getElementById('custType').value;
    const custRelationName = document.getElementById('custRelationName').value;
    const fileInput = document.getElementById('paymentProof');
    
    let paymentProofBase64 = null, mimeType = null;
    if(fileInput.files.length > 0) {
        paymentProofBase64 = await compressImage(fileInput.files[0], 1000);
        mimeType = 'image/jpeg';
    }

    const val = phone.length >= 4 ? phone : '____';
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    const finalOrderId = `${store.name} - ${val} - ${rand}`;

    const payload = {
        orderId: finalOrderId,
        customerName: name, contact: phone, email: email,
        custType: custType, custRelationName: custRelationName,
        cart: State.cart, totalAmount: parseFloat(getCartTotal()),
        paymentProofBase64, mimeType
    };

    const res = await apiCall('SUBMIT_ORDER', { eventId: State.activeStoreId, order: payload });
    State.cart = [];
    updateCartCount();
    saveState();
    
    if (res.emailStatus && res.emailStatus.startsWith("Failed")) {
        customAlert("Order submitted, but failed to send confirmation email: " + res.emailStatus);
    }
    
    Router.navigate('success', { orderId: res.orderId, email: email, emailStatus: res.emailStatus });
}

async function renderSuccess(container, params) {
    container.innerHTML = `
        <div class="p-6 fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div class="bg-green-100 dark:bg-green-900 p-4 rounded-full mb-4"><i class="fas fa-check text-4xl text-green-600 dark:text-green-400"></i></div>
            <h2 class="text-2xl font-bold mb-2">Order Submitted!</h2>
            <p class="mb-4">Order ID: <span class="font-mono font-bold">${escapeHTML(params.orderId)}</span></p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Confirmation sent to ${escapeHTML(params.email)}</p>
            <button onclick="Router.navigate('landing')" class="text-blue-600 font-bold hover:underline">Back to Home</button>
        </div>
    `;
}

// ---- ADMIN ----

function renderAdminLogin(container) {
    container.innerHTML = `
        <div class="p-6 flex justify-center mt-10 fade-in">
            <form onsubmit="handleAdminLogin(event)" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
                <h2 class="text-xl font-bold mb-4 text-center">Admin Access</h2>
                <div class="relative mb-4">
                    <input type="password" id="adminPwd" placeholder="Password" required class="w-full p-3 border border-gray-400 rounded dark:bg-gray-700 dark:border-gray-600 pr-10">
                    <i class="fas fa-eye password-toggle" onclick="togglePassword(this, 'adminPwd')"></i>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded font-bold">Login</button>
            </form>
        </div>
    `;
}

function togglePassword(icon, id) {
    const input = document.getElementById(id);
    if(input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const pwd = document.getElementById('adminPwd').value;
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({password: pwd})
        });
        const json = await res.json();
        if(json.success) {
            localStorage.setItem('adminToken', pwd);
            State.adminToken = pwd;
            Router.navigate('admin_dashboard');
        } else customAlert("Invalid Password");
    } catch(e) { customAlert("Login error"); }
}

async function renderAdminDashboard(container, forceRefresh = false) {
    if(!State.adminToken) return Router.navigate('admin_login');
    const config = await loadMasterConfig(forceRefresh);
    
    container.innerHTML = `
        <div class="p-3 md:p-4 fade-in pb-16">
            <div class="flex justify-between items-center mb-5">
                <h2 class="text-2xl font-display font-bold">Dashboard</h2>
                <div class="flex gap-3 text-sm font-semibold">
                    <button onclick="renderAdminDashboard(document.getElementById('app-container'), true)" class="text-blue-600 hover:text-blue-700"><i class="fas fa-sync mr-1"></i> Refresh</button>
                    <button onclick="localStorage.removeItem('adminToken'); State.adminToken = null; Router.navigate('landing')" class="text-red-500 hover:text-red-600">Logout</button>
                </div>
            </div>
            
            <div class="mb-5 bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-400 dark:border-gray-800">
                <h3 class="font-bold mb-4 flex items-center justify-between text-lg">
                    Stores
                    <button onclick="createNewStorePrompt()" class="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-1.5 rounded-lg text-sm font-semibold transition-transform active:scale-95"><i class="fas fa-plus mr-1"></i> New</button>
                </h3>
                <div class="space-y-3">
                    ${config.stores.map(s => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                        const closeStr = s.closingDate ? s.closingDate.substring(0, 10) : "";
                        const isPastDate = s.closingDate ? todayStr > closeStr : false;
                        const actuallyOpen = s.isOpen && !isPastDate;
                        const statusText = isPastDate ? 'CLOSED (Past Date)' : (s.isOpen ? 'OPEN' : 'CLOSED');
                        return `
                        <div class="border border-gray-400 dark:border-gray-800 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${actuallyOpen ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-red-50/50 dark:bg-red-900/10'}">
                            <div class="w-full sm:w-auto flex-1 pr-2">
                                <h4 class="font-semibold text-gray-900 dark:text-gray-100 leading-tight">${escapeHTML(s.name)}</h4>
                                <p class="text-xs mt-1 text-gray-700">Status: <span class="font-bold ${actuallyOpen ? 'text-green-600 dark:text-green-400' : 'text-red-500'}">${statusText}</span></p>
                            </div>
                            <div class="w-full sm:w-auto flex justify-end gap-2 text-sm shrink-0 items-center">
                                <button onclick="toggleStoreStatus('${s.id}', ${!s.isOpen})" class="bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">${s.isOpen ? 'Set Closed' : 'Set Open'}</button>
                                <button onclick="Router.navigate('admin_manage_store', {id: '${s.id}'})" class="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-1.5 rounded-lg font-semibold transition-transform active:scale-95">Manage</button>
                                <button onclick="promptDeleteEvent('${s.id}', '${escapeHTML(s.name).replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-red-500 transition-colors p-2 ml-1" title="Delete Event"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
            
            <div id="adminWorkArea"></div>
        </div>
    `;
}

async function promptDeleteEvent(eventId, eventName) {
    const div = document.createElement('div');
    div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60';
    div.innerHTML = `
        <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
            <h3 class="text-lg font-bold mb-3 text-red-600">Delete Event</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">You are about to delete <strong>${eventName}</strong>.</p>
            <p class="text-xs text-gray-500 mb-4">This action cannot be undone. To confirm, type <strong>delete</strong> below:</p>
            <input type="text" id="delete-confirm-input" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-red-500 mb-6" placeholder="Type delete here">
            <div class="flex justify-end gap-3">
                <button class="flex-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold" id="cd-cancel">Cancel</button>
                <button class="flex-1 bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed transition-colors" id="cd-ok" disabled>Delete Event</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    const input = document.getElementById('delete-confirm-input');
    const okBtn = document.getElementById('cd-ok');

    input.addEventListener('input', (e) => {
        if (e.target.value === 'delete') {
            okBtn.disabled = false;
            okBtn.classList.remove('bg-gray-300', 'cursor-not-allowed');
            okBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            okBtn.disabled = true;
            okBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
            okBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        }
    });

    document.getElementById('cd-cancel').onclick = () => { div.remove(); };
    okBtn.onclick = async () => { 
        div.remove(); 
        await apiCall('ADMIN_DELETE_EVENT', { eventId });
        renderAdminDashboard(document.getElementById('app-container'), true);
    };
}

async function createNewStorePrompt() {
    const name = prompt("Enter new store name:");
    if(name) {
        await apiCall('ADMIN_CREATE_STORE', { name });
        renderAdminDashboard(document.getElementById('app-container'), true);
    }
}

async function toggleStoreStatus(storeId, isOpen) {
    State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload: { id: storeId, isOpen } });
    saveState();
    renderAdminDashboard(document.getElementById('app-container'), true);
}

// Store Management UI
function renderAdminProductsList(products, storeId) {
    return products.map((p, index) => `
        <div class="flex items-center gap-3 border border-gray-400 dark:border-gray-800 p-2.5 rounded-xl bg-white dark:bg-[#111] product-item" data-id="${p.id}">
            <div class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1 py-2">
                <i class="fas fa-grip-vertical"></i>
            </div>
            ${p.imageId ? `<img src="https://lh3.googleusercontent.com/d/${p.imageId}" class="w-12 h-12 object-cover rounded-lg">` : ''}
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-gray-900 dark:text-gray-100 break-words">${escapeHTML(p.name)}</p>
                ${p.description ? `<p class="text-xs text-gray-700 dark:text-gray-400 line-clamp-1 mt-0.5 break-words">${escapeHTML(p.description)}</p>` : ''}
                <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">$${p.price.toFixed(2)}</p>
            </div>
            <button onclick="adminDeleteProduct('${storeId}', '${escapeHTML(p.id).replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-red-500 transition-colors p-2 ml-1"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

async function manageStore(storeId, initialTab = 'info') {
    const config = State.masterConfig.stores.find(s => s.id === storeId);
    const area = document.getElementById('app-container');
    window.scrollTo(0, 0);
    
    // Fetch products and orders
    const [products, orders] = await Promise.all([
        apiCall('GET_STORE', { eventId: storeId }),
        apiCall('ADMIN_GET_ORDERS', { eventId: storeId })
    ]);
    
    State.ordersCache = orders;
    State.productsCache = products;

    area.innerHTML = `
        <div class="p-3 md:p-4 fade-in pb-16">
            <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-3">
                    <button onclick="Router.navigate('admin_dashboard')" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                        <i class="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h2 class="text-xl md:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Managing: ${config.name}</h2>
                </div>
            </div>
            <div class="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-400 dark:border-gray-800 mb-6">
                <!-- TABS -->
                <div class="flex overflow-x-auto border-b border-gray-400 dark:border-gray-800 mb-4 text-sm font-semibold hide-scrollbar">
                    <button onclick="switchAdminTab('info')" id="tab-info" class="shrink-0 px-4 py-2 text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white transition-colors">Info & Settings</button>
                    <button onclick="switchAdminTab('products')" id="tab-products" class="shrink-0 px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Products</button>
                    <button onclick="switchAdminTab('orders')" id="tab-orders" class="shrink-0 px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Orders</button>
                    <button onclick="switchAdminTab('summary')" id="tab-summary" class="shrink-0 px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Summary</button>
                </div>

            <!-- SETTINGS TAB -->
            <div id="panel-info" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Fundraiser Name</label>
                    <input type="text" id="stName" value="${config.name || ''}" class="w-full p-2.5 border border-gray-400 dark:border-gray-800 rounded-lg dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Closing Date</label>
                    <input type="date" id="stClose" value="${config.closingDate ? config.closingDate.split('T')[0] : ''}" class="w-full p-2.5 border border-gray-400 dark:border-gray-800 rounded-lg dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">PayNow Number</label>
                    <input type="text" id="stPaynow" value="${config.paynowNumber || ''}" class="w-full p-2.5 border border-gray-400 dark:border-gray-800 rounded-lg dark:bg-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Banner Image (Will overwrite existing)</label>
                    <input type="file" id="stBanner" accept="image/*" class="w-full text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300">
                </div>
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Info Rich Text</label>
                    <div class="border border-gray-400 dark:border-gray-800 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 dark:focus-within:ring-gray-100 transition-all">
                        <div id="stInfo" class="min-h-[120px] text-sm dark:bg-[#1a1a1a] bg-white">${config.infoHtml || ''}</div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Email Intro</label>
                    <textarea id="stEmailIn" class="w-full p-2.5 border border-gray-400 dark:border-gray-800 rounded-lg text-sm dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 transition-all overflow-hidden resize-none">${config.emailIntro || ''}</textarea>
                </div>
                <button onclick="saveStoreSettings('${storeId}')" class="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-2.5 rounded-lg font-bold shadow-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors active:scale-95">Save Settings</button>
            </div>

            <!-- PRODUCTS TAB -->
            <div id="panel-products" class="hidden">
                <div class="bg-gray-50 dark:bg-[#1a1a1a] p-3 md:p-4 rounded-xl border border-gray-400 dark:border-gray-800 mb-4">
                    <h4 class="font-bold text-sm mb-3">Products' Summary List Image / File</h4>
                    ${config.summaryFileId ? `
                        <div class="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex justify-between items-center">
                            <span class="text-xs text-green-600 dark:text-green-400 font-bold"><i class="fas fa-check-circle mr-1"></i> Current: ${config.summaryFileName || 'File uploaded'}</span>
                            <button onclick="adminRemoveSummaryFile('${storeId}')" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fas fa-trash"></i> Remove</button>
                        </div>
                    ` : ''}
                    <div class="mb-3 relative">
                        <label id="summaryFileLabel" for="summaryFile" class="block w-full text-center p-2 border border-dashed border-gray-400 rounded-lg cursor-pointer text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Choose Products' Summary List Image / File</label>
                        <input type="file" id="summaryFile" accept="image/*,application/pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="document.getElementById('summaryFileLabel').textContent = this.files[0] ? this.files[0].name : 'Choose Products\' Summary List Image / File'">
                    </div>
                    <button onclick="adminUploadSummaryFile('${storeId}')" class="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 hover:bg-blue-700">Upload File</button>
                </div>
                <div class="bg-gray-50 dark:bg-[#1a1a1a] p-3 md:p-4 rounded-xl border border-gray-400 dark:border-gray-800 mb-4">
                    <h4 class="font-bold text-sm mb-3">Add Product</h4>
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" id="pName" placeholder="Name" class="w-full p-2 border border-gray-400 dark:border-gray-700 rounded-lg text-sm dark:bg-[#222]">
                        <input type="number" id="pPrice" placeholder="Price" class="w-full p-2 border border-gray-400 dark:border-gray-700 rounded-lg text-sm dark:bg-[#222]">
                    </div>
                    <input type="text" id="pDesc" placeholder="Description" class="w-full p-2 border border-gray-400 dark:border-gray-700 rounded-lg mb-2 text-sm dark:bg-[#222]">
                    <div class="mb-3 relative">
                        <label for="pImg" class="block w-full text-center p-2 border border-dashed border-gray-400 rounded-lg cursor-pointer text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Choose Product Image</label>
                        <input type="file" id="pImg" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="this.previousElementSibling.textContent = this.files[0] ? this.files[0].name : 'Choose Product Image'">
                    </div>
                    <button onclick="adminAddProduct('${storeId}')" class="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95">Add Item</button>
                </div>
                <div id="adminProductsList" class="space-y-2">
                    ${renderAdminProductsList(products, storeId)}
                </div>
            </div>

            <!-- ORDERS TAB -->
            <div id="panel-orders" class="hidden">
                <div class="relative mb-4 flex gap-2">
                    <div class="relative flex-1">
                        <i class="fas fa-search absolute left-3 top-3.5 text-gray-400 text-sm"></i>
                        <input type="text" id="orderSearch" onkeyup="filterAdminOrders()" placeholder="Search Name, Phone, ID..." class="w-full px-9 py-3 border border-gray-400 dark:border-gray-800 rounded-lg text-sm dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                        <button onclick="document.getElementById('orderSearch').value=''; filterAdminOrders();" class="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Clear Search"><i class="fas fa-times"></i></button>
                    </div>
                    <select id="orderFilter" onchange="filterAdminOrders()" class="p-3 border border-gray-400 dark:border-gray-800 rounded-lg text-sm dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all w-32 shrink-0">
                        <option value="all">All</option>
                        <option value="not_collected">Not Collected</option>
                        <option value="collected">Collected</option>
                    </select>
                </div>
                <div id="ordersList" class="space-y-3 h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    ${renderOrderList(orders, storeId)}
                </div>
            </div>

            <!-- SUMMARY TAB -->
            <div id="panel-summary" class="hidden">
                ${renderAdminSummary(orders, products)}
            </div>
        </div>
        </div>
    `;

    setTimeout(() => {
        // Initialize Quill Rich Text
        window.quillEditor = new Quill('#stInfo', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'font': [] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['emoji'],
                    ['clean']
                ],
                "emoji-toolbar": true,
                "emoji-shortname": true,
            }
        });

        // Setup Auto-expanding Textarea
        const emailIn = document.getElementById('stEmailIn');
        if(emailIn) {
            const autoExpand = function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            };
            emailIn.addEventListener('input', autoExpand);
            autoExpand.call(emailIn);
        }
        
        // Setup Sortable for products
        const productsListEl = document.getElementById('adminProductsList');
        if (productsListEl && window.Sortable) {
            new Sortable(productsListEl, {
                handle: '.drag-handle',
                animation: 150,
                onEnd: async function (evt) {
                    // Update cache array
                    const itemEl = evt.item;
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    if (oldIndex === newIndex) return;
                    
                    const movedItem = State.productsCache.splice(oldIndex, 1)[0];
                    State.productsCache.splice(newIndex, 0, movedItem);
                    
                    // Save array of IDs in the new order
                    const productIds = State.productsCache.map(p => p.id);
                    await apiCall('ADMIN_REORDER_PRODUCTS', { eventId: storeId, productIds }, true);
                }
            });
        }
        
        switchAdminTab(initialTab);
    }, 50);
}

function switchAdminTab(tab) {
    ['info', 'products', 'orders', 'summary'].forEach(t => {
        document.getElementById(`tab-${t}`).className = `shrink-0 px-4 py-3 font-semibold transition-colors ${t===tab ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white' : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`;
        document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== tab);

    });
}

// Image compressor helper
function compressImage(file, maxSize = 800) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = (h/w)*maxSize; w = maxSize; }
                    else { w = (w/h)*maxSize; h = maxSize; }
                }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function saveStoreSettings(id) {
    const bannerInput = document.getElementById('stBanner');
    let imageBase64 = null, mimeType = null;
    if (bannerInput.files.length > 0) {
        imageBase64 = await compressImage(bannerInput.files[0], 1200);
        mimeType = 'image/jpeg';
    }

    let infoHtml = '';
    const stInfo = document.getElementById('stInfo');
    if (window.quillEditor) {
        infoHtml = window.quillEditor.root.innerHTML;
    } else if (stInfo) {
        infoHtml = stInfo.innerHTML;
    }

    const payload = {
        id,
        name: document.getElementById('stName').value,
        closingDate: document.getElementById('stClose').value,
        paynowNumber: document.getElementById('stPaynow').value,
        infoHtml: infoHtml,
        emailIntro: document.getElementById('stEmailIn').value
    };
    if (imageBase64) {
        payload.imageBase64 = imageBase64;
        payload.mimeType = mimeType;
    }
    
    State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload });
    saveState();
    renderAdminDashboard(document.getElementById('app-container'), true);
}

async function adminUploadSummaryFile(eventId) {
    const fileInput = document.getElementById('summaryFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        customAlert('Please select a file first.');
        return;
    }
    const file = fileInput.files[0];
    const isPdf = file.type === 'application/pdf';
    let summaryFileBase64 = null;
    let summaryFileMimeType = file.type;
    
    if (isPdf) {
        summaryFileBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    } else {
        summaryFileBase64 = await compressImage(file, 800);
        summaryFileMimeType = 'image/jpeg';
    }
    
    State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload: { id: eventId, summaryFileBase64, summaryFileMimeType, summaryFileName: file.name } });
    saveState();
    manageStore(eventId, 'products');
}

async function adminRemoveSummaryFile(eventId) {
    if(await customConfirm("Remove summary file?")) {
        State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload: { id: eventId, removeSummaryFile: true } });
        saveState();
        manageStore(eventId, 'products');
    }
}

async function adminAddProduct(eventId) {
    const fileInput = document.getElementById('pImg');
    let imageBase64 = null, mimeType = null;
    if (fileInput.files.length > 0) {
        imageBase64 = await compressImage(fileInput.files[0], 500); // Smaller for product thumbnail
        mimeType = 'image/jpeg';
    }
    const product = {
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        description: document.getElementById('pDesc').value,
        imageBase64, mimeType
    };
    await apiCall('ADMIN_SAVE_PRODUCT', { eventId, product });
    manageStore(eventId, 'products'); // reload section and stay on tab
}

async function adminDeleteProduct(eventId, productId) {
    if(await customConfirm("Delete item?")) {
        await apiCall('ADMIN_DELETE_PRODUCT', { eventId, productId });
        State.productsCache = State.productsCache.filter(p => p.id !== productId);
        document.getElementById('adminProductsList').innerHTML = renderAdminProductsList(State.productsCache, eventId);
    }
}



function renderOrderList(orders, storeId) {
    if(!orders || orders.length === 0) return '<p class="text-sm text-gray-700 dark:text-gray-400">No orders.</p>';
    return orders.map(o => `
        <div class="border p-3.5 sm:p-4 rounded-xl dark:border-gray-700 bg-gray-50 dark:bg-gray-900 order-card mb-3" data-id="${escapeHTML(o.orderId)}" data-search="${escapeHTML(o.customer).toLowerCase()} ${escapeHTML(o.contact)} ${escapeHTML(o.orderId).toLowerCase()}" data-status="${escapeHTML(o.status || 'Not Collected')}">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2.5 gap-2">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-base text-gray-900 dark:text-gray-100 break-words">${escapeHTML(o.customer)}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">${escapeHTML(o.orderId)}</p>
                    ${o.custType ? `<p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-bold break-words">${escapeHTML(o.custType)} ${o.custRelationName ? `(${escapeHTML(o.custRelationName)})` : ''}</p>` : ''}
                    <div class="flex gap-2 mt-2.5 flex-wrap">
                        <a href="https://wa.me/65${escapeHTML(o.contact).replace(/\D/g, '')}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"><i class="fab fa-whatsapp text-sm"></i> Msg / Call</a>
                        <button onclick="navigator.clipboard.writeText('${escapeHTML(o.contact).replace(/'/g, "\\'")}'); customAlert('Phone number copied!');" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"><i class="fas fa-copy"></i> Copy Phone</button>
                    </div>
                </div>
                <div class="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-800 sm:shrink-0">
                    <p class="font-bold text-blue-600 text-lg sm:text-xl">$${o.total.toFixed(2)}</p>
                    <label id="payment-badge-${escapeHTML(o.orderId)}" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all shadow-sm ${o.paymentConfirmed ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-600 ring-1 ring-emerald-400/30' : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/60 dark:hover:bg-amber-950/60'}">
                        <input type="checkbox" class="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer" ${o.paymentConfirmed ? 'checked' : ''} onchange="updateOrdPaymentStatus('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}', this.checked)">
                        <span class="select-none font-bold">${o.paymentConfirmed ? '✓ Payment Confirmed' : 'Payment Confirmed'}</span>
                    </label>
                </div>
            </div>
            <ul class="text-xs text-gray-700 dark:text-gray-300 my-2.5 list-disc pl-4 space-y-1 bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-gray-200 dark:border-gray-800 break-words">
                ${o.items.map(i => `<li class="break-words">${i.qty}x ${escapeHTML(i.name)}</li>`).join('')}
            </ul>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                <label class="text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="status_${escapeHTML(o.orderId)}" value="Not Collected" ${o.status !== 'Collected' ? 'checked' : ''} onchange="updateOrdStatus('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}', 'Not Collected')">
                    <span class="text-red-500">Not Collected</span>
                </label>
                <label class="text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="status_${escapeHTML(o.orderId)}" value="Collected" ${o.status === 'Collected' ? 'checked' : ''} onchange="updateOrdStatus('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}', 'Collected')">
                    <span class="text-green-500">Collected</span>
                </label>
                ${o.imageUrl && o.imageUrl !== 'No Image' ? `<a href="${escapeHTML(o.imageUrl)}" target="_blank" class="text-xs text-blue-500 hover:text-blue-600 font-bold ml-auto mr-3">View Receipt</a>` : '<span class="ml-auto"></span>'}
                <button onclick="adminResendEmail('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-blue-500 transition-colors mr-3" title="Resend Email"><i class="fas fa-envelope text-sm"></i></button>
                <button onclick="adminEditOrderModal('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-blue-500 transition-colors mr-3" title="Edit Order"><i class="fas fa-edit text-sm"></i></button>
                <button onclick="adminDeleteOrder('${storeId}', '${escapeHTML(o.orderId).replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Delete Order"><i class="fas fa-trash text-sm"></i></button>
            </div>
        </div>
    `).join('');
}

function filterAdminOrders() {
    const term = document.getElementById('orderSearch').value.toLowerCase();
    const filter = document.getElementById('orderFilter').value;
    document.querySelectorAll('.order-card').forEach(card => {
        const matchesSearch = card.getAttribute('data-search').includes(term);
        const status = card.getAttribute('data-status');
        
        let matchesFilter = true;
        if (filter === 'collected' && status !== 'Collected') matchesFilter = false;
        if (filter === 'not_collected' && status === 'Collected') matchesFilter = false;

        card.style.display = (matchesSearch && matchesFilter) ? 'block' : 'none';
    });
}

function renderAdminSummary(orders, products) {
    if(!orders || orders.length === 0) return '<p class="text-sm text-gray-700 dark:text-gray-400">No orders yet.</p>';
    
    let totalRevenue = 0;
    const itemStats = {};
    
    orders.forEach(o => {
        totalRevenue += o.total;
        o.items.forEach(item => {
            if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0 };
            itemStats[item.name].qty += item.qty;
            itemStats[item.name].revenue += item.total;
        });
    });
    
    let topSelling = { name: '-', qty: 0 };
    Object.keys(itemStats).forEach(name => {
        if (itemStats[name].qty > topSelling.qty) {
            topSelling = { name, qty: itemStats[name].qty };
        }
    });
    
    const breakdownHtml = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-gray-300 dark:border-gray-700">
                    <th class="p-3 text-xs uppercase text-gray-700 dark:text-gray-300 font-bold">Item</th>
                    <th class="p-3 text-xs uppercase text-gray-700 dark:text-gray-300 font-bold text-right">Price</th>
                    <th class="p-3 text-xs uppercase text-gray-700 dark:text-gray-300 font-bold text-right">Sold</th>
                    <th class="p-3 text-xs uppercase text-gray-700 dark:text-gray-300 font-bold text-right">Revenue</th>
                </tr>
            </thead>
            <tbody>
                ${Object.keys(itemStats).map(name => {
                    const price = (itemStats[name].revenue / itemStats[name].qty).toFixed(2);
                    return `
                    <tr class="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td class="p-3 text-sm font-semibold text-gray-900 dark:text-gray-100">${name}</td>
                        <td class="p-3 text-sm text-gray-700 dark:text-gray-400 text-right">$${price}</td>
                        <td class="p-3 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">${itemStats[name].qty}</td>
                        <td class="p-3 text-sm font-bold text-green-700 dark:text-green-400 text-right">$${itemStats[name].revenue.toFixed(2)}</td>
                    </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    `;

    return `
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-400 dark:border-gray-800">
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Revenue</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-500">$${totalRevenue.toFixed(2)}</p>
            </div>
            <div class="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-400 dark:border-gray-800">
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Orders</p>
                <p class="text-2xl font-bold text-blue-600 dark:text-blue-500">${orders.length}</p>
            </div>
        </div>
        <div class="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-400 dark:border-gray-800 mb-6">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Top Selling Item</p>
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">${topSelling.name} <span class="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">(${topSelling.qty} units)</span></p>
        </div>
        
        <h4 class="font-bold text-sm mb-3 text-gray-900 dark:text-gray-100">Item Breakdown</h4>
        <div class="bg-white dark:bg-[#111] rounded-xl border border-gray-400 dark:border-gray-800 overflow-hidden">
            ${breakdownHtml}
        </div>
    `;
}

async function updateOrdPaymentStatus(eventId, orderId, isConfirmed) {
    const badge = document.getElementById(`payment-badge-${orderId}`);
    if (badge) {
        const textSpan = badge.querySelector('span');
        if (isConfirmed) {
            badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all shadow-sm bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-600 ring-1 ring-emerald-400/30";
            if (textSpan) textSpan.textContent = "✓ Payment Confirmed";
        } else {
            badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all shadow-sm bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/60 dark:hover:bg-amber-950/60";
            if (textSpan) textSpan.textContent = "Payment Confirmed";
        }
    }
    await apiCall('ADMIN_UPDATE_ORDER_PAYMENT', { eventId, orderId, isConfirmed }, true);
    const idx = State.ordersCache.findIndex(o => o.orderId === orderId);
    if(idx > -1) State.ordersCache[idx].paymentConfirmed = isConfirmed;
}

async function updateOrdStatus(eventId, orderId, status) {
    await apiCall('ADMIN_UPDATE_ORDER', { eventId, orderId, status }, true);
    const idx = State.ordersCache.findIndex(o => o.orderId === orderId);
    if(idx > -1) State.ordersCache[idx].status = status;
    
    // Update the specific card's data-status for filtering without re-rendering everything
    const card = document.querySelector(`.order-card[data-id="${orderId}"]`);
    if (card) card.setAttribute('data-status', status);
    
    filterAdminOrders();
}

async function adminDeleteOrder(eventId, orderId) {
    if(!await customConfirm('Are you sure you want to permanently delete this order? It will be moved to the "Deleted Orders" tab in your Google Sheet.')) return;
    await apiCall('ADMIN_DELETE_ORDER', { eventId, orderId });
    // Remove from cache
    State.ordersCache = State.ordersCache.filter(x => x.orderId !== orderId);
    
    // Remove from DOM to prevent scrolling issues
    const card = document.querySelector(`.order-card[data-id="${orderId}"]`);
    if (card) {
        card.remove();
        if (State.ordersCache.length === 0) {
            document.getElementById('ordersList').innerHTML = '<p class="text-sm text-gray-700 dark:text-gray-400">No orders.</p>';
        }
    } else {
        document.getElementById('ordersList').innerHTML = renderOrderList(State.ordersCache, eventId);
    }
    
    filterAdminOrders();
    
    const panelSummary = document.getElementById('panel-summary');
    if (panelSummary) {
        panelSummary.innerHTML = renderAdminSummary(State.ordersCache, State.productsCache);
    }
}

async function adminResendEmail(eventId, orderId) {
    if (await customConfirm("Resend confirmation email to this customer?")) {
        const res = await apiCall('ADMIN_RESEND_EMAIL', { eventId, orderId });
        if (res && res.emailStatus && res.emailStatus === 'Sent') {
            customAlert("Email sent successfully!");
        } else {
            customAlert("Failed to send email: " + (res.emailStatus || "Unknown error"));
        }
    }
}

// Initial Boot
Router.init();

function adminEditOrderModal(eventId, orderId) {
    const order = State.ordersCache.find(o => o.orderId === orderId);
    if (!order) return;

    // Build product list (combining active products and items already in the order)
    const allProductsMap = new Map();
    State.productsCache.forEach(p => {
        allProductsMap.set(p.name, { price: p.price, name: p.name });
    });
    order.items.forEach(i => {
        if (!allProductsMap.has(i.name)) {
            allProductsMap.set(i.name, { price: i.price, name: i.name });
        }
    });
    const allProducts = Array.from(allProductsMap.values());

    // Build the modal HTML
    const div = document.createElement('div');
    div.id = 'editOrderModal';
    div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60';
    
    let productsHtml = allProducts.map(p => {
        const existingItem = order.items.find(i => i.name === p.name);
        const qty = existingItem ? existingItem.qty : 0;
        return `
            <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <div class="flex flex-col">
                    <span class="text-sm font-bold">${escapeHTML(p.name)}</span>
                    <span class="text-xs text-gray-500">$${p.price.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" class="bg-gray-200 dark:bg-gray-800 rounded px-2 text-sm" onclick="this.nextElementSibling.value = Math.max(0, parseInt(this.nextElementSibling.value) - 1)">-</button>
                    <input type="number" class="edit-qty-input w-12 text-center bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded text-sm" data-name="${escapeHTML(p.name).replace(/"/g, '&quot;')}" data-price="${p.price}" value="${qty}" min="0">
                    <button type="button" class="bg-gray-200 dark:bg-gray-800 rounded px-2 text-sm" onclick="this.previousElementSibling.value = parseInt(this.previousElementSibling.value) + 1">+</button>
                </div>
            </div>
        `;
    }).join('');

    div.innerHTML = `
        <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto relative">
            <h3 class="text-lg font-bold mb-4">Edit Order: ${escapeHTML(order.orderId)}</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Customer Name</label>
                    <input type="text" id="edit-customer" value="${escapeHTML(order.customer).replace(/"/g, '&quot;')}" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Contact (Phone)</label>
                    <input type="text" id="edit-contact" value="${escapeHTML(order.contact).replace(/"/g, '&quot;')}" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Email</label>
                    <input type="email" id="edit-email" value="${escapeHTML(order.email || '').replace(/"/g, '&quot;')}" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Customer Type</label>
                    <select id="edit-custType" onchange="handleAdminEditCustType()" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900">
                        <option value="">Select...</option>
                        <option value="Volunteer" ${order.custType === 'Volunteer' ? 'selected' : ''}>Volunteer</option>
                        <option value="Friend of Volunteer" ${order.custType === 'Friend of Volunteer' ? 'selected' : ''}>Friend of Volunteer</option>
                        <option value="Caregiver" ${order.custType === 'Caregiver' ? 'selected' : ''}>Caregiver</option>
                        <option value="Public" ${order.custType === 'Public' ? 'selected' : ''}>Public</option>
                    </select>
                </div>
                <div id="edit-relationContainer" class="${(order.custType === 'Friend of Volunteer' || order.custType === 'Caregiver') ? '' : 'hidden'}">
                    <label id="edit-relationLabel" class="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">${order.custType === 'Caregiver' ? "Trainee's Name" : "Volunteer's Name"}</label>
                    <input type="text" id="edit-relation" value="${escapeHTML(order.custRelationName || '').replace(/"/g, '&quot;')}" class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900">
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-bold mb-2 border-b pb-1 dark:border-gray-800">Order Items</label>
                    <div class="max-h-40 overflow-y-auto">
                        ${productsHtml}
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
                <button class="flex-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold" onclick="document.getElementById('editOrderModal').remove()">Cancel</button>
                <button class="flex-1 bg-gray-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold" onclick="submitAdminEditOrder('${eventId}', '${orderId}')">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

window.handleAdminEditCustType = function() {
    const val = document.getElementById('edit-custType').value;
    const container = document.getElementById('edit-relationContainer');
    const label = document.getElementById('edit-relationLabel');
    if (val === 'Friend of Volunteer') {
        container.classList.remove('hidden');
        label.innerText = "Volunteer's Name";
    } else if (val === 'Caregiver') {
        container.classList.remove('hidden');
        label.innerText = "Trainee's Name";
    } else {
        container.classList.add('hidden');
        document.getElementById('edit-relation').value = '';
    }
};

async function submitAdminEditOrder(eventId, orderId) {
    const customer = document.getElementById('edit-customer').value;
    const contact = document.getElementById('edit-contact').value;
    const email = document.getElementById('edit-email').value;
    const custType = document.getElementById('edit-custType').value;
    const custRelationName = document.getElementById('edit-relation').value;
    
    if(!customer || !contact) {
        customAlert("Name and Contact are required.");
        return;
    }

    const items = [];
    let total = 0;
    document.querySelectorAll('.edit-qty-input').forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const name = input.getAttribute('data-name');
            const price = parseFloat(input.getAttribute('data-price'));
            const itemTotal = price * qty;
            items.push({ name, price, qty, total: itemTotal });
            total += itemTotal;
        }
    });

    if (items.length === 0) {
        customAlert("Order must have at least one item.");
        return;
    }

    const updatedData = { customer, contact, email, custType, custRelationName, items, total };

    document.getElementById('editOrderModal').remove();
    try {
        await apiCall('ADMIN_EDIT_ORDER', { eventId, orderId, updatedData });
        
        // Update cache
        const idx = State.ordersCache.findIndex(o => o.orderId === orderId);
        if (idx > -1) {
            State.ordersCache[idx].customer = customer;
            State.ordersCache[idx].contact = contact;
            State.ordersCache[idx].email = email;
            State.ordersCache[idx].custType = custType;
            State.ordersCache[idx].custRelationName = custRelationName;
            State.ordersCache[idx].items = items;
            State.ordersCache[idx].total = total;
        }
        
        // Render
        document.getElementById('ordersList').innerHTML = renderOrderList(State.ordersCache, eventId);
        filterAdminOrders();
        
        const panelSummary = document.getElementById('panel-summary');
        if (panelSummary) {
            panelSummary.innerHTML = renderAdminSummary(State.ordersCache, State.productsCache);
        }
        
        customAlert("Order updated successfully!");
    } catch(e) {
        console.error(e);
    }
}
