const crypto = require('crypto');

const systemId = '4731f4d9-044f-4044-8b0c-dd10c85b4740';
const secret = 'KhaataX-2026-SecretKey-Kanha-KC';
const expectedKey = 'D3B0-3CD8-A0BF-10C0';

// JS Admin Tool Logic (Concatenation)
const input = systemId + secret;
const hash = crypto.createHash('sha256').update(input).digest('hex');
const jsKey = formatKey(hash);

console.log('JS Calculation:');
console.log('Input:', input);
console.log('Hash:', hash);
console.log('Key:', jsKey);

// Rust Logic Simulation (Sequential Updates)
// In Rust: hasher.update(sys_id); hasher.update(secret);
// This is effectively update(sys_id + secret) if encoded simply.
const hash2 = crypto.createHash('sha256').update(systemId).update(secret).digest('hex');
const rustKey = formatKey(hash2);

console.log('\nRust Simulation:');
console.log('Hash2:', hash2);
console.log('Key:', rustKey);

console.log('\nMatch Expected?', jsKey === expectedKey);

function formatKey(hex) {
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`.toUpperCase();
}
