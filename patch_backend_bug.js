import fs from 'fs';
let code = fs.readFileSync('backend/Code.js', 'utf8');

code = code.replace(/payload\.imageBase64\.split\(\',\',?\s*2?\s*\)\[1\]/g, "(payload.imageBase64.includes(',') ? payload.imageBase64.split(',')[1] : payload.imageBase64)");
code = code.replace(/payload\.summaryFileBase64\.split\(\',\',?\s*2?\s*\)\[1\]/g, "(payload.summaryFileBase64.includes(',') ? payload.summaryFileBase64.split(',')[1] : payload.summaryFileBase64)");
code = code.replace(/productData\.imageBase64\.split\(\',\',?\s*2?\s*\)\[1\]/g, "(productData.imageBase64.includes(',') ? productData.imageBase64.split(',')[1] : productData.imageBase64)");
code = code.replace(/data\.paymentProofBase64\.split\(\',\',?\s*2?\s*\)\[1\]/g, "(data.paymentProofBase64.includes(',') ? data.paymentProofBase64.split(',')[1] : data.paymentProofBase64)");

fs.writeFileSync('backend/Code.js', code);
