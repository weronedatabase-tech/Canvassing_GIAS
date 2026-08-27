const ROOT_FOLDER_ID = "1A8jf8VQ7B5zAc7D4sEcW-Kr04V3XTKWT"; 
 
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Fundraising Shop')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    let data = null;
    
    switch(req.action) {
      case 'INIT': 
        data = getMasterConfig(); 
        break;
      case 'GET_STORE': 
        data = getStoreProducts(req.eventId); 
        break;
      case 'ADMIN_SAVE_STORE': 
        data = saveStoreConfig(req.payload); 
        break;
      case 'ADMIN_CREATE_STORE': 
        data = createStore(req.name); 
        break;
      case 'ADMIN_SAVE_PRODUCT': 
        data = saveProduct(req.eventId, req.product); 
        break;
      case 'ADMIN_DELETE_PRODUCT': 
        data = deleteProduct(req.eventId, req.productId); 
        break;
      case 'ADMIN_REORDER_PRODUCTS': 
        data = reorderProducts(req.eventId, req.productIds); 
        break;
      case 'SUBMIT_ORDER': 
        data = submitOrder(req.eventId, req.order); 
        break;
      case 'ADMIN_GET_ORDERS': 
        data = getOrders(req.eventId); 
        break;
      case 'ADMIN_UPDATE_ORDER': 
        data = updateOrderStatus(req.eventId, req.orderId, req.status); 
        break;
      case 'ADMIN_EXPORT_VENDOR_ORDER':
        data = exportVendorOrder(req.eventId, req.eventName, req.itemStats);
        break;
      case 'ADMIN_GET_VENDOR_FOLDER':
        data = getVendorFolderUrl(req.eventId);
        break;
      case 'ADMIN_UPDATE_ORDER_PAYMENT':
        data = updateOrderPaymentStatus(req.eventId, req.orderId, req.isConfirmed);
        break;
      case 'ADMIN_EDIT_ORDER': 
        data = editOrder(req.eventId, req.orderId, req.updatedData); 
        break;
      case 'ADMIN_RESEND_EMAIL':
        data = resendOrderEmail(req.eventId, req.orderId);
        break;
      case 'ADMIN_DELETE_ORDER': 
        data = deleteOrder(req.eventId, req.orderId); 
        break;
      case 'ADMIN_DELETE_EVENT':
        data = deleteEvent(req.eventId);
        break;
      default: 
        throw new Error("Unknown action: " + req.action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getRootFolder() {
  return DriveApp.getFolderById(ROOT_FOLDER_ID);
}

function getMasterConfig() {
  const root = getRootFolder();
  const files = root.getFilesByName("master_config.json");
  if (files.hasNext()) {
    return JSON.parse(files.next().getBlob().getDataAsString());
  }
  
  // Migration / Init
  const folders = root.getFolders();
  const stores = [];
  while(folders.hasNext()) {
    const f = folders.next();
    if(f.getName() !== "Template Canvassing Event") {
       stores.push({
         id: f.getId(),
         name: f.getName(),
         isOpen: true,
         closingDate: "",
         infoHtml: "Welcome to " + f.getName(),
         bannerImageId: null,
         paynowNumber: "",
         emailIntro: "",
         emailFooter: ""
       });
    }
  }
  const config = { stores: stores };
  root.createFile("master_config.json", JSON.stringify(config), MimeType.PLAIN_TEXT);
  return config;
}

function saveMasterConfig(config) {
  const root = getRootFolder();
  const files = root.getFilesByName("master_config.json");
  if (files.hasNext()) {
    files.next().setContent(JSON.stringify(config));
  } else {
    root.createFile("master_config.json", JSON.stringify(config), MimeType.PLAIN_TEXT);
  }
}

function saveStoreConfig(payload) {
  const config = getMasterConfig();
  const idx = config.stores.findIndex(s => s.id === payload.id);
  
  if (payload.imageBase64) {
    // Upload new banner
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(Utilities.base64Decode((payload.imageBase64.includes(',') ? payload.imageBase64.split(',')[1] : payload.imageBase64)), payload.mimeType, `Banner_${Date.now()}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.bannerImageId = file.getId();
    delete payload.imageBase64;
    delete payload.mimeType;
  }
  
  if (payload.summaryImageBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const ext = payload.summaryImageMimeType === 'image/png' ? 'png' : 'jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode((payload.summaryImageBase64.includes(',') ? payload.summaryImageBase64.split(',')[1] : payload.summaryImageBase64)), payload.summaryImageMimeType, `SummaryImage_${Date.now()}.${ext}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryImageId = file.getId();
    payload.summaryImageName = payload.summaryImageName || `Summary Image`;
    delete payload.summaryImageBase64;
    delete payload.summaryImageMimeType;
  }
  
  if (payload.summaryPdfBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(Utilities.base64Decode((payload.summaryPdfBase64.includes(',') ? payload.summaryPdfBase64.split(',')[1] : payload.summaryPdfBase64)), payload.summaryPdfMimeType, `SummaryPdf_${Date.now()}.pdf`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryPdfId = file.getId();
    payload.summaryPdfName = payload.summaryPdfName || `Summary PDF`;
    delete payload.summaryPdfBase64;
    delete payload.summaryPdfMimeType;
  }
  
  if (payload.removeSummaryImage) {
    payload.summaryImageId = null;
    payload.summaryImageName = null;
    delete payload.removeSummaryImage;
  }
  
  if (payload.removeSummaryPdf) {
    payload.summaryPdfId = null;
    payload.summaryPdfName = null;
    delete payload.removeSummaryPdf;
  }
  
  if (idx > -1) {
    config.stores[idx] = { ...config.stores[idx], ...payload };
  } else {
    throw new Error("Store not found");
  }
  saveMasterConfig(config);
  return config;
}

function deleteEvent(eventId) {
  const root = getRootFolder();
  
  // Find or create "Archived_Deleted"
  let archiveFolder;
  const archives = root.getFoldersByName("Archived_Deleted");
  if (archives.hasNext()) {
    archiveFolder = archives.next();
  } else {
    archiveFolder = root.createFolder("Archived_Deleted");
  }

  // Move the event folder
  try {
    const eventFolder = DriveApp.getFolderById(eventId);
    eventFolder.moveTo(archiveFolder);
  } catch (e) {
    // Ignore if not found or no permissions
  }

  const config = getMasterConfig();
  config.stores = config.stores.filter(s => s.id !== eventId);
  saveMasterConfig(config);
  
  return { success: true };
}

function createStore(name) {
  if (!name) throw new Error("Store name required");
  const root = getRootFolder();
  const templates = root.getFoldersByName("Template Canvassing Event");
  if (!templates.hasNext()) throw new Error("Template folder not found");
  const template = templates.next();
  
  const newFolder = root.createFolder(name);
  let sheetId = null;
  const files = template.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const copied = f.makeCopy(f.getName(), newFolder);
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS) {
      copied.setName(name + " Orders");
      sheetId = copied.getId();
    }
  }
  newFolder.createFolder("Products");
  
  const config = getMasterConfig();
  const newStore = {
    id: newFolder.getId(),
    name: name,
    isOpen: false,
    closingDate: "",
    infoHtml: "Welcome to " + name,
    bannerImageId: null,
    paynowNumber: "",
    emailIntro: "",
    emailFooter: "",
    sheetId: sheetId
  };
  config.stores.push(newStore);
  saveMasterConfig(config);
  return config;
}

function getStoreProducts(eventId) {
  const folder = DriveApp.getFolderById(eventId);
  const pFolders = folder.getFoldersByName("Products");
  if (!pFolders.hasNext()) return [];
  const pFolder = pFolders.next();
  
  const pFiles = pFolder.getFilesByName("products.json");
  if (pFiles.hasNext()) {
    return JSON.parse(pFiles.next().getBlob().getDataAsString());
  }
  
  // Migration from legacy
  const files = pFolder.getFiles();
  const products = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName() === "products.json") continue;
    const nameParts = file.getName().split('_');
    const price = parseFloat(nameParts.pop());
    const name = nameParts.join('_');
    if (!isNaN(price)) {
      products.push({
        id: file.getId(),
        name: name,
        description: "",
        price: price,
        imageId: file.getId()
      });
    }
  }
  pFolder.createFile("products.json", JSON.stringify(products), MimeType.PLAIN_TEXT);
  return products;
}

