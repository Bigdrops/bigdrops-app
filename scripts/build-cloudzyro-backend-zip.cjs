const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const stageDir = path.join(process.env.TEMP || 'C:\\Users\\DELL\\AppData\\Local\\Temp', 'cloudzyro-stage');
const zipPath = path.join(process.env.TEMP || 'C:\\Users\\DELL\\AppData\\Local\\Temp', 'cloudzyro-server-only.zip');

if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Copy package.backend.json as package.json
fs.copyFileSync('package.backend.json', path.join(stageDir, 'package.json'));

// Copy server.ts and tsconfig.json
fs.copyFileSync('server.ts', path.join(stageDir, 'server.ts'));
if (fs.existsSync('tsconfig.json')) {
  fs.copyFileSync('tsconfig.json', path.join(stageDir, 'tsconfig.json'));
}

// Copy directories: api, src, public
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir('api', path.join(stageDir, 'api'));
copyDir('src', path.join(stageDir, 'src'));
copyDir('public', path.join(stageDir, 'public'));

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

execSync(`tar -a -cf "${zipPath}" -C "${stageDir}" .`);
console.log('Archive created successfully at:', zipPath, 'Size:', fs.statSync(zipPath).size, 'bytes');
