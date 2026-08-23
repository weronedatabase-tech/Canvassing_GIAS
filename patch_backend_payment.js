import fs from 'fs';
let code = fs.readFileSync('backend/Code.js', 'utf8');

code = code.replace(
`      case 'ADMIN_UPDATE_ORDER': 
        data = updateOrderStatus(req.eventId, req.orderId, req.status); 
        break;`,
`      case 'ADMIN_UPDATE_ORDER': 
        data = updateOrderStatus(req.eventId, req.orderId, req.status); 
        break;
      case 'ADMIN_UPDATE_ORDER_PAYMENT':
        data = updateOrderPaymentStatus(req.eventId, req.orderId, req.isConfirmed);
        break;`
);

code = code.replace(
`  const lastCol = Math.max(sheet.getLastColumn(), 13); 
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);`,
`  const lastCol = Math.max(sheet.getLastColumn(), 14); 
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);`
);

code = code.replace(
`         custType: row[11] || "", custRelationName: row[12] || "",
         items: [], total: 0
       };`,
`         custType: row[11] || "", custRelationName: row[12] || "",
         paymentConfirmed: row[13] === true || String(row[13]).toLowerCase() === 'true',
         items: [], total: 0
       };`
);

const newFunction = `
function updateOrderPaymentStatus(eventId, orderId, isConfirmed) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const ids = range.getValues().flat();
  
  let found = false;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i]).trim() === String(orderId).trim()) {
      sheet.getRange(i + 2, 14).setValue(isConfirmed);
      found = true;
    }
  }
  if (!found) throw new Error("Order ID not found.");
  return { success: true };
}
`;

fs.writeFileSync('backend/Code.js', code + newFunction);