function saveProduct(eventId, productData) {
  const folder = DriveApp.getFolderById(eventId);
  const pFolders = folder.getFoldersByName("Products");
  let pFolder = pFolders.hasNext() ? pFolders.next() : folder.createFolder("Products");
  
  let products = [];
  const pFiles = pFolder.getFilesByName("products.json");
  let pFile = null;
  if (pFiles.hasNext()) {
    pFile = pFiles.next();
    products = JSON.parse(pFile.getBlob().getDataAsString());
  }
  
  if (productData.imageBase64) {
    const blob = Utilities.newBlob(Utilities.base64Decode((productData.imageBase64.includes(',') ? productData.imageBase64.split(',')[1] : productData.imageBase64)), productData.mimeType, `Product_${Date.now()}`);
    const imgFile = pFolder.createFile(blob);
    imgFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    productData.imageId = imgFile.getId();
    delete productData.imageBase64;
    delete productData.mimeType;
  }
  
  if (!productData.id) {
    productData.id = 'prod_' + Date.now();
    products.push(productData);
  } else {
    const idx = products.findIndex(p => p.id === productData.id);
    if (idx > -1) {
      products[idx] = { ...products[idx], ...productData };
    } else {
      products.push(productData);
    }
  }
  
  if (pFile) pFile.setContent(JSON.stringify(products));
  else pFolder.createFile("products.json", JSON.stringify(products), MimeType.PLAIN_TEXT);
  
  return products;
}

