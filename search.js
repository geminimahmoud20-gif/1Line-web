import fs from 'fs';
const code = fs.readFileSync('src/App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, index) => {
  if (line.includes('key={')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
