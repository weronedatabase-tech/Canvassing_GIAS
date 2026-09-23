// ROOT_FOLDER_ID and GAS_URL are defined in config.js 
var _activeRootFolderId = null; 
 
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Fundraising Shop')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.rootFolderId) {
      _activeRootFolderId = req.rootFolderId;
    }
    let data = null;
    
    // Check Admin Password for all ADMIN_ actions
    if (req.action && (req.action.startsWith('ADMIN_') || req.action === 'ADMIN_LOGIN')) {
      const storedPassword = PropertiesService.getScriptProperties().getProperty("Admin Password");
      const cleanStored = storedPassword ? String(storedPassword).trim() : "";
      const cleanReq = req.password !== undefined && req.password !== null ? String(req.password).trim() : "";
      const isMatch = storedPassword && (req.password === storedPassword || (cleanReq && cleanReq === cleanStored));

      // If property is not set, or passwords do not match, reject
      if (!isMatch) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Invalid Admin Password"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (req.action === 'ADMIN_LOGIN') {
        return ContentService.createTextOutput(JSON.stringify({
          success: true
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    switch(req.action) {
      case 'CHECK_PENDING_ORDERS':
        data = checkPendingOrders(req.orders);
        break;
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
      case 'ADMIN_UPDATE_ORDER_REMARKS':
        data = updateOrderRemarks(req.eventId, req.orderId, req.remarks);
        break;
      case 'ADMIN_EXPORT_VENDOR_ORDER':
        data = exportVendorOrder(req.eventId, req.eventName, req.itemStats);
        break;
      case 'ADMIN_GET_VENDOR_FOLDER':
        data = getVendorFolderUrl(req.eventId);
        break;
      case 'ADMIN_UPDATE_ORDER_PAYMENT':
        data = updateOrderPaymentStatus(req.eventId, req.orderId, req.isConfirmed, req.sendEmail);
        break;
      case 'ADMIN_UPDATE_RECEIPT':
        data = adminUpdateReceipt(req.eventId, req.orderId, req.customerName, req.paymentProofBase64, req.mimeType, req.remove);
        break;
      case 'ADMIN_EDIT_ORDER': 
        data = editOrder(req.eventId, req.orderId, req.updatedData); 
        break;
      case 'ADMIN_RESEND_EMAIL':
        data = resendOrderEmail(req.eventId, req.orderId);
        break;
      case 'CUSTOMER_CANCEL_ORDER':
        data = deleteOrder(req.eventId, req.orderId);
        break;
      case 'ADMIN_DELETE_ORDER': 
        data = deleteOrder(req.eventId, req.orderId); 
        break;
      case 'ADMIN_DELETE_EVENT':
        data = deleteEvent(req.eventId);
        break;
      case 'UPDATE_ORDER_PROOF':
        data = updateOrderProof(req.eventId, req.orderId, req.customerName, req.email, req.paymentProofBase64, req.mimeType);
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
  var id = null;
  if (_activeRootFolderId) {
    id = _activeRootFolderId;
  } else if (typeof ROOT_FOLDER_ID !== 'undefined' && ROOT_FOLDER_ID) {
    id = ROOT_FOLDER_ID;
  } else if (typeof CONFIG !== 'undefined' && typeof APP_ENV !== 'undefined' && CONFIG[APP_ENV]) {
    id = CONFIG[APP_ENV].ROOT_FOLDER_ID;
  }
  if (!id) {
    throw new Error("ROOT_FOLDER_ID is not defined. Please ensure backend/config.js is added to your Google Apps Script project.");
  }
  return DriveApp.getFolderById(id);
}

function cleanupOldMasterConfig(root) {
  try {
    const files = root.getFilesByName("master_config.json");
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
  } catch (e) {}
}

function readOldMasterConfig(root) {
  try {
    const files = root.getFilesByName("master_config.json");
    if (files.hasNext()) {
      const f = files.next();
      const content = f.getBlob().getDataAsString();
      return JSON.parse(content);
    }
  } catch (e) {}
  return null;
}

function getStoresRegistrySheet() {
  const root = getRootFolder();
  const files = root.getFilesByName("Stores_Registry");
  let ss = null;

  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    // Check if there is an existing master_config.json to migrate from
    const oldConfig = readOldMasterConfig(root);

    ss = SpreadsheetApp.create("Stores_Registry");
    const ssFile = DriveApp.getFileById(ss.getId());
    ssFile.moveTo(root);

    const sheet = ss.getSheets()[0];
    sheet.setName("Stores");

    const headers = [
      "ID", "Name", "EventType", "IsOpen", "ClosingDate", "PayNowNumber",
      "BannerImageId", "InfoHtml", "EmailProcessing", "EmailConfirmed",
      "EmailFooter", "SummaryImageId", "SummaryImageName", "SummaryPdfId", "SummaryPdfName", "SheetId"
    ];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    if (oldConfig && oldConfig.stores && oldConfig.stores.length > 0) {
      oldConfig.stores.forEach(s => {
        sheet.appendRow([
          s.id || "",
          s.name || "",
          s.eventType || "online",
          s.isOpen !== false,
          s.closingDate || "",
          s.paynowNumber || "",
          s.bannerImageId || "",
          s.infoHtml || "",
          s.emailProcessing || s.emailIntro || "",
          s.emailConfirmed || "",
          s.emailFooter || "",
          s.summaryImageId || "",
          s.summaryImageName || "",
          s.summaryPdfId || "",
          s.summaryPdfName || "",
          s.sheetId || ""
        ]);
      });
    }

    // Now that we've migrated, clean up the old master_config.json file
    cleanupOldMasterConfig(root);
  }

  // Clean up any lingering master_config.json in root
  cleanupOldMasterConfig(root);

  return ss.getSheetByName("Stores") || ss.getSheets()[0];
}

function getMasterConfig() {
  const root = getRootFolder();
  cleanupOldMasterConfig(root);

  const sheet = getStoresRegistrySheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    // Initialize registry by discovering existing folders
    const folders = root.getFolders();
    const discoveredStores = [];
    while (folders.hasNext()) {
      const f = folders.next();
      const name = f.getName();
      if (name !== "Template Canvassing Event" && name !== "Archived_Deleted") {
        let sheetId = "";
        try {
          const sheets = f.getFilesByType(MimeType.GOOGLE_SHEETS);
          if (sheets.hasNext()) sheetId = sheets.next().getId();
        } catch (e) {}

        const s = {
          id: f.getId(),
          name: name,
          eventType: 'online',
          isOpen: true,
          closingDate: "",
          infoHtml: "Welcome to " + name,
          bannerImageId: "",
          paynowNumber: "",
          emailProcessing: "",
          emailConfirmed: "",
          emailFooter: "",
          summaryImageId: "",
          summaryImageName: "",
          summaryPdfId: "",
          summaryPdfName: "",
          sheetId: sheetId
        };
        discoveredStores.push(s);
        sheet.appendRow([
          s.id, s.name, s.eventType, s.isOpen, s.closingDate, s.paynowNumber,
          s.bannerImageId, s.infoHtml, s.emailProcessing, s.emailConfirmed,
          s.emailFooter, s.summaryImageId, s.summaryImageName, s.summaryPdfId, s.summaryPdfName, s.sheetId
        ]);
      }
    }
    return { stores: discoveredStores };
  }

  const lastCol = Math.max(sheet.getLastColumn(), 16);
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const stores = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const id = String(row[0] || "").trim();
    if (!id || id.toLowerCase() === "id") continue;

    stores.push({
      id: id,
      name: String(row[1] || ""),
      eventType: String(row[2] || "online"),
      isOpen: row[3] === true || String(row[3]).toLowerCase() === "true",
      closingDate: row[4] instanceof Date ? Utilities.formatDate(row[4], "Asia/Singapore", "yyyy-MM-dd") : String(row[4] || ""),
      paynowNumber: String(row[5] || ""),
      bannerImageId: row[6] || null,
      infoHtml: String(row[7] || ""),
      emailProcessing: String(row[8] || ""),
      emailConfirmed: String(row[9] || ""),
      emailFooter: String(row[10] || ""),
      summaryImageId: row[11] || null,
      summaryImageName: row[12] || null,
      summaryPdfId: row[13] || null,
      summaryPdfName: row[14] || null,
      sheetId: row[15] || null
    });
  }

  return { stores: stores };
}

function saveStoreConfig(payload) {
  const root = getRootFolder();
  cleanupOldMasterConfig(root);

  const sheet = getStoresRegistrySheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No stores registered");

  const lastCol = Math.max(sheet.getLastColumn(), 16);
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.findIndex(id => String(id).trim() === String(payload.id).trim());
  if (rowIndex === -1) throw new Error("Store not found in registry");

  const rowNum = rowIndex + 2;

  // Banner upload
  if (payload.imageBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.imageBase64.includes(',') ? payload.imageBase64.split(',')[1] : payload.imageBase64),
      payload.mimeType,
      `Banner_${Date.now()}`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.bannerImageId = file.getId();
    delete payload.imageBase64;
    delete payload.mimeType;
  }

  // Summary image upload
  if (payload.summaryImageBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const ext = payload.summaryImageMimeType === 'image/png' ? 'png' : 'jpg';
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.summaryImageBase64.includes(',') ? payload.summaryImageBase64.split(',')[1] : payload.summaryImageBase64),
      payload.summaryImageMimeType,
      `SummaryImage_${Date.now()}.${ext}`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryImageId = file.getId();
    payload.summaryImageName = payload.summaryImageName || "Summary Image";
    delete payload.summaryImageBase64;
    delete payload.summaryImageMimeType;
  }

  // Summary PDF upload
  if (payload.summaryPdfBase64) {
    const folder = DriveApp.getFolderById(payload.id);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.summaryPdfBase64.includes(',') ? payload.summaryPdfBase64.split(',')[1] : payload.summaryPdfBase64),
      payload.summaryPdfMimeType,
      `SummaryPdf_${Date.now()}.pdf`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    payload.summaryPdfId = file.getId();
    payload.summaryPdfName = payload.summaryPdfName || "Summary PDF";
    delete payload.summaryPdfBase64;
    delete payload.summaryPdfMimeType;
  }

  if (payload.removeSummaryImage) {
    payload.summaryImageId = "";
    payload.summaryImageName = "";
    delete payload.removeSummaryImage;
  }

  if (payload.removeSummaryPdf) {
    payload.summaryPdfId = "";
    payload.summaryPdfName = "";
    delete payload.removeSummaryPdf;
  }

  // Dynamic header mapping
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colMap = {};
  for (let c = 0; c < headerRow.length; c++) {
    colMap[String(headerRow[c]).trim().toLowerCase()] = c + 1;
  }

  const setCell = (colKey, val, defaultCol) => {
    const col = colMap[colKey.toLowerCase()] || defaultCol;
    if (col) {
      sheet.getRange(rowNum, col).setValue(val !== undefined && val !== null ? val : "");
    }
  };

  if (payload.name !== undefined) setCell("Name", payload.name, 2);
  if (payload.eventType !== undefined) setCell("EventType", payload.eventType, 3);
  if (payload.isOpen !== undefined) setCell("IsOpen", payload.isOpen, 4);
  if (payload.closingDate !== undefined) setCell("ClosingDate", payload.closingDate, 5);
  if (payload.paynowNumber !== undefined) setCell("PayNowNumber", payload.paynowNumber, 6);
  if (payload.bannerImageId !== undefined) setCell("BannerImageId", payload.bannerImageId, 7);
  if (payload.infoHtml !== undefined) setCell("InfoHtml", payload.infoHtml, 8);
  if (payload.emailProcessing !== undefined) setCell("EmailProcessing", payload.emailProcessing, 9);
  if (payload.emailConfirmed !== undefined) setCell("EmailConfirmed", payload.emailConfirmed, 10);
  if (payload.emailFooter !== undefined) setCell("EmailFooter", payload.emailFooter, 11);
  if (payload.summaryImageId !== undefined) setCell("SummaryImageId", payload.summaryImageId, 12);
  if (payload.summaryImageName !== undefined) setCell("SummaryImageName", payload.summaryImageName, 13);
  if (payload.summaryPdfId !== undefined) setCell("SummaryPdfId", payload.summaryPdfId, 14);
  if (payload.summaryPdfName !== undefined) setCell("SummaryPdfName", payload.summaryPdfName, 15);
  if (payload.sheetId !== undefined) setCell("SheetId", payload.sheetId, 16);

  SpreadsheetApp.flush();
  return getMasterConfig();
}

