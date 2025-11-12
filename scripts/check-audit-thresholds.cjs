#!/usr/bin/env node

/**
 * Check Audit Thresholds
 * 
 * Reads npm-audit.json and cargo-audit.json files and enforces
 * desired thresholds without re-running audit commands.
 * 
 * Exit codes:
 *   0 - No high/critical vulnerabilities
 *   1 - High or critical vulnerabilities found
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

let hasFailures = false;

/**
 * Check npm audit results
 */
function checkNpmAudit() {
  const npmAuditPath = path.join(process.cwd(), 'npm-audit.json');
  
  if (!fs.existsSync(npmAuditPath)) {
    console.error(`${colors.red}Error: npm-audit.json not found${colors.reset}`);
    process.exit(1);
  }
  
  const auditData = JSON.parse(fs.readFileSync(npmAuditPath, 'utf8'));
  const vulns = auditData.metadata?.vulnerabilities || {};
  
  console.log(`${colors.bold}📦 npm Audit Threshold Check:${colors.reset}`);
  
  const critical = vulns.critical || 0;
  const high = vulns.high || 0;
  
  if (critical > 0) {
    console.log(`${colors.red}✗ ${critical} critical vulnerabilities (FAIL)${colors.reset}`);
    hasFailures = true;
  } else {
    console.log(`${colors.green}✓ 0 critical vulnerabilities${colors.reset}`);
  }
  
  if (high > 0) {
    console.log(`${colors.red}✗ ${high} high vulnerabilities (FAIL)${colors.reset}`);
    hasFailures = true;
  } else {
    console.log(`${colors.green}✓ 0 high vulnerabilities${colors.reset}`);
  }
  
  const moderate = vulns.moderate || 0;
  const low = vulns.low || 0;
  
  if (moderate > 0) {
    console.log(`${colors.yellow}⚠ ${moderate} moderate vulnerabilities (tracked, not blocking)${colors.reset}`);
  }
  
  if (low > 0) {
    console.log(`${colors.yellow}ℹ ${low} low vulnerabilities (tracked, not blocking)${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Check cargo audit results
 */
function checkCargoAudit() {
  const cargoAuditPath = path.join(process.cwd(), 'cargo-audit.json');
  
  if (!fs.existsSync(cargoAuditPath)) {
    console.error(`${colors.red}Error: cargo-audit.json not found${colors.reset}`);
    process.exit(1);
  }
  
  const auditData = JSON.parse(fs.readFileSync(cargoAuditPath, 'utf8'));
  const vulnerabilities = auditData.vulnerabilities?.list || [];
  
  console.log(`${colors.bold}🦀 Cargo Audit Threshold Check:${colors.reset}`);
  
  if (vulnerabilities.length === 0) {
    console.log(`${colors.green}✓ No vulnerabilities found${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ ${vulnerabilities.length} vulnerabilities found (FAIL)${colors.reset}`);
    vulnerabilities.forEach(vuln => {
      console.log(`  - ${vuln.advisory?.id || 'Unknown'}: ${vuln.advisory?.title || 'No title'}`);
    });
    hasFailures = true;
  }
  
  console.log('');
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}🔍 Checking Audit Thresholds...${colors.reset}\n`);
  
  checkNpmAudit();
  checkCargoAudit();
  
  if (hasFailures) {
    console.log(`${colors.red}${colors.bold}❌ Threshold check failed: High or critical vulnerabilities found${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✅ Threshold check passed: No high or critical vulnerabilities${colors.reset}`);
    process.exit(0);
  }
}

main();
