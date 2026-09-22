import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getConfig() {
  try {
    const configPath = path.join(__dirname, 'backend', 'config.js');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const script = new vm.Script(configContent + '\n;({GAS_URL, APP_ENV, ROOT_FOLDER_ID})');
      const result = script.runInNewContext({});
      return {
        GAS_URL: result.GAS_URL,
        APP_ENV: result.APP_ENV || 'Prod',
        ROOT_FOLDER_ID: result.ROOT_FOLDER_ID
      };
    }
  } catch(e) {
    console.error("Could not load backend/config.js", e);
  }
  return { 
    GAS_URL: null, 
    APP_ENV: 'Prod', 
    ROOT_FOLDER_ID: null 
  };
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));

// Helper function to handle Google Apps Script redirects manually
// since Node's native fetch (undici) sometimes fails on GAS 302 redirects.
async function fetchGAS(url, options, retries = 2, timeoutMs = 25000) {
    let lastError = null;
    for (let i = 0; i <= retries; i++) {
        let timer = null;
        try {
            const controller = new AbortController();
            timer = setTimeout(() => controller.abort(), timeoutMs);

            let res = await fetch(url, { ...options, redirect: 'manual', signal: controller.signal });
            
            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('location');
                // Consume body to free socket in Node.js
                try { await res.arrayBuffer(); } catch(e) {}
                if (location) {
                    res = await fetch(location, { method: 'GET', redirect: 'follow', signal: controller.signal });
                }
            }
            if (timer) clearTimeout(timer);
            
            // If it's HTML but we expect JSON, retry it
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/html') && i < retries) {
                console.log(`GAS returned HTML instead of JSON. Retrying (${i+1}/${retries})...`);
                await new Promise(r => setTimeout(r, 800));
                continue; // Retry the whole POST request
            }
            
            return res;
        } catch (err) {
            if (timer) clearTimeout(timer);
            lastError = err;
            console.warn(`GAS request attempt ${i+1}/${retries+1} failed: ${err.message}`);
            if (i < retries) {
                await new Promise(r => setTimeout(r, 800));
                continue;
            }
            throw err;
        }
    }
    if (lastError) throw lastError;
}

// Endpoint to get the current environment config
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/env', (req, res) => {
  const { APP_ENV } = getConfig();
  res.json({ env: APP_ENV });
});

// Proxy endpoint for GAS backend
app.post('/api/gas', async (req, res) => {
  const { GAS_URL, APP_ENV, ROOT_FOLDER_ID } = getConfig();
  if (!GAS_URL || !GAS_URL.startsWith('http')) {
    return res.status(500).json({
      success: false,
      message: `Invalid or unconfigured GAS_URL for environment '${APP_ENV}'. Please verify backend/config.js.`
    });
  }

  try {
    const payload = { ...req.body };
    if (!payload.rootFolderId && ROOT_FOLDER_ID) {
      payload.rootFolderId = ROOT_FOLDER_ID;
    }

    const response = await fetchGAS(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' } // GAS prefers text/plain for CORS bypassing in some cases, or application/json. 
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      if (req.body && req.body.action === 'INIT' && data && data.data && data.data.stores) {
          data.data.stores.forEach(s => {
              delete s.imageBase64;
              delete s.mimeType;
              delete s.summaryImageBase64;
              delete s.summaryImageMimeType;
              delete s.summaryPdfBase64;
              delete s.summaryPdfMimeType;
          });
      } else if (req.body && req.body.action === 'GET_STORE' && data && Array.isArray(data.data)) {
          data.data.forEach(p => {
              delete p.imageBase64;
              delete p.mimeType;
          });
      }
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
    if (req.body && req.body.action === 'INIT') {
      try {
        const initPath = path.join(__dirname, 'init.json');
        if (fs.existsSync(initPath)) {
          console.log("Serving cached fallback init.json");
          const initData = JSON.parse(fs.readFileSync(initPath, 'utf8'));
          return res.json(initData);
        }
      } catch (err) {
        console.error("Failed to read fallback init.json:", err);
      }
    }
    res.status(500).json({ success: false, message: error.toString() });
  }
});

app.post('/api/admin/login', async (req, res) => {
    const { GAS_URL } = getConfig();
    if (!GAS_URL || !GAS_URL.startsWith('http')) {
      return res.status(500).json({
        success: false,
        message: 'Invalid or unconfigured GAS_URL. Please verify backend/config.js.'
      });
    }
    try {
        const rawPassword = req.body ? req.body.password : '';
        const cleanPassword = typeof rawPassword === 'string' ? rawPassword.trim() : String(rawPassword || '');
        if (!cleanPassword) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        const response = await fetchGAS(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'ADMIN_LOGIN', password: cleanPassword }),
            headers: { 'Content-Type': 'text/plain' }
        }, 2, 20000);

        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            if (text.trim().startsWith('<')) {
                return res.status(502).json({
                    success: false,
                    isConnectionError: true,
                    message: "The backend returned an unexpected HTML response. Google Apps Script may still be initializing. Please try again."
                });
            }
            return res.status(502).json({
                success: false,
                isConnectionError: true,
                message: "Failed to parse response from Apps Script: " + e.message
            });
        }

        if (!json.success) {
            return res.status(401).json({
                success: false,
                isAuthError: true,
                message: json.message || "Invalid Admin Password"
            });
        }

        res.json({ success: true, message: "Login successful" });
    } catch (error) {
        console.error("Admin Login Proxy Error:", error);
        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('aborted');
        res.status(isTimeout ? 504 : 500).json({
            success: false,
            isConnectionError: true,
            message: isTimeout
                ? "Connection timed out while verifying password with Google Apps Script. Please try again."
                : "Backend connection error: " + error.message
        });
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
