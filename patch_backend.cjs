const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');

code = code.replace(
  /if \(payload\.summaryFileBase64\) \{[\s\S]*?(?=if \(payload\.removeSummaryFile\) \{)/,
  `if (payload.summaryImageBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const ext = payload.summaryImageMimeType === 'image/png' ? 'png' : 'jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode((payload.summaryImageBase64.includes(',') ? payload.summaryImageBase64.split(',')[1] : payload.summaryImageBase64)), payload.summaryImageMimeType, \`SummaryImage_\${Date.now()}.\${ext}\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryImageId = file.getId();
    payload.summaryImageName = payload.summaryImageName || \`Summary Image\`;
    delete payload.summaryImageBase64;
    delete payload.summaryImageMimeType;
  }
  
  if (payload.summaryPdfBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(Utilities.base64Decode((payload.summaryPdfBase64.includes(',') ? payload.summaryPdfBase64.split(',')[1] : payload.summaryPdfBase64)), payload.summaryPdfMimeType, \`SummaryPdf_\${Date.now()}.pdf\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryPdfId = file.getId();
    payload.summaryPdfName = payload.summaryPdfName || \`Summary PDF\`;
    delete payload.summaryPdfBase64;
    delete payload.summaryPdfMimeType;
  }
  
  `
);

code = code.replace(
  /if \(payload\.removeSummaryFile\) \{[\s\S]*?(?=if \(idx \> -1\) \{)/,
  `if (payload.removeSummaryImage) {
    payload.summaryImageId = null;
    payload.summaryImageName = null;
    delete payload.removeSummaryImage;
  }
  
  if (payload.removeSummaryPdf) {
    payload.summaryPdfId = null;
    payload.summaryPdfName = null;
    delete payload.removeSummaryPdf;
  }
  
  `
);

fs.writeFileSync('backend/Code.js', code);
