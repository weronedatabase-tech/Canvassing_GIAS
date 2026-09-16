const GAS_URL = "https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec";

async function fetchGAS(url, options, retries = 2) {
    let start = Date.now();
    for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, { ...options, redirect: 'manual' });
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('location');
            if (location) {
                const res2 = await fetch(location, { method: 'GET', redirect: 'follow' });
                const contentType = res2.headers.get('content-type') || '';
                if (contentType.includes('text/html') && i < retries) {
                    console.log(`GAS returned HTML instead of JSON. Retrying (${i+1}/${retries})...`);
                    await new Promise(r => setTimeout(r, 1000));
                    continue; 
                }
                console.log("Time taken:", Date.now() - start);
                return res2;
            }
        }
        console.log("Time taken:", Date.now() - start);
        return res;
    }
}

async function test() {
    try {
        const res = await fetchGAS(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'INIT' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        const text = await res.text();
        console.log("JSON RETURNED. Length:", text.length);
    } catch (e) {
        console.log(e);
    }
}
test();