function deleteProduct(eventId, productId) {
  const folder = DriveApp.getFolderById(eventId);
  const pFolders = folder.getFoldersByName("Products");
  if (!pFolders.hasNext()) return [];
  const pFolder = pFolders.next();
  const pFiles = pFolder.getFilesByName("products.json");
  if (pFiles.hasNext()) {
    const pFile = pFiles.next();
    let products = JSON.parse(pFile.getBlob().getDataAsString());
    products = products.filter(p => p.id !== productId);
    pFile.setContent(JSON.stringify(products));
    return products;
  }
  return [];
}

function reorderProducts(eventId, productIds) {
  const folder = DriveApp.getFolderById(eventId);
  const pFolders = folder.getFoldersByName("Products");
  if (!pFolders.hasNext()) return [];
  const pFolder = pFolders.next();
  const pFiles = pFolder.getFilesByName("products.json");
  if (pFiles.hasNext()) {
    const pFile = pFiles.next();
    let products = JSON.parse(pFile.getBlob().getDataAsString());
    
    // Sort products based on the provided array of IDs
    const reordered = [];
    productIds.forEach(id => {
      const p = products.find(prod => prod.id === id);
      if (p) reordered.push(p);
    });
    
    // Add any missing products at the end just in case
    products.forEach(p => {
      if (!productIds.includes(p.id)) reordered.push(p);
    });

    pFile.setContent(JSON.stringify(reordered));
    return reordered;
  }
  return [];
}

function getSheetIdForEvent(eventId) {
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  if (store && store.sheetId) return store.sheetId;
  
  const folder = DriveApp.getFolderById(eventId);
  const sheets = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (sheets.hasNext()) return sheets.next().getId();
  throw new Error("Sheet not found for event");
}

