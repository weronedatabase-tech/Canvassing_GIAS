async function test() {
    let start = Date.now();
    for(let i=0; i<5; i++) {
        let res = await fetch("https://script.google.com/macros/s/AKfycbwAyvNvIrXnoBMDd3cyE7YW5CTdYrbNOYLYhngWu01o3yXjUszJWSHeEGVcNwhIYWnq/exec", {
            method: 'POST',
            body: JSON.stringify({ action: 'INIT' }),
            headers: { 'Content-Type': 'text/plain' },
            redirect: 'manual'
        });
        const loc = res.headers.get('location');
        // NOT consuming body!
        let res2 = await fetch(loc, { redirect: 'follow' });
        await res2.text();
        console.log("Iteration", i, Date.now() - start);
    }
}
test();
