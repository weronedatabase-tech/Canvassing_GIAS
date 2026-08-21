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
app.use(express.static(path.join(__dirname, 'frontend')));

// Environment variables
const GAS_URL = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbxpgGDFHHhENaWSd50Vm70C5kioPu9nba89QDN4dJ8W-JsHsQfMZNJpIH_YqnlwROmf/exec";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Proxy endpoint for GAS backend
app.post('/api/gas', async (req, res) => {
  try {
    const adminActions = ['ADMIN_SAVE_STORE', 'ADMIN_CREATE_STORE', 'ADMIN_SAVE_PRODUCT', 'ADMIN_DELETE_PRODUCT', 'ADMIN_GET_ORDERS', 'ADMIN_UPDATE_ORDER', 'ADMIN_REORDER_PRODUCTS', 'ADMIN_DELETE_ORDER'];
    
    // Check AI Studio Secrets / Admin password
    if (adminActions.includes(req.body.action)) {
      if (req.body.password !== ADMIN_PASSWORD) {
         return res.status(401).json({ success: false, message: "Invalid Admin Password" });
      }
    }

    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(req.body),
      headers: { 'Content-Type': 'text/plain' } // GAS prefers text/plain for CORS bypassing in some cases, or application/json. 
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("GAS Proxy Error:", error);
    res.status(500).json({ success: false, message: error.toString() });
  }
});

app.post('/api/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid password" });
    }
});

// Fallback for SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
