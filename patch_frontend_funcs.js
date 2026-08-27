const fs = require('fs');
let code = fs.readFileSync('frontend/js/app.js', 'utf8');

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
