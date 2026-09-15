const GAS_URL = "https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec";

async function fetchGAS(url, options, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        let res = await fetch(url, { ...options, redirect: 'manual' });
        
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('location');
            if (location) {
                res = await fetch(location, { method: 'GET', redirect: 'follow' });
            }
        }
        
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html') && i < retries) {
            console.log(`GAS returned HTML instead of JSON (Status: ${res.status}). Retrying (${i+1}/${retries})...`);
            await new Promise(r => setTimeout(r, 1000));
            continue; 
        }
        
        return res;
    }
}
