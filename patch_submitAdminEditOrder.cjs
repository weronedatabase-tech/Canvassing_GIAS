const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const editConfirmPromptHelper = `
function editConfirmPrompt(isPaid) {
    return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60';
        div.innerHTML = \`
            <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
                <h3 class="text-lg font-bold mb-3">Save Changes</h3>
                <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">How would you like to notify the customer about this update?</p>
                <div class="flex flex-col gap-2">
                    \${isPaid ? '<button class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors" id="ec-send-confirmed">Send "Payment Confirmed" Email</button>' : ''}
                    <button class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors" id="ec-send-update">Send "Order Updated" Email</button>
                    <button class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors" id="ec-no-send">Do not send email</button>
                    <button class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-bold mt-2 transition-colors" id="ec-cancel">Cancel</button>
                </div>
            </div>
        \`;
        document.body.appendChild(div);
        if (isPaid) {
            document.getElementById('ec-send-confirmed').onclick = () => { div.remove(); resolve({ proceed: true, type: 'CONFIRMED' }); };
        }
        document.getElementById('ec-send-update').onclick = () => { div.remove(); resolve({ proceed: true, type: 'UPDATE' }); };
        document.getElementById('ec-no-send').onclick = () => { div.remove(); resolve({ proceed: true, type: 'NONE' }); };
        document.getElementById('ec-cancel').onclick = () => { div.remove(); resolve({ proceed: false }); };
    });
}
`;

if (!code.includes('function editConfirmPrompt')) {
    code = code.replace("function paymentConfirmPrompt", editConfirmPromptHelper + "\nfunction paymentConfirmPrompt");
}

const originalSubmit = `    const updatedData = { customer, contact, email, custType, custRelationName, items, total };

    document.getElementById('editOrderModal').remove();
    try {
        await apiCall('ADMIN_EDIT_ORDER', { eventId, orderId, updatedData });`;

const replacementSubmit = `    const idx = State.ordersCache.findIndex(o => o.orderId === orderId);
    const isPaid = idx > -1 && State.ordersCache[idx].paymentConfirmed;
    
    let sendEmailType = 'UPDATE';
    if (email && email.includes('@')) {
        const result = await editConfirmPrompt(isPaid);
        if (!result.proceed) return;
        sendEmailType = result.type;
    }

    const updatedData = { customer, contact, email, custType, custRelationName, items, total, sendEmailType };

    document.getElementById('editOrderModal').remove();
    try {
        showLoading(true, "Updating order...");
        await apiCall('ADMIN_EDIT_ORDER', { eventId, orderId, updatedData });
        showLoading(false);`;

code = code.replace(originalSubmit, replacementSubmit);
fs.writeFileSync('frontend/js/app.js', code);
