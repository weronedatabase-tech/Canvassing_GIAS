const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

// 1. Fix line clamp in Shop UI (renderStore)
code = code.replace(
  /\<p class="text-xs text-gray-700 dark:text-gray-400 line-clamp-2 mt-1 break-words"\>\$\{escapeHTML\(p\.description \|\| ''\)\}\<\/p\>/g,
  '<p class="text-xs text-gray-700 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">${escapeHTML(p.description || \'\')}</p>'
);

// 2. Fix line clamp in Admin UI (renderAdminProductsList)
code = code.replace(
  /\<p class="text-xs text-gray-700 dark:text-gray-400 line-clamp-1 mt-0\.5 break-words"\>\$\{escapeHTML\(p\.description\)\}\<\/p\>/g,
  '<p class="text-xs text-gray-700 dark:text-gray-400 mt-0.5 break-words whitespace-pre-wrap">${escapeHTML(p.description)}</p>'
);

// 3. Update the description field in Admin Add Product to be a textarea
code = code.replace(
  /\<input type="text" id="pDesc" placeholder="Description" class="w-full p-2 border border-gray-400 dark:border-gray-700 rounded-lg mb-2 text-sm dark:bg-\[#222\]"\>/g,
  '<textarea id="pDesc" placeholder="Description" rows="1" class="w-full p-2 border border-gray-400 dark:border-gray-700 rounded-lg mb-2 text-sm dark:bg-[#222] resize-none overflow-hidden" oninput="this.style.height = \'auto\'; this.style.height = this.scrollHeight + \'px\'"></textarea>'
);

// 4. Update the "Products' Summary List Image / File" to have Image and PDF uploads separately
code = code.replace(
  /(\<h4 class="font-bold text-sm mb-3"\>Products' Summary List Image \/ File\<\/h4\>)[\s\S]*?(?=\<div class="bg-gray-50 dark:bg-\[#1a1a1a\] p-3 md:p-4 rounded-xl border border-gray-400 dark:border-gray-800 mb-4"\>\s*\<h4 class="font-bold text-sm mb-3"\>Add Product\<\/h4\>)/,
  `$1
                    \${config.summaryImageId ? \`
                        <div class="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex justify-between items-center gap-2">
                            <span class="text-xs text-green-600 dark:text-green-400 font-bold flex-1 min-w-0 break-all"><i class="fas fa-check-circle mr-1"></i> Image: \${escapeHTML(config.summaryImageName || 'Image uploaded')}</span>
                            <button onclick="adminRemoveSummaryFile('\${storeId}', 'image')" class="text-red-500 hover:text-red-700 text-xs font-bold shrink-0"><i class="fas fa-trash"></i> Remove</button>
                        </div>
                    \` : ''}
                    <div class="mb-3 relative">
                        <label id="summaryImageLabel" for="summaryImage" class="block w-full text-center p-3 px-4 border border-dashed border-gray-400 rounded-lg cursor-pointer text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors break-all overflow-hidden">Choose Products Summary Image</label>
                        <input type="file" id="summaryImage" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="document.getElementById('summaryImageLabel').textContent = this.files[0] ? this.files[0].name : 'Choose Products Summary Image'">
                    </div>
                    <button onclick="adminUploadSummaryFile('\${storeId}', 'image')" class="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 hover:bg-blue-700 mb-4">Upload Image</button>

                    \${config.summaryPdfId ? \`
                        <div class="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex justify-between items-center gap-2">
                            <span class="text-xs text-green-600 dark:text-green-400 font-bold flex-1 min-w-0 break-all"><i class="fas fa-check-circle mr-1"></i> PDF: \${escapeHTML(config.summaryPdfName || 'PDF uploaded')}</span>
                            <button onclick="adminRemoveSummaryFile('\${storeId}', 'pdf')" class="text-red-500 hover:text-red-700 text-xs font-bold shrink-0"><i class="fas fa-trash"></i> Remove</button>
                        </div>
                    \` : ''}
                    <div class="mb-3 relative">
                        <label id="summaryPdfLabel" for="summaryPdf" class="block w-full text-center p-3 px-4 border border-dashed border-gray-400 rounded-lg cursor-pointer text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors break-all overflow-hidden">Choose Products Summary PDF</label>
                        <input type="file" id="summaryPdf" accept="application/pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="document.getElementById('summaryPdfLabel').textContent = this.files[0] ? this.files[0].name : 'Choose Products Summary PDF'">
                    </div>
                    <button onclick="adminUploadSummaryFile('\${storeId}', 'pdf')" class="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 hover:bg-blue-700 mb-2">Upload PDF</button>
                </div>
                `
);

// Replace adminUploadSummaryFile and adminRemoveSummaryFile
code = code.replace(
  /async function adminUploadSummaryFile\(eventId\) \{[\s\S]*?(?=async function adminRemoveSummaryFile)/,
  `async function adminUploadSummaryFile(eventId, type) {
    const fileInput = document.getElementById(type === 'image' ? 'summaryImage' : 'summaryPdf');
    if (!fileInput.files || fileInput.files.length === 0) {
        customAlert('Please select a file first.');
        return;
    }
    const file = fileInput.files[0];
    let summaryFileBase64 = null;
    let summaryFileMimeType = file.type;
    
    if (type === 'pdf') {
        summaryFileBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    } else {
        summaryFileBase64 = await compressImage(file, 800);
        summaryFileMimeType = 'image/jpeg';
    }
    
    const payload = { id: eventId };
    if (type === 'image') {
        payload.summaryImageBase64 = summaryFileBase64;
        payload.summaryImageMimeType = summaryFileMimeType;
        payload.summaryImageName = file.name;
    } else {
        payload.summaryPdfBase64 = summaryFileBase64;
        payload.summaryPdfMimeType = summaryFileMimeType;
        payload.summaryPdfName = file.name;
    }
    
    State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload });
    saveState();
    manageStore(eventId, 'products');
}
`
);

code = code.replace(
  /async function adminRemoveSummaryFile\(eventId\) \{[\s\S]*?(?=async function adminCreateStore)/,
  `async function adminRemoveSummaryFile(eventId, type) {
    if(await customConfirm("Remove summary file?")) {
        const payload = { id: eventId };
        if (type === 'image') {
            payload.removeSummaryImage = true;
        } else {
            payload.removeSummaryPdf = true;
        }
        State.masterConfig = await apiCall('ADMIN_SAVE_STORE', { payload });
        saveState();
        manageStore(eventId, 'products');
    }
}
`
);

fs.writeFileSync('frontend/js/app.js', code);
