async function req(action) {
    let start = Date.now();
    let res = await fetch("https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec", {
        method: 'POST',
        body: JSON.stringify({ action: action }),
        headers: { 'Content-Type': 'text/plain' },
        redirect: 'manual'
    });
    const loc = res.headers.get('location');
    let res2 = await fetch(loc, { redirect: 'follow' });
    await res2.text();
    console.log(action, "took", Date.now() - start);
}
async function test() {
    await Promise.all([
        req('INIT'),
        req('CHECK_PENDING_ORDERS')
    ]);
}
test();