function saveMasterConfig(config) {
  // Compatibility wrapper
  if (config && config.stores) {
    config.stores.forEach(s => saveStoreConfig(s));
  }
}

function deleteEvent(eventId) {
  const root = getRootFolder();
  cleanupOldMasterConfig(root);
  
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

  const sheet = getStoresRegistrySheet();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i]).trim() === String(eventId).trim()) {
        sheet.deleteRow(i + 2);
        break;
      }
    }
  }
  SpreadsheetApp.flush();
  
  return { success: true };
}

function createStore(name) {
  if (!name) throw new Error("Store name required");
  const root = getRootFolder();
  cleanupOldMasterConfig(root);

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
  
  const sheet = getStoresRegistrySheet();
  const newStore = {
    id: newFolder.getId(),
    name: name,
    eventType: 'online',
    isOpen: false,
    closingDate: "",
    infoHtml: "Welcome to " + name,
    bannerImageId: "",
    paynowNumber: "",
    emailProcessing: "",
    emailConfirmed: "",
    emailFooter: "",
    summaryImageId: "",
    summaryImageName: "",
    summaryPdfId: "",
    summaryPdfName: "",
    sheetId: sheetId || ""
  };

  sheet.appendRow([
    newStore.id,
    newStore.name,
    newStore.eventType,
    newStore.isOpen,
    newStore.closingDate,
    newStore.paynowNumber,
    newStore.bannerImageId,
    newStore.infoHtml,
    newStore.emailProcessing,
    newStore.emailConfirmed,
    newStore.emailFooter,
    newStore.summaryImageId,
    newStore.summaryImageName,
    newStore.summaryPdfId,
    newStore.summaryPdfName,
    newStore.sheetId
  ]);
  SpreadsheetApp.flush();

  return getMasterConfig();
}

