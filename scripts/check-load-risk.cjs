/**
 * BigDrops Load-Shedding Audit Script
 * 
 * Scans the codebase for high-risk performance patterns:
 * - Broad selects (*).
 * - Oversized components (>600 lines).
 * - Component-level Supabase fetches.
 * - Heavy fallback scans.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const LINE_LIMIT = 600;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build'];

const stats = {
  filesScanned: 0,
  broadSelects: 0,
  oversizedFiles: 0,
  componentFetches: 0,
  heavyLimits: 0
};

/**
 * Recursive file walker
 */
function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    
    if (isDirectory) {
      if (!IGNORE_DIRS.includes(f)) {
        walk(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        callback(path.join(dir, f));
      }
    }
  });
}

console.log('\n🔍 Starting BigDrops Performance Audit...\n');

walk(SRC_DIR, (filePath) => {
  stats.filesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  // 1. Check File Size
  if (lines.length > LINE_LIMIT) {
    console.warn(`⚠️  [BLOAT] ${relPath} is oversized (${lines.length} lines). Limit is ${LINE_LIMIT}.`);
    stats.oversizedFiles++;
  }

  // 2. Check Broad Selects
  if (content.includes(".select('*')") || content.includes('.select("*")')) {
    // Exception: Single record fetches are allowed to be broad for now
    if (!content.includes('.single()') && !content.includes('.maybeSingle()')) {
      console.warn(`❌ [QUERY] ${relPath} uses a broad select('*') on a list query.`);
      stats.broadSelects++;
    }
  }

  // 3. Check Component-level Fetches
  if (relPath.includes('src\\components') || relPath.includes('src/components')) {
    if (content.includes('supabase.from(')) {
      console.warn(`🟠 [ARCH] ${relPath} contains direct Supabase calls. Move to hooks or repositories.`);
      stats.componentFetches++;
    }
  }

  // 4. Check Heavy Limits
  const limitMatch = content.match(/\.limit\((\d+)\)/);
  if (limitMatch && parseInt(limitMatch[1], 10) >= 1000) {
    console.warn(`🚨 [HEAVY] ${relPath} uses an unusually high limit (${limitMatch[1]}).`);
    stats.heavyLimits++;
  }
});

console.log('\n--- AUDIT SUMMARY ---');
console.log(`Files Scanned:    ${stats.filesScanned}`);
console.log(`Oversized Files:  ${stats.oversizedFiles}`);
console.log(`Broad Selects:    ${stats.broadSelects}`);
console.log(`Component Fetches: ${stats.componentFetches}`);
console.log(`Heavy Limits:     ${stats.heavyLimits}`);
console.log('\nAudit complete. Fix the ❌ and 🚨 warnings to prevent regressions.\n');

// Exit with 0 as requested for the initial setup
process.exit(0);
