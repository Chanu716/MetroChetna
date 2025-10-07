// Helper script to encode private key to Base64 for Netlify
// Run: node encode-private-key.js

const fs = require('fs');
const path = require('path');

// Read the service account JSON file
const serviceAccountPath = path.join(__dirname, 'valiant-store-441008-q0-5711f1e44b63.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Get the private key
const privateKey = serviceAccount.private_key;

// Encode to Base64
const base64Key = Buffer.from(privateKey).toString('base64');

console.log('\n📋 Copy these values to Netlify Environment Variables:\n');
console.log('=' .repeat(80));
console.log('\nVariable 1:');
console.log('Key: SPREADSHEET_ID');
console.log('Value: 1kDzB4jwvJYpwmY-O4mtrCo1CM7_Ok-cLtPAghWrGBwQ');

console.log('\n' + '='.repeat(80));
console.log('\nVariable 2:');
console.log('Key: GOOGLE_CLIENT_EMAIL');
console.log('Value:', serviceAccount.client_email);

console.log('\n' + '='.repeat(80));
console.log('\nVariable 3 (OPTION A - Recommended):');
console.log('Key: GOOGLE_PRIVATE_KEY_BASE64');
console.log('Value:');
console.log(base64Key);

console.log('\n' + '='.repeat(80));
console.log('\nVariable 3 (OPTION B - Alternative):');
console.log('Key: GOOGLE_PRIVATE_KEY');
console.log('Value (copy as single line with \\n):');
console.log(privateKey.replace(/\n/g, '\\n'));

console.log('\n' + '='.repeat(80));
console.log('\n✅ Recommended: Use OPTION A (Base64) for better reliability');
console.log('⚠️  Important: Set scopes to "All scopes" for each variable');
console.log('\n');
