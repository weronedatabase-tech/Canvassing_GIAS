import fs from 'fs';
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(/o\.customer\.toLowerCase\(\)/g, "escapeHTML(o.customer).toLowerCase()");
code = code.replace(/o\.orderId\.toLowerCase\(\)/g, "escapeHTML(o.orderId).toLowerCase()");

code = code.replace(/\>\\$\\{o\.customer\\}\\</g, ">${escapeHTML(o.customer)}<");
code = code.replace(/\>\\$\\{o\.orderId\\}\\</g, ">${escapeHTML(o.orderId)}<");
code = code.replace(/\\$\\{o\.custType\\} \\$\\{o\.custRelationName \? \\\`\(\\\$\\{o\.custRelationName\\}\)\\\` \: \'\'\\}/g, "${escapeHTML(o.custType)} ${o.custRelationName ? `(${escapeHTML(o.custRelationName)})` : ''}");

// Items list
code = code.replace(/\\$\\{i\.qty\\}x \\$\\{i\.name\\}/g, "${i.qty}x ${escapeHTML(i.name)}");

fs.writeFileSync('frontend/js/app.js', code);
