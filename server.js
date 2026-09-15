import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let GAS_URL = process.env.GAS_URL;
try {
  const configPath = path.join(__dirname, 'backend', 'config.js');
  if (fs.existsSync(configPath)) {
    const config = await import('./backend/config.js');
    if (config.GAS_URL) {
      GAS_URL = GAS_URL || config.GAS_URL;
    }
  }
} catch(e) {
  console.log("Could not load backend/config.js", e);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));

// Proxy endpoint for GAS backend
app.post('/api/gas', async (req, res) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(req.body),
      headers: { 'Content-Type': 'text/plain' } // GAS prefers text/plain for CORS bypassing in some cases, or application/json. 
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (text.trim().startsWith('<')) {
        let hint = "This usually means your Google Apps Script Web App is misconfigured. Ensure it is deployed with 'Execute as: Me' and 'Who has access: Anyone'.";
        if (text.includes('Google Drive') && text.includes('Page not found')) hint = "The GAS_URL is invalid or the script was deleted.";
        else if (text.includes('accounts.google.com')) hint = "The script requires login. Deploy it with 'Execute as: Me' and 'Access: Anyone'.";
        else hint += " It could also be a temporary Google server error (500/502) or a payload that is too large.";
        throw new Error(`The backend returned an HTML page instead of JSON. ${hint}`);
      }
      throw new Error("Failed to parse response from Apps Script: " + e.message);
    }
    
    res.json(data);
  } catch (error) {
    console.error("GAS Proxy Error:", error);
    res.status(500).json({ success: false, message: error.toString() });
  }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'ADMIN_LOGIN', password: req.body.password }),
            headers: { 'Content-Type': 'text/plain' }
        });
        const json = await response.json();
        res.json(json);
    } catch (error) {
        console.error("Admin Login Proxy Error:", error);
        res.status(500).json({ success: false, message: error.toString() });
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
