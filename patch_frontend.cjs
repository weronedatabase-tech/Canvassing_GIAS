const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const regexRenderCheckout = /async function renderCheckout\(container\).*?finalOrderId = getCheckoutOrderId\(store\.name\);[\s\S]*?renderQR\(store\.paynowNumber, getCartTotal\(\), finalOrderId\);\n}/;

const renderCheckoutReplacement = `async function renderCheckout(container) {
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    const finalOrderId = getCheckoutOrderId(store.name);

    container.innerHTML = \`
        <div class="p-4 fade-in pb-10">
            <h2 class="text-xl font-bold mb-4">Checkout</h2>
            
            <form id="checkoutForm" onsubmit="handleOrderSubmit(event)" class="space-y-4">
                
                <div class="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-400 dark:border-gray-700">
                    <h3 class="font-bold mb-3 border-b pb-2 dark:border-gray-700">1. Your Details</h3>
                    <div><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Full Name</label><input type="text" id="custName" required class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600"></div>
                    <div class="grid grid-cols-2 gap-3 mt-3">
                        <div><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">WhatsApp No.</label><input type="tel" id="custPhone" required pattern="^[89][0-9]{7}$" placeholder="8 digits" class="w-full p-2 border border-gray-400 rounded mt-1 dark:bg-gray-700 dark:border-gray-600"></div>
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

                <button type="submit" id="submitOrderBtn" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg">Place Order & Proceed to Payment</button>
            </form>
        </div>
    \`;
}`;

code = code.replace(regexRenderCheckout, renderCheckoutReplacement);

const regexHandleOrderSubmit = /async function handleOrderSubmit[\s\S]*?if \(res\.emailStatus && res\.emailStatus\.startsWith\("Failed"\)\) {\n        customAlert\("Order submitted, but failed to send confirmation email: " \+ res\.emailStatus\);\n    }\n    \n    Router\.navigate\('success', { orderId: res\.orderId, email: email, emailStatus: res\.emailStatus }\);\n}/;

const handleOrderSubmitReplacement = `async function handleOrderSubmit(e) {
    e.preventDefault();
    const phone = document.getElementById('custPhone').value;
    const name = document.getElementById('custName').value;
    const email = document.getElementById('custEmail').value;
    const custType = document.getElementById('custType').value;
    const custRelationName = document.getElementById('custRelationName').value;
    
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    const finalOrderId = getCheckoutOrderId(store.name);

    const payload = {
        orderId: finalOrderId,
        customerName: name, contact: phone, email: email,
        custType: custType, custRelationName: custRelationName,
        cart: State.cart, totalAmount: parseFloat(getCartTotal()),
        paymentProofBase64: null, mimeType: null
    };

    const res = await apiCall('SUBMIT_ORDER', { eventId: State.activeStoreId, order: payload });
    
    // Do not clear cart yet in case they press back? Actually, we can clear it because the order is placed.
    const cartTotal = getCartTotal();
    State.cart = [];
    updateCartCount();
    saveState();
    
    Router.navigate('payment', { orderId: res.orderId, email: email, amount: cartTotal, name: name });
}`;

code = code.replace(regexHandleOrderSubmit, handleOrderSubmitReplacement);

const newFunctions = `
async function renderPaymentPage(container, params) {
    const store = State.masterConfig.stores.find(s => s.id === State.activeStoreId);
    
    container.innerHTML = \`
        <div class="p-4 fade-in pb-10">
            <h2 class="text-xl font-bold mb-4">Complete Payment</h2>
            
            <form id="paymentForm" onsubmit="handlePaymentSubmit(event, '\${escapeHTML(params.orderId)}', '\${escapeHTML(params.name)}', '\${escapeHTML(params.email)}')" class="space-y-4">
                <div class="bg-white dark:bg-gray-800 border-2 border-purple-800 p-4 rounded shadow relative">
                    <h3 class="font-bold mb-2">Payment Details</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><span class="font-bold text-purple-700 dark:text-purple-400 text-base">PayNow</span> using the QR code below. Screenshot this page to save QR code</p>
                    
                    <div class="flex items-center gap-4">
                        <canvas id="qrCanvas" class="w-32 h-32 bg-white p-1 rounded"></canvas>
                        <div>
                            <p class="text-sm">Pay: <span class="text-xl font-bold text-purple-700 dark:text-purple-400">$\${params.amount}</span></p>
                            <p class="text-sm">To: <span class="font-mono font-bold">\${store.paynowNumber || 'Not Set'}</span></p>
                            <p class="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded mt-1">Ref: <span id="qrRefDisplay" class="font-mono font-bold">\${escapeHTML(params.orderId)}</span></p>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-sm font-extrabold text-blue-700 dark:text-blue-400 uppercase mb-1">Upload Successful Payment Screenshot</label>
                        <input type="file" id="paymentProof" accept="image/*" required class="w-full text-sm">
                    </div>
                </div>
                
                <button type="submit" id="submitPaymentBtn" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg">Submit Payment Proof</button>
            </form>
        </div>
    \`;

    renderQR(store.paynowNumber, params.amount, params.orderId);
}

async function handlePaymentSubmit(e, orderId, name, email) {
    e.preventDefault();
    const fileInput = document.getElementById('paymentProof');
    
    let paymentProofBase64 = null, mimeType = null;
    if(fileInput.files.length > 0) {
        paymentProofBase64 = await compressImage(fileInput.files[0], 1000);
        mimeType = 'image/jpeg';
    }

    const res = await apiCall('UPDATE_ORDER_PROOF', { 
        eventId: State.activeStoreId, 
        orderId: orderId,
        customerName: name,
        email: email,
        paymentProofBase64, 
        mimeType 
    });
    
    sessionStorage.removeItem('currentOrderRef');
    
    if (res.emailStatus && res.emailStatus.startsWith("Failed")) {
        customAlert("Payment submitted, but failed to send confirmation email: " + res.emailStatus);
    }
    
    Router.navigate('success', { orderId: orderId, email: email, emailStatus: res.emailStatus });
}
`;

code = code.replace("function checkPhoneForPayment(phone) {\n    const paymentSection = document.getElementById('paymentSection');\n    const submitBtn = document.getElementById('submitOrderBtn');\n    \n    if (/^[89]\\d{7}$/.test(phone)) {\n        paymentSection.classList.remove('hidden');\n        submitBtn.classList.remove('hidden');\n    } else {\n        paymentSection.classList.add('hidden');\n        submitBtn.classList.add('hidden');\n    }\n}", "");

code += "\n" + newFunctions;

fs.writeFileSync('frontend/js/app.js', code);
