const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
    "else if (view === 'checkout') path = '/checkout';",
    "else if (view === 'checkout') path = '/checkout';\n        else if (view === 'payment') {\n            const qs = new URLSearchParams(params).toString();\n            path = `/payment?${qs}`;\n        }"
);

code = code.replace(
    "else if (view === 'checkout') await renderCheckout(container);",
    "else if (view === 'checkout') await renderCheckout(container);\n    else if (view === 'payment') await renderPaymentPage(container, params);"
);

fs.writeFileSync('frontend/js/app.js', code);
