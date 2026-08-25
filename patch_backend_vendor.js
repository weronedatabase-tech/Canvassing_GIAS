import fs from 'fs';
let code = fs.readFileSync('backend/Code.js', 'utf8');

code = code.replace(
    /case 'ADMIN_UPDATE_ORDER_PAYMENT':/g,
    \`case 'ADMIN_EXPORT_VENDOR_ORDER':
        data = exportVendorOrder(req.eventId, req.eventName, req.itemStats);
        break;
      case 'ADMIN_GET_VENDOR_FOLDER':
        data = getVendorFolderUrl(req.eventId);
        break;
      case 'ADMIN_UPDATE_ORDER_PAYMENT':\`
);

const newFunctions = \`
function getOrCreateVendorFolder(eventId) {
  const parentFolder = DriveApp.getFolderById(eventId);
  const folders = parentFolder.getFoldersByName("Vendor Order Submission");
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = parentFolder.createFolder("Vendor Order Submission");
  }
  return folder;
}

function getVendorFolderUrl(eventId) {
  const folder = getOrCreateVendorFolder(eventId);
  return { folderUrl: folder.getUrl() };
}

function exportVendorOrder(eventId, eventName, itemStats) {
  const folder = getOrCreateVendorFolder(eventId);
  
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const timestamp = Utilities.formatDate(now, tz, "yyyyMMdd-HHmmss");
  const fileName = \`\${eventName}_Full Order for Vendor_\${timestamp}\`;
  
  const ss = SpreadsheetApp.create(fileName);
  const sheet = ss.getSheets()[0];
  
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(folder);
  
  const headers = ["Item", "Price", "Sold", "Revenue"];
  const rows = [headers];
  
  let totalQty = 0;
  let totalRevenue = 0;
  
  itemStats.forEach(item => {
    rows.push([item.name, item.price, item.qty, item.revenue]);
    totalQty += item.qty;
    totalRevenue += item.revenue;
  });
  
  rows.push(["TOTAL", "", totalQty, totalRevenue]);
  
  sheet.getRange(1, 1, rows.length, 4).setValues(rows);
  
  sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f4f6");
  sheet.getRange(rows.length, 1, 1, 4).setFontWeight("bold");
  sheet.autoResizeColumns(1, 4);
  
  return { sheetUrl: ss.getUrl(), folderUrl: folder.getUrl() };
}
\`;

fs.writeFileSync('backend/Code.js', code + newFunctions);
