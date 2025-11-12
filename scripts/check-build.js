#!/usr/bin/env node

/**
 * Production Build Verification Script
 * 
 * Scans the production build output (dist/) to verify that no console statements
 * leaked through the terser minification process. This ensures the Vite configuration
 * is working correctly and production builds are clean.
 * 
 * Usage:
 *   npm run build:check
 * 
 * Exit codes:
 *   0 - Success: No console statements found
 *   1 - Failure: Console statements found or dist/ doesn't exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Console patterns to search for
const consolePatterns = [
  /console\.log\s*\(/g,
  /console\.error\s*\(/g,
  /console\.warn\s*\(/g,
  /console\.debug\s*\(/g,
  /console\.info\s*\(/g,
];

// Patterns to exclude (false positives in minified code)
const excludePatterns = [
  /console\.[a-z]\(/g, // Minified variable names like console.x(
];

/**
 * Recursively find all .js files in a directory
 */
function findJsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js') && !file.endsWith('.map')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if a line contains a console statement (excluding false positives)
 */
function hasConsoleStatement(line) {
  // Check if line matches any console pattern
  const hasPattern = consolePatterns.some(pattern => pattern.test(line));
  if (!hasPattern) return false;

  // Check if it's a false positive (minified variable name)
  const isFalsePositive = excludePatterns.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(line);
  });

  return !isFalsePositive;
}

/**
 * Scan a file for console statements
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    if (hasConsoleStatement(line)) {
      // Extract a snippet around the console statement
      const snippet = line.trim().substring(0, 100);
      violations.push({
        line: index + 1,
        snippet: snippet + (line.length > 100 ? '...' : ''),
      });
    }
  });

  return violations;
}

/**
 * Main verification function
 */
function verifyBuild() {
  const distDir = path.join(process.cwd(), 'dist');
  const assetsDir = path.join(distDir, 'assets');

  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error(`${colors.red}❌ Error: dist/ directory not found${colors.reset}`);
    console.error(`${colors.yellow}Run 'npm run build' first to create the production build${colors.reset}`);
    process.exit(1);
  }

  // Find all JavaScript files
  const jsFiles = findJsFiles(assetsDir);

  if (jsFiles.length === 0) {
    console.error(`${colors.yellow}⚠️  Warning: No JavaScript files found in dist/assets/${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.cyan}🔍 Scanning ${jsFiles.length} JavaScript files for console statements...${colors.reset}\n`);

  let totalViolations = 0;
  const filesWithViolations = [];

  // Scan each file
  jsFiles.forEach(filePath => {
    const violations = scanFile(filePath);
    if (violations.length > 0) {
      totalViolations += violations.length;
      filesWithViolations.push({ filePath, violations });
    }
  });

  // Report results
  if (totalViolations === 0) {
    console.log(`${colors.green}✅ Production build verified: No console statements found${colors.reset}`);
    console.log(`${colors.cyan}   Scanned ${jsFiles.length} files successfully${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.red}❌ Console statements found in production build:${colors.reset}\n`);

    filesWithViolations.forEach(({ filePath, violations }) => {
      const relativePath = path.relative(process.cwd(), filePath);
      console.error(`${colors.yellow}${relativePath}${colors.reset}`);

      violations.forEach(({ line, snippet }) => {
        console.error(`  ${colors.cyan}Line ${line}:${colors.reset} ${snippet}`);
      });

      console.error(''); // Empty line for spacing
    });

    console.error(`${colors.red}Total violations: ${totalViolations}${colors.reset}`);
    console.error(`${colors.yellow}Fix: Ensure vite.config.ts has terserOptions.compress.drop_console = true${colors.reset}\n`);
    process.exit(1);
  }
}

// Run verification
verifyBuild();