function submitOrder(eventId, data) {
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  if (!store) throw new Error("Store not found");
  
  if (store.closingDate) {
    const tz = Session.getScriptTimeZone();
    const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    const closeStr = store.closingDate.substring(0, 10);
    if (todayStr > closeStr) throw new Error("Shop is closed.");
  }
  if (!store.isOpen) throw new Error("Shop is currently closed.");

  let imageUrl = "No Image";
  if (data.paymentProofBase64) {
    const folder = DriveApp.getFolderById(eventId);
    const blob = Utilities.newBlob(Utilities.base64Decode((data.paymentProofBase64.includes(',') ? data.paymentProofBase64.split(',')[1] : data.paymentProofBase64)), data.mimeType, `Payment_${data.customerName}_${Date.now()}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = file.getUrl();
  }

  // Use frontend-generated Order ID if available
  const orderId = data.orderId || `${store.name} - ${data.contact} - ${Math.floor(1000 + Math.random() * 9000)}`;
  
  const rows = data.cart.map(item => [
    orderId, new Date(), item.name, item.price, item.qty, (item.price * item.qty),
    `${data.customerName}`,
    "'" + data.contact, data.email, imageUrl, "Pending",
    data.custType || "", data.custRelationName || ""
  ]);

  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  
  // Make sure header has these columns if they're missing
  if (sheet.getLastColumn() < 13) {
      sheet.getRange(1, 12, 1, 2).setValues([["Customer Type", "Relation Name"]]);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      SpreadsheetApp.flush(); // Ensure writes are completed
    }
  } catch (e) {
    throw new Error("System is busy handling other orders. Please try checking out again.");
  } finally {
    lock.releaseLock();
  }

  let emailStatus = "Not Sent";
  if (data.email && data.email.includes('@')) {
    emailStatus = _sendOrderEmail(data.email, orderId, data.customerName, data.cart, data.totalAmount, store, false);
  }

  return { orderId: orderId, emailStatus: emailStatus };
}

function _sendOrderEmail(email, orderId, customerName, cart, totalAmount, store, isUpdate = false) {
  try {
    const itemListHtml = cart.map(i => 
      `<tr>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">${i.name}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">$${i.price.toFixed(2)}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">x${i.qty}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">$${(i.price * i.qty).toFixed(2)}</td>
       </tr>`
    ).join('');

    const titleText = isUpdate ? "Updated Order Confirmation" : "Order Confirmation";
    const customIntro = store.emailIntro ? store.emailIntro.replace(/\n/g, '<br>') : `Hi ${customerName},<br>Thank you for your support!`;
    const customFooter = store.emailFooter ? store.emailFooter.replace(/\n/g, '<br>') : `Thank you.`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">${titleText}</h2>
        <p>${customIntro}</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Price</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemListHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 10px; font-weight: bold; color: #2563eb;">$${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="font-size: 12px; color: #666;">${customFooter}</p>
      </div>
    `;

    MailApp.sendEmail({ to: email, subject: `${titleText}: ${orderId}`, htmlBody: htmlBody });
    return "Sent";
  } catch (e) {
    return "Failed: " + e.toString();
  }
}

function getOrders(eventId) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; 
  
  const lastCol = Math.max(sheet.getLastColumn(), 14); 
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const data = range.getValues();
  
  const orders = {};
  data.forEach(row => {
    const id = row[0];
    if (!orders[id]) {
       orders[id] = {
         orderId: id, date: row[1], customer: row[6], contact: row[7],
         email: row[8], imageUrl: row[9], status: row[10] || "Pending",
         custType: row[11] || "", custRelationName: row[12] || "",
         paymentConfirmed: row[13] === true || String(row[13]).toLowerCase() === 'true',
         items: [], total: 0
       };
    }
    const itemTotal = parseFloat(row[5]) || 0;
    orders[id].items.push({ name: row[2], price: row[3], qty: row[4], total: itemTotal });
    orders[id].total += itemTotal;
  });
  
  return Object.values(orders).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function updateOrderStatus(eventId, orderId, newStatus) {
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
      sheet.getRange(i + 2, 11).setValue(newStatus);
      found = true;
    }
  }
  if (!found) throw new Error("Order ID not found.");
  return { success: true };
}

function deleteOrder(eventId, orderId) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const mainSheet = ss.getSheets()[0];
  let deleteSheet = ss.getSheetByName("Deleted Orders");
  
  if (!deleteSheet) {
    deleteSheet = ss.insertSheet("Deleted Orders");
    const headerRange = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn());
    deleteSheet.appendRow(headerRange.getValues()[0]);
  }

  const lastRow = mainSheet.getLastRow();
  if (lastRow < 2) return { success: true };
  
  const ids = mainSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  let deletedCount = 0;
  
  // Must delete from bottom to top to preserve row indices during deletion
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i] && String(ids[i]).trim() === String(orderId).trim()) {
      const rowNum = i + 2;
      const rowData = mainSheet.getRange(rowNum, 1, 1, mainSheet.getLastColumn()).getValues();
      deleteSheet.appendRow(rowData[0]);
      mainSheet.deleteRow(rowNum);
      deletedCount++;
    }
  }
  
  if (deletedCount === 0) throw new Error("Order ID not found.");
  return { success: true, deletedCount };
}

