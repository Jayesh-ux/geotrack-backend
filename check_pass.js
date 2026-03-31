import bcrypt from 'bcryptjs';

const hash = '$2a$10$1RcHC5z/OUeOU027Fwt4I.cvtWCkqE7b6aG/xbhL5YPuVHZ1JdoCre';
const passwords = [
    'password123',
    'admin123',
    'backup123',
    'admin@backup.com',
    'root',
    'admin',
    'geotrack123',
    'geotrack',
    'superadmin',
    'superadmin123',
    'password',
    '123456',
    'qwerty'
];

async function check() {
    for (const p of passwords) {
        const match = await bcrypt.compare(p, hash);
        console.log(`Password: ${p} | Match: ${match}`);
    }
}

check();
