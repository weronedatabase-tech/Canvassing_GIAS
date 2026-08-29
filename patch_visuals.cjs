const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

// Fix 1: Hide header cart icon on store_info
code = code.replace(
    "document.getElementById('headerCartIcon').classList.toggle('hidden', !['store_info', 'store_shop'].includes(view));",
    "document.getElementById('headerCartIcon').classList.toggle('hidden', !['store_shop', 'cart'].includes(view));"
);

// Fix 2: Wrap text and prevent overflow in Cart Page
const cartItemRegex = /<div class="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded shadow">\s*<div>\s*<p class="font-bold">\$\{escapeHTML\(c\.name\)\}<\/p>/;
const replacement = `<div class="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded shadow gap-3">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold break-words">\${escapeHTML(c.name)}</p>`;
code = code.replace(cartItemRegex, replacement);

const counterRegex = /<div class="flex items-center bg-blue-50 dark:bg-gray-700 rounded border border-blue-100 dark:border-gray-600">/;
const counterReplacement = `<div class="flex items-center bg-blue-50 dark:bg-gray-700 rounded border border-blue-100 dark:border-gray-600 shrink-0">`;
code = code.replace(counterRegex, counterReplacement);

fs.writeFileSync('frontend/js/app.js', code);