function getStoreProducts(eventId) {
  const folder = DriveApp.getFolderById(eventId);
  const pFolders = folder.getFoldersByName("Products");
  if (!pFolders.hasNext()) return [];
  const pFolder = pFolders.next();
  
  const pFiles = pFolder.getFilesByName("products.json");
  if (pFiles.hasNext()) {
    let pFile = pFiles.next();
    let products = JSON.parse(pFile.getBlob().getDataAsString());
    let modified = false;
    products.forEach(p => {
        if (p.imageBase64 || p.mimeType) {
            delete p.imageBase64;
            delete p.mimeType;
            modified = true;
        }
    });
    if (modified) {
        pFile.setContent(JSON.stringify(products));
    }
    return products;
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
  const fallbackRef = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderId = data.orderId || `${fallbackRef}_${store.name}`;
  
  const rows = data.cart.map(item => [
    orderId, new Date(), item.name, item.price, item.qty, (item.price * item.qty),
    `${data.customerName}`,
    "'" + data.contact, data.email, imageUrl, data.paymentProofBase64 ? "Pending" : "Awaiting Payment",
    data.custType || "", data.custRelationName || ""
  ]);

  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  
  // Clean up any existing rows with this order ID (in case of resubmission from checkout page)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    for (let i = ids.length - 1; i >= 0; i--) {
      if (ids[i] && String(ids[i]).trim() === String(orderId).trim()) {
        sheet.deleteRow(i + 2);
      }
    }
  }
  
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
  // No emails sent at this stage

  return { orderId: orderId, emailStatus: emailStatus };
}

