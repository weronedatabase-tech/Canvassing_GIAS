import fs from 'fs';
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

const escapeFn = `
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
`;

// Insert it right after initTheme()
code = code.replace(/initTheme\(\);\n/, 'initTheme();\n' + escapeFn + '\n');

fs.writeFileSync('frontend/js/app.js', code);
