const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const oldPaymentHTML = `<div class="bg-white dark:bg-gray-800 border-2 border-purple-800 p-4 rounded shadow relative">
                    <h3 class="font-bold mb-2">Payment Details</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><span class="font-bold text-purple-700 dark:text-purple-400 text-base">PayNow</span> using the QR code below. Screenshot this page to save QR code</p>
                    
                    <div class="flex items-center gap-4">`;

const newPaymentHTML = `<div class="bg-blue-50 dark:bg-blue-900/30 p-3 mb-4 rounded border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <i class="fas fa-info-circle mr-1"></i> If you lose this page, the QR code can still be found in the Order Summary sent to your email. You can also WhatsApp the payment screenshot to <strong>\${store.paynowNumber || 'the admin'}</strong>.
            </div>
            
            <form id="paymentForm" onsubmit="handlePaymentSubmit(event, '\${escapeHTML(params.orderId)}', '\${escapeHTML(params.name)}', '\${escapeHTML(params.email)}')" class="space-y-4">
                <div class="bg-white dark:bg-gray-800 border-2 border-purple-800 p-4 rounded shadow relative">
                    <h3 class="font-bold mb-2">Payment Details</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><span class="font-bold text-purple-700 dark:text-purple-400 text-base">PayNow</span> using the QR code below.</p>
                    
                    <div class="flex items-center gap-4">`;

code = code.replace(
    `<form id="paymentForm" onsubmit="handlePaymentSubmit(event, '\${escapeHTML(params.orderId)}', '\${escapeHTML(params.name)}', '\${escapeHTML(params.email)}')" class="space-y-4">
                <div class="bg-white dark:bg-gray-800 border-2 border-purple-800 p-4 rounded shadow relative">
                    <h3 class="font-bold mb-2">Payment Details</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><span class="font-bold text-purple-700 dark:text-purple-400 text-base">PayNow</span> using the QR code below. Screenshot this page to save QR code</p>
                    
                    <div class="flex items-center gap-4">`,
    newPaymentHTML
);

fs.writeFileSync('frontend/js/app.js', code);
