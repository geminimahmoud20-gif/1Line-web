const crypto = require('crypto');
const salt = 'ONELINE_SOHAG_SECURE_SALT_2026';

function getHash(pin) {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

const pins = ['1234', 'admin', 'oneline2026', '123456', '0000', 'oneline'];
pins.forEach(pin => {
  console.log(`${pin} => ${getHash(pin)}`);
});
