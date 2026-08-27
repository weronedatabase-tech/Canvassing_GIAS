const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

code = code.replace(
  /\$\{store\.summaryFileId \? \([\s\S]*?\) : ''\}/,
  `\${store.summaryImageId ? \`<img src="https://lh3.googleusercontent.com/d/\${store.summaryImageId}" class="w-full rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 object-contain max-h-[60vh]">\` : ''}
            \${store.summaryPdfId ? \`<a href="https://drive.google.com/file/d/\${store.summaryPdfId}/view" target="_blank" class="block w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-3 px-4 rounded-xl font-bold mb-6 text-center border border-blue-200 dark:border-blue-800 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"><i class="fas fa-file-pdf mr-2"></i> View \${store.summaryPdfName || 'Products Summary PDF'}</a>\` : ''}`
);

fs.writeFileSync('frontend/js/app.js', code);