function _sendOrderEmail(email, orderId, customerName, cart, totalAmount, store, emailType = 'PROCESSING') {
  try {
    const itemListHtml = cart.map(i => 
      `<tr>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">${i.name}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">$${i.price.toFixed(2)}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">x${i.qty}</td>
         <td style="padding: 5px; border-bottom: 1px solid #eee;">$${(i.price * i.qty).toFixed(2)}</td>
       </tr>`
    ).join('');

    let titleText = "Order Processing";
    let customIntro = store.emailProcessing ? store.emailProcessing.replace(/\n/g, '<br>') : `Hi ${customerName},<br>Thank you for your support. Your order and payment are being processed. If you experience any trouble with placing your order / making payment, please contact us.`;
    
    if (emailType === 'CONFIRMED') {
      titleText = "Payment Confirmed";
      customIntro = store.emailConfirmed ? store.emailConfirmed.replace(/\n/g, '<br>') : `Hi ${customerName},<br>Payment has been confirmed. Thank you for your support!`;
    } else if (emailType === 'UPDATE') {
      titleText = "Updated Order";
      customIntro = `Hi ${customerName},<br>Your order has been updated.`;
    }

    const customFooter = store.emailFooter ? store.emailFooter.replace(/\n/g, '<br>') : `Thank you.`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb; margin-bottom: 5px;">${titleText}</h2>
        <p style="margin-top: 0; font-weight: bold; font-size: 16px;">Order No: ${orderId}</p>
        <p>${customIntro}</p>

        <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #444; margin-top: 30px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
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
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ccc;">Total:</td>
              <td style="padding: 10px; font-weight: bold; color: #2563eb; border-top: 2px solid #ccc;">$${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">${customFooter}</p>
      </div>
    `;

    MailApp.sendEmail({ to: email, subject: `Order Update: ${orderId} - ${store.name}`, htmlBody: htmlBody });
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
  
  const lastCol = Math.max(sheet.getLastColumn(), 15); 
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Ensure Payment Confirmed & Remarks headers exist
  if (!headerRow.some(h => /payment.*confirm|paid/i.test(String(h)))) {
    sheet.getRange(1, 14).setValue("Payment Confirmed");
    headerRow[13] = "Payment Confirmed";
  }
  if (!headerRow.some(h => /remark|notes?/i.test(String(h)))) {
    sheet.getRange(1, 15).setValue("Remarks");
    headerRow[14] = "Remarks";
  }

  const findCol = (regex, fallback) => {
    const idx = headerRow.findIndex(h => regex.test(String(h).trim()));
    return idx >= 0 ? idx : fallback;
  };

  const idCol = findCol(/order\s*id/i, 0);
  const dateCol = findCol(/^date/i, 1);
  const itemCol = findCol(/item\s*name|^item$/i, 2);
  const priceCol = findCol(/price|unit\s*price/i, 3);
  const qtyCol = findCol(/qty|quantity/i, 4);
  const totalCol = findCol(/^total|subtotal/i, 5);
  const custCol = findCol(/customer\s*name|^customer$/i, 6);
  const contactCol = findCol(/contact|phone|mobile/i, 7);
  const emailCol = findCol(/email/i, 8);
  const imgCol = findCol(/image|receipt|proof/i, 9);
  const statusCol = findCol(/status/i, 10);
  const typeCol = findCol(/customer\s*type|custtype/i, 11);
  const relCol = findCol(/relation/i, 12);
  const payCol = findCol(/payment.*confirm|paid/i, 13);
  const remarksCol = findCol(/remark|notes?/i, 14);

  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const data = range.getValues();
  
  const orders = {};
  data.forEach(row => {
    const id = row[idCol];
    if (!id || String(id).trim() === "" || String(id).trim().toLowerCase() === "order id") return;
    const cleanId = String(id).trim();

    const isPaid = row[payCol] === true || String(row[payCol]).toLowerCase() === 'true' || String(row[payCol]).toLowerCase() === 'yes';
    const remarkVal = (row[remarksCol] !== undefined && row[remarksCol] !== null) ? String(row[remarksCol]).trim() : "";

    if (!orders[cleanId]) {
       orders[cleanId] = {
         orderId: cleanId, 
         date: row[dateCol], 
         customer: row[custCol] || "", 
         contact: row[contactCol] ? String(row[contactCol]).replace(/^'/, '') : "",
         email: row[emailCol] || "", 
         imageUrl: row[imgCol] || "No Image", 
         status: row[statusCol] || "Pending",
         custType: row[typeCol] || "", 
         custRelationName: row[relCol] || "",
         paymentConfirmed: isPaid,
         remarks: remarkVal,
         items: [], 
         total: 0
       };
    } else {
       // If admin updated fields on another row for this order in the sheet, reflect them!
       if (row[custCol] && !orders[cleanId].customer) orders[cleanId].customer = row[custCol];
       if (row[contactCol] && !orders[cleanId].contact) orders[cleanId].contact = String(row[contactCol]).replace(/^'/, '');
       if (row[emailCol] && !orders[cleanId].email) orders[cleanId].email = row[emailCol];
       if (row[statusCol] && orders[cleanId].status === "Pending") orders[cleanId].status = row[statusCol];
       if (isPaid && !orders[cleanId].paymentConfirmed) orders[cleanId].paymentConfirmed = true;
       if (remarkVal && !orders[cleanId].remarks) orders[cleanId].remarks = remarkVal;
    }
    const priceVal = parseFloat(row[priceCol]) || 0;
    const qtyVal = parseInt(row[qtyCol]) || 0;
    const itemTotal = parseFloat(row[totalCol]) || (priceVal * qtyVal) || 0;
    if (row[itemCol] || qtyVal > 0) {
      orders[cleanId].items.push({ name: row[itemCol] || "Item", price: priceVal, qty: qtyVal, total: itemTotal });
      orders[cleanId].total += itemTotal;
    }
  });
  
  return Object.values(orders).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function updateOrderRemarks(eventId, orderId, remarks) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let remarksCol = headerRow.findIndex(h => /remark|notes?/i.test(String(h).trim())) + 1;
  if (remarksCol <= 0) {
    remarksCol = 15;
    sheet.getRange(1, 15).setValue("Remarks");
  }
  
  let idCol = headerRow.findIndex(h => /order\s*id/i.test(String(h).trim())) + 1;
  if (idCol <= 0) idCol = 1;

  const range = sheet.getRange(2, idCol, lastRow - 1, 1);
  const ids = range.getValues().flat();
  
  let found = false;
  const cleanRemarks = remarks !== undefined && remarks !== null ? String(remarks) : "";
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i]).trim() === String(orderId).trim()) {
      sheet.getRange(i + 2, remarksCol).setValue(cleanRemarks);
      found = true;
    }
  }
  if (!found) throw new Error("Order ID not found.");
  SpreadsheetApp.flush();
  return { success: true, remarks: cleanRemarks };
}

function updateOrderStatus(eventId, orderId, newStatus) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let statusCol = headerRow.findIndex(h => /status/i.test(String(h).trim())) + 1;
  if (statusCol <= 0) statusCol = 11;

  let idCol = headerRow.findIndex(h => /order\s*id/i.test(String(h).trim())) + 1;
  if (idCol <= 0) idCol = 1;

  const range = sheet.getRange(2, idCol, lastRow - 1, 1);
  const ids = range.getValues().flat();
  
  let found = false;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i]).trim() === String(orderId).trim()) {
      sheet.getRange(i + 2, statusCol).setValue(newStatus);
      found = true;
    }
  }
  if (!found) throw new Error("Order ID not found.");
  SpreadsheetApp.flush();
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
  if (email && email.includes('@') && updatedData.sendEmailType !== 'NONE') {
    const config = getMasterConfig();
    const store = config.stores.find(s => s.id === eventId);
    emailStatus = _sendOrderEmail(email, orderId, updatedData.customer, items, updatedData.total, store, updatedData.sendEmailType || 'UPDATE');
  }
  
  SpreadsheetApp.flush();
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
  
  const emailStatus = _sendOrderEmail(email, orderId, customerName, items, totalAmount, store, 'PROCESSING');
  return { emailStatus: emailStatus };
}

function updateOrderPaymentStatus(eventId, orderId, isConfirmed, sendEmail) {
  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found.");
  
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let payCol = headerRow.findIndex(h => /payment.*confirm|paid/i.test(String(h).trim())) + 1;
  if (payCol <= 0) {
    payCol = 14;
    sheet.getRange(1, 14).setValue("Payment Confirmed");
  }

  let idCol = headerRow.findIndex(h => /order\s*id/i.test(String(h).trim())) + 1;
  if (idCol <= 0) idCol = 1;

  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const data = range.getValues();
  
  let found = false;
  let emailStatus = "Not Sent";
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol - 1]).trim() === String(orderId).trim()) {
      sheet.getRange(i + 2, payCol).setValue(isConfirmed);
      
      if (!found && isConfirmed && sendEmail) {
        const customerName = data[i][6];
        const email = data[i][8];
        
        if (email && email.includes('@')) {
          const config = getMasterConfig();
          const store = config.stores.find(s => s.id === eventId);
          
          let cart = [];
          let totalAmount = 0;
          for (let j = 0; j < data.length; j++) {
             if (String(data[j][idCol - 1]).trim() === String(orderId).trim()) {
                 cart.push({
                     name: data[j][2],
                     price: parseFloat(data[j][3]),
                     qty: parseInt(data[j][4])
                 });
                 totalAmount += parseFloat(data[j][5]);
             }
          }
          emailStatus = _sendOrderEmail(email, orderId, customerName, cart, totalAmount, store, 'CONFIRMED');
        }
      }
      found = true;
    }
  }
  if (!found) throw new Error("Order ID not found.");
  SpreadsheetApp.flush();
  return { success: true, emailStatus: emailStatus };
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

function adminUpdateReceipt(eventId, orderId, customerName, paymentProofBase64, mimeType, remove) {
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  if (!store) throw new Error("Store not found");

  let imageUrl = "No Image";
  if (!remove && paymentProofBase64) {
    const folder = DriveApp.getFolderById(eventId);
    const blob = Utilities.newBlob(Utilities.base64Decode((paymentProofBase64.includes(',') ? paymentProofBase64.split(',')[1] : paymentProofBase64)), mimeType, `Payment_${customerName}_${Date.now()}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = file.getUrl();
  } else if (!remove) {
    throw new Error("No image provided");
  }

  const sheetId = getSheetIdForEvent(eventId);
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // Find all rows matching orderId and update Image URL (col 10)
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(orderId).trim()) {
        sheet.getRange(i + 1, 10).setValue(imageUrl);
      }
    }
  } catch (e) {
    throw new Error("Could not acquire lock to update receipt.");
  } finally {
    lock.releaseLock();
  }

  return { success: true, imageUrl: imageUrl };
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

