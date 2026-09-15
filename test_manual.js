const GAS_URL = "https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec";
async function test() {
    const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'ADMIN_LOGIN', password: "test" }),
        headers: { 'Content-Type': 'text/plain' },
        redirect: 'manual'
    });
    console.log(res.status, res.headers.get('location'));
    if (res.status === 302) {
        const res2 = await fetch(res.headers.get('location'), {
            method: 'GET'
        });
        console.log(res2.status);
        console.log(await res2.text());
    }
}
test();