function forceEmailAuthorization() {
  const quota = MailApp.getRemainingDailyQuota();
  console.log("Email Quota Remaining: " + quota);
}

function editOrder(eventId, orderId, updatedData) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const ids = range.getValues().flat();
  
  let existingRowIndices = [];
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] && String(ids[i]).trim() === String(orderId).trim()) {
      existingRowIndices.push(i + 2);
    }
  }
  
  if (existingRowIndices.length === 0) throw new Error("Order ID not found.");
  
  const firstRowData = sheet.getRange(existingRowIndices[0], 1, 1, 13).getValues()[0];
  const date = firstRowData[1];
  const email = updatedData.email !== undefined ? updatedData.email : firstRowData[8];
  const imageUrl = firstRowData[9];
  const status = firstRowData[10];
  
  const items = updatedData.items.filter(item => item.qty > 0);
  
  let i = 0;
  for (; i < items.length; i++) {
    const item = items[i];
    const rowValues = [
      orderId, date, item.name, item.price, item.qty, item.total,
      updatedData.customer, "'" + updatedData.contact, email, imageUrl, status,
      updatedData.custType || "", updatedData.custRelationName || ""
    ];
    
    if (i < existingRowIndices.length) {
      sheet.getRange(existingRowIndices[i], 1, 1, 13).setValues([rowValues]);
    } else {
      const insertAt = existingRowIndices[existingRowIndices.length - 1] + (i - existingRowIndices.length) + 1;
      sheet.insertRowAfter(insertAt - 1);
      sheet.getRange(insertAt, 1, 1, 13).setValues([rowValues]);
    }
  }
  
  for (let j = existingRowIndices.length - 1; j >= i; j--) {
    sheet.deleteRow(existingRowIndices[j]);
  }
  
  let emailStatus = null;
  if (email && email.includes('@')) {
    const config = getMasterConfig();
    const store = config.stores.find(s => s.id === eventId);
    emailStatus = _sendOrderEmail(email, orderId, updatedData.customer, items, updatedData.total, store, true);
  }
  
  return { success: true, emailStatus: emailStatus };
}

function resendOrderEmail(eventId, orderId) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const ids = range.getValues().flat();
  
  let existingRowIndices = [];
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] && String(ids[i]).trim() === String(orderId).trim()) {
      existingRowIndices.push(i + 2);
    }
  }
  
  if (existingRowIndices.length === 0) throw new Error("Order ID not found.");
  
  const firstRowData = sheet.getRange(existingRowIndices[0], 1, 1, 13).getValues()[0];
  const customerName = firstRowData[6];
  const email = firstRowData[8];
  
  if (!email || !email.includes('@')) {
    throw new Error("No valid email address found for this order.");
  }
  
  const items = [];
  let totalAmount = 0;
  
  for (let i = 0; i < existingRowIndices.length; i++) {
    const rowData = sheet.getRange(existingRowIndices[i], 1, 1, 13).getValues()[0];
    const itemName = rowData[2];
    const itemPrice = parseFloat(rowData[3]);
    const itemQty = parseInt(rowData[4]);
    const itemTotal = parseFloat(rowData[5]);
    
    items.push({ name: itemName, price: itemPrice, qty: itemQty });
    totalAmount += itemTotal;
  }
  
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  
  const emailStatus = _sendOrderEmail(email, orderId, customerName, items, totalAmount, store, false);
  return { emailStatus: emailStatus };
}

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
  const timestamp = Utilities.formatDate(now, tz, "yyyyMMdd_HHmmss");
  const fileName = `${eventName}-Full Order for Vendor-${timestamp}`;
  
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
