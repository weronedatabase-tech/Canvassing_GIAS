const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');

code = code.replace(
  "      case 'ADMIN_DELETE_EVENT':\n        data = deleteEvent(req.eventId);\n        break;\n      default:",
  "      case 'ADMIN_DELETE_EVENT':\n        data = deleteEvent(req.eventId);\n        break;\n      case 'UPDATE_ORDER_PROOF':\n        data = updateOrderProof(req.eventId, req.orderId, req.customerName, req.email, req.paymentProofBase64, req.mimeType);\n        break;\n      default:"
);

code = code.replace(
  `"'" + data.contact, data.email, imageUrl, "Pending",`,
  `"'" + data.contact, data.email, imageUrl, data.paymentProofBase64 ? "Pending" : "Awaiting Payment",`
);

code = code.replace(
  `  let emailStatus = "Not Sent";\n  if (data.email && data.email.includes('@')) {\n    emailStatus = _sendOrderEmail(data.email, orderId, data.customerName, data.cart, data.totalAmount, store, false);\n  }\n  return { orderId: orderId, emailStatus: emailStatus };`,
  `  let emailStatus = "Not Sent";\n  if (data.paymentProofBase64 && data.email && data.email.includes('@')) {\n    emailStatus = _sendOrderEmail(data.email, orderId, data.customerName, data.cart, data.totalAmount, store, false);\n  }\n  return { orderId: orderId, emailStatus: emailStatus };`
);

const newFunction = `
function updateOrderProof(eventId, orderId, customerName, email, paymentProofBase64, mimeType) {
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  if (!store) throw new Error("Store not found");

  let imageUrl = "No Image";
  if (paymentProofBase64) {
    const folder = DriveApp.getFolderById(eventId);
    const blob = Utilities.newBlob(Utilities.base64Decode((paymentProofBase64.includes(',') ? paymentProofBase64.split(',')[1] : paymentProofBase64)), mimeType, \`Payment_\${customerName}_\${Date.now()}\`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = file.getUrl();
  } else {
    throw new Error("No image provided");
  }

  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // Find all rows matching orderId and update Image URL (col 10) and Status (col 11)
    let cart = [];
    let totalAmount = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == orderId) {
        sheet.getRange(i + 1, 10).setValue(imageUrl);
        sheet.getRange(i + 1, 11).setValue("Pending");
        cart.push({
          name: data[i][2],
          price: parseFloat(data[i][3]),
          qty: parseInt(data[i][4])
        });
        totalAmount += parseFloat(data[i][5]);
      }
    }

    if (cart.length === 0) {
      throw new Error("Order not found");
    }

    let emailStatus = "Not Sent";
    if (email && email.includes('@')) {
      emailStatus = _sendOrderEmail(email, orderId, customerName, cart, totalAmount, store, false);
    }
    
    SpreadsheetApp.flush();
    return { success: true, emailStatus: emailStatus };

  } catch(e) {
    throw new Error("Error updating order proof: " + e.message);
  } finally {
    lock.releaseLock();
  }
}
`;

code += newFunction;
fs.writeFileSync('backend/Code.js', code);
