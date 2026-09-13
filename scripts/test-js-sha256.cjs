const crypto = require('crypto');
const salt = 'ONELINE_SOHAG_SECURE_SALT_2026';

// Browser Web Crypto API implementation as used in securityShield.js
async function webCryptoSha256(message) {
  const saltedMsg = message + salt;
  const msgBuffer = new TextEncoder().encode(saltedMsg);
  const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function nodeCryptoSha256(message) {
  return crypto.createHash('sha256').update(message + salt).digest('hex');
}

async function runTest() {
  console.log('🧪 Testing Web Crypto API vs Node Crypto SHA-256 (Salted)...');
  const pins = ['1234', 'admin', 'oneline2026', '123456', 'test123', 'Sohag2026!'];
  let allMatched = true;

  for (const pin of pins) {
    const nodeHash = nodeCryptoSha256(pin);
    const webHash = await webCryptoSha256(pin);
    const match = nodeHash === webHash;
    if (!match) allMatched = false;
    console.log(`  ${match ? '✅' : '❌'} PIN: "${pin}" -> Match: ${match} (${webHash})`);
  }

  if (allMatched) {
    console.log('🎉 Web Crypto & Node Crypto SHA-256 hashes match 100% with Salt!');
  } else {
    console.error('❌ Mismatch detected!');
    process.exit(1);
  }
}

runTest();
