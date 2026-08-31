const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.resolve(__dirname, '..');
  console.log('Initializing Git repository in:', dir);

  // 1. Initialize git
  await git.init({ fs, dir, defaultBranch: 'main' });
  console.log('✓ Git initialized.');

  // 2. Add files
  const filesToAdd = [
    'package.json',
    'package-lock.json',
    'vite.config.js',
    'index.html',
    'vercel.json',
    'firestore.rules',
    '.gitignore',
    'README.md',
    'public/favicon.svg',
    'public/manifest.json'
  ];

  // Helper to walk src/
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/');
        filesToAdd.push(relativePath);
      }
    }
  }

  walkDir(path.join(dir, 'src'));

  console.log(`Adding ${filesToAdd.length} files to Git index...`);
  for (const filepath of filesToAdd) {
    if (fs.existsSync(path.join(dir, filepath))) {
      await git.add({ fs, dir, filepath });
    }
  }
  console.log('✓ All files staged.');

  // 3. Commit
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Dr. Mahmoud Elbaz / One Line Solutions',
      email: 'admin@onelinesolutions.com'
    },
    message: 'Initial Release: One Line Solutions Real Estate Platform 2026'
  });

  console.log('✓ Successfully committed with SHA:', sha);

  // 4. Set remote origin
  await git.setConfig({
    fs,
    dir,
    path: 'remote.origin.url',
    value: 'https://github.com/geminimahmoud20-gif/1Line-web.git'
  });
  console.log('✓ Remote origin set to https://github.com/geminimahmoud20-gif/1Line-web.git');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