function updateOrderProof(eventId, orderId, customerName, email, paymentProofBase64, mimeType) {
  const config = getMasterConfig();
  const store = config.stores.find(s => s.id === eventId);
  if (!store) throw new Error("Store not found");

  let imageUrl = "No Image";
  if (paymentProofBase64) {
    const folder = DriveApp.getFolderById(eventId);
    const blob = Utilities.newBlob(Utilities.base64Decode((paymentProofBase64.includes(',') ? paymentProofBase64.split(',')[1] : paymentProofBase64)), mimeType, `Payment_${customerName}_${Date.now()}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = file.getUrl();
  } else if (!store.eventType || store.eventType !== 'retail') {
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
        if (email && email.includes('@')) {
            sheet.getRange(i + 1, 9).setValue(email);
        }
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
      emailStatus = _sendOrderEmail(email, orderId, customerName, cart, totalAmount, store, 'PROCESSING');
    }
    
    SpreadsheetApp.flush();
    return { success: true, emailStatus: emailStatus };

  } catch(e) {
    throw new Error("Error updating order proof: " + e.message);
  } finally {
    lock.releaseLock();
  }
}


function generatePayNowString(proxyValue, amount, ref) {
    const tlv = (tag, val) => {
        const v = String(val);
        const l = v.length.toString().padStart(2, '0');
        return `${tag}${l}${v}`;
    };
    
    let proxyType = '0';
    let formattedProxy = (proxyValue || '').trim();
    if (formattedProxy.length === 8 && /^\d+$/.test(formattedProxy)) {
        formattedProxy = '+65' + formattedProxy;
    } else if (formattedProxy.length >= 9 && !formattedProxy.startsWith('+')) {
        proxyType = '2'; // UEN
    }
    
    let payload = tlv('00', '01') + tlv('01', '12'); 
    
    let accInfo = tlv('00', 'SG.PAYNOW') + tlv('01', proxyType) + tlv('02', formattedProxy) + tlv('03', '1');
    payload += tlv('26', accInfo) + tlv('52', '0000') + tlv('53', '702');
    
    if (amount && parseFloat(amount) > 0) {
        payload += tlv('54', parseFloat(amount).toFixed(2));
    }
    
    payload += tlv('58', 'SG') + tlv('59', 'NA') + tlv('60', 'Singapore');
    
    if (ref) payload += tlv('62', tlv('01', ref));
    payload += '6304'; 
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload + crc;
}


function checkPendingOrders(ordersToCheck) {
  const results = {};
  if (!ordersToCheck || !ordersToCheck.length) return results;
  
  const byEvent = {};
  ordersToCheck.forEach(p => {
    if (!byEvent[p.eventId]) byEvent[p.eventId] = [];
    byEvent[p.eventId].push(p.orderId);
  });

  for (const eventId in byEvent) {
    try {
      const sheetId = getSheetIdForEvent(eventId);
      if (!sheetId) continue;
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) continue;
      
      const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
      
      byEvent[eventId].forEach(orderId => {
        const row = data.find(r => String(r[0]).trim() === String(orderId).trim());
        if (row) {
          const isPaid = row[13] === true || String(row[13]).toLowerCase() === 'true';
          if (isPaid) {
            results[orderId] = true;
          }
        }
      });
    } catch(e) {
      // ignore errors for individual sheets
    }
  }
  return results;
}
