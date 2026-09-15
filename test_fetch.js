const GAS_URL = "https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec";

async function fetchGAS(url, options) {
    const res = await fetch(url, { ...options, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (location) {
            return fetch(location, { method: 'GET' });
        }
    }
    return res;
}

async function test() {
    try {
        const res = await fetchGAS(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'ADMIN_LOGIN', password: "test" }),
            headers: { 'Content-Type': 'text/plain' }
        });
        const text = await res.text();
        console.log(text);
    } catch (e) {
        console.log(e);
    }
}
test();
