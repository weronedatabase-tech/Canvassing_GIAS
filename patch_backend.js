const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');
code = code.replace(
`  if (payload.imageBase64) {
    // Upload new banner
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.imageBase64.split(',')[1]), payload.mimeType, \`Banner_\${Date.now()}\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.bannerImageId = file.getId();
    delete payload.imageBase64;
    delete payload.mimeType;
  }`,
`  if (payload.imageBase64) {
    // Upload new banner
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.imageBase64.split(',')[1]), payload.mimeType, \`Banner_\${Date.now()}\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.bannerImageId = file.getId();
    delete payload.imageBase64;
    delete payload.mimeType;
  }
  
  if (payload.summaryFileBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const ext = payload.summaryFileMimeType === 'application/pdf' ? 'pdf' : (payload.summaryFileMimeType === 'image/png' ? 'png' : 'jpg');
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.summaryFileBase64.split(',')[1]), payload.summaryFileMimeType, \`Summary_\${Date.now()}.\${ext}\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryFileId = file.getId();
    payload.summaryFileType = payload.summaryFileMimeType.startsWith('image/') ? 'image' : 'pdf';
    payload.summaryFileName = payload.summaryFileName || \`Summary File\`;
    delete payload.summaryFileBase64;
    delete payload.summaryFileMimeType;
  }`
);
fs.writeFileSync('backend/Code.js', code);
