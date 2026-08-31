import fs from 'fs';
const code = fs.readFileSync('src/App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, index) => {
  if (line.includes('navigateTo')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
