
async function testProdLogin() {
    const testCases = [
        { email: 'admin@test.com', password: 'admin123' },
        { email: 'admin@test.com', password: 'password123' },
        { email: 'superadmin@geotrack.com', password: 'admin123' },
    ];

    for (const tc of testCases) {
        try {
            console.log(`\nTesting: ${tc.email} / ${tc.password}`);
            const res = await fetch('https://geo-track-1.onrender.com/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tc),
            });
            const data = await res.json();
            console.log(`Status: ${res.status}`);
            console.log(`Response: ${JSON.stringify(data, null, 2)}`);
        } catch (err) {
            console.log(`Error: ${err.message}`);
        }
    }
}

testProdLogin();
