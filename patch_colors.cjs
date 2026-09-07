const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    \`<button disabled class="w-full bg-gray-300 text-gray-500 dark:bg-gray-800 dark:text-gray-500 py-3 rounded-xl font-bold text-lg mb-6 tracking-tight cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\`,
    \`<button disabled class="w-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300 py-3 rounded-xl font-bold text-lg mb-6 tracking-tight cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\`
);

code = code.replace(
    \`<button disabled class="w-full bg-gray-200 text-gray-500 dark:bg-gray-900 dark:text-gray-600 py-3 rounded-xl font-bold text-lg cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\`,
    \`<button disabled class="w-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300 py-3 rounded-xl font-bold text-lg cursor-not-allowed">Fund Raising has Ended. Thanks For Supporting!</button>\`
);

fs.writeFileSync('frontend/js/app.js', code);
