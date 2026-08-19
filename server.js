import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Mock Data
let appConfig = {
  appTitle: "Fundraising Drive",
  intro: "Welcome!",
  paymentInfo: "",
  adminPin: "1234",
  closingDate: "",
  emailIntro: "",
  emailFooter: "",
  bannerImageId: null
};

let products = [
  { id: '1', name: 'Sample Item', price: 10.00, image: 'https://via.placeholder.com/150' }
];

let orders = [];

let events = [
  { id: 'event_1', name: 'Spring Event' },
  { id: 'event_2', name: 'Winter Event' }
];

let activeEvent = { name: "Spring Event", sheetId: "mock_sheet", folderId: "mock_folder" };
let productOrder = [];

// API Endpoint
app.post('/api', (req, res) => {
  const request = req.body;
  const action = request.action;

  const verifyAdmin = (pin) => {
    if (pin !== appConfig.adminPin) {
      throw new Error("Incorrect Admin PIN");
    }
  };

  const output = { success: false, data: null, message: '' };

  try {
    const protectedActions = [
      'UPDATE_CONFIG', 'ADD_PRODUCT', 'DELETE_PRODUCT', 
      'CREATE_EVENT', 'SAVE_ORDER', 'RESET_ORDER', 
      'GET_ORDERS', 'UPDATE_ORDER_STATUS',
      'GET_EVENTS', 'SWITCH_EVENT', 'UPLOAD_BANNER'
    ];

    if (protectedActions.includes(action)) {
      verifyAdmin(request.pin);
    }

    switch (action) {
      case 'GET_APP_DATA': {
        const sortedProducts = [...products];
        if (productOrder.length > 0) {
          sortedProducts.sort((a, b) => {
            const idxA = productOrder.indexOf(a.id);
            const idxB = productOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.name.localeCompare(b.name);
          });
        }

        const publicConfig = { ...appConfig };
        delete publicConfig.adminPin;

        output.data = {
          config: publicConfig,
          products: sortedProducts,
          activeEventName: activeEvent.name,
          activeSheetId: activeEvent.sheetId,
          activeFolderId: activeEvent.folderId
        };
        output.success = true;
        break;
      }
      
      case 'VERIFY_ADMIN':
        verifyAdmin(request.pin);
        output.success = true;
        break;

      case 'UPDATE_CONFIG':
        appConfig = { ...appConfig, ...request.payload };
        output.success = true;
        output.message = "Settings updated.";
        break;

      case 'ADD_PRODUCT': {
        const data = request.payload;
        const newProduct = {
          id: 'prod_' + Date.now(),
          name: data.name,
          price: data.price,
          image: data.imageBase64 // Store base64 directly in memory for mock
        };
        products.push(newProduct);
        output.success = true;
        output.message = "Product added.";
        break;
      }

      case 'UPLOAD_BANNER': {
        // We'll just return a mock ID and update config client side
        const bannerId = 'banner_' + Date.now();
        // Since we don't have Drive, we could just return the base64, but the frontend expects an ID
        // We'll store it in a map or something, but actually the frontend code doesn't use the banner base64 except when uploading. 
        // Let's just mock it.
        output.data = { bannerId: request.payload.imageBase64 }; 
        output.success = true;
        output.message = "Banner uploaded.";
        break;
      }

      case 'DELETE_PRODUCT': {
        products = products.filter(p => p.id !== request.payload);
        output.success = true;
        output.message = "Product deleted.";
        break;
      }

      case 'SAVE_ORDER':
        productOrder = request.payload;
        output.success = true;
        output.message = "Listing saved.";
        break;

      case 'RESET_ORDER':
        productOrder = [];
        output.success = true;
        output.message = "Reset to Alphabetical.";
        break;

      case 'CREATE_EVENT': {
        const newEvent = { id: 'evt_' + Date.now(), name: request.eventName };
        events.push(newEvent);
        activeEvent = { name: newEvent.name, sheetId: 'mock_sheet', folderId: newEvent.id };
        productOrder = [];
        output.data = { eventName: newEvent.name };
        output.success = true;
        output.message = "New Event Created!";
        break;
      }

      case 'GET_EVENTS':
        output.data = events.sort((a,b) => b.name.localeCompare(a.name));
        output.success = true;
        break;

      case 'SWITCH_EVENT': {
        const evt = events.find(e => e.id === request.payload.folderId);
        if (evt) {
          activeEvent = { name: evt.name, sheetId: 'mock_sheet', folderId: evt.id };
          productOrder = [];
        }
        output.success = true;
        output.message = "Event Switched Successfully";
        break;
      }

      case 'SUBMIT_ORDER': {
        const data = request.payload;
        
        if (appConfig.closingDate) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const closeDate = new Date(appConfig.closingDate);
          if (today > closeDate) throw new Error("Shop is closed for new orders.");
        }
      
        const orderId = data.orderId || "ORD-" + Math.floor(1000 + Math.random() * 9000);
        
        // Push items individually for mock order list, or group them. 
        // Based on GET_ORDERS: returns { orderId, date, item, qty, total, customer, contact, status }
        data.cart.forEach(item => {
          orders.push({
            orderId: orderId,
            date: new Date(),
            item: item.name,
            qty: item.qty,
            total: item.price * item.qty,
            customer: `${data.customerName} [${data.userType}${data.relatedName ? ': '+data.relatedName:''}]`,
            contact: data.contact,
            status: 'Pending'
          });
        });

        output.data = { orderId: orderId, emailStatus: "Not Sent (Mocked)" };
        output.success = true;
        output.message = "Order submitted!";
        break;
      }

      case 'GET_ORDERS':
        output.data = orders;
        output.success = true;
        break;

      case 'UPDATE_ORDER_STATUS':
        orders.forEach(o => {
          if (o.orderId === request.payload.orderId) {
            o.status = request.payload.status;
          }
        });
        output.success = true;
        output.message = "Status updated.";
        break;

      default:
        throw new Error("Invalid Action: " + action);
    }
  } catch (err) {
    output.success = false;
    output.message = err.toString();
  }

  res.json(output);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
