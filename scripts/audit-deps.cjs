#!/usr/bin/env node

/**
 * Dependency Audit Script
 * 
 * Runs both npm and cargo audits and provides detailed reporting
 * with actionable recommendations.
 * 
 * Usage:
 *   node scripts/audit-deps.js
 *   node scripts/audit-deps.js --json
 *   node scripts/audit-deps.js --fail-on-moderate
 *   node scripts/audit-deps.js --save-report audit-report.txt
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const failOnModerate = args.includes('--fail-on-moderate');
const saveReportIndex = args.indexOf('--save-report');
const saveReportPath = saveReportIndex !== -1 ? args[saveReportIndex + 1] : null;

// Results storage
const results = {
  npm: null,
  cargo: null,
  summary: {
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  },
  recommendations: [],
};

/**
 * Run npm audit
 */
function runNpmAudit() {
  console.log(`${colors.cyan}🔍 Running npm Audit...${colors.reset}\n`);
  
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(output);
    
    results.npm = {
      vulnerabilities: audit.metadata?.vulnerabilities || {},
      total: audit.metadata?.vulnerabilities?.total || 0,
    };
    
    const vulns = results.npm.vulnerabilities;
    
    console.log(`${colors.bold}📦 npm Audit Results:${colors.reset}`);
    
    if (vulns.critical > 0) {
      console.log(`${colors.red}✗ ${vulns.critical} critical vulnerabilities${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ 0 critical vulnerabilities${colors.reset}`);
    }
    
    if (vulns.high > 0) {
      console.log(`${colors.red}✗ ${vulns.high} high vulnerabilities${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ 0 high vulnerabilities${colors.reset}`);
    }
    
    if (vulns.moderate > 0) {
      console.log(`${colors.yellow}⚠ ${vulns.moderate} moderate vulnerabilities${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ 0 moderate vulnerabilities${colors.reset}`);
    }
    
    if (vulns.low > 0) {
      console.log(`${colors.cyan}ℹ ${vulns.low} low vulnerabilities${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ 0 low vulnerabilities${colors.reset}`);
    }
    
    // Update summary
    results.summary.critical += vulns.critical || 0;
    results.summary.high += vulns.high || 0;
    results.summary.moderate += vulns.moderate || 0;
    results.summary.low += vulns.low || 0;
    results.summary.total += results.npm.total;
    
    // Add recommendations
    if (vulns.critical > 0 || vulns.high > 0) {
      results.recommendations.push("Run 'npm audit fix' to automatically fix vulnerabilities");
    }
    if (vulns.moderate > 0) {
      results.recommendations.push("Review moderate vulnerabilities (may not be exploitable in this context)");
    }
    
  } catch (error) {
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout);
        results.npm = {
          vulnerabilities: audit.metadata?.vulnerabilities || {},
          total: audit.metadata?.vulnerabilities?.total || 0,
        };
        
        const vulns = results.npm.vulnerabilities;
        
        console.log(`${colors.bold}📦 npm Audit Results:${colors.reset}`);
        console.log(`${colors.red}✗ ${vulns.critical || 0} critical vulnerabilities${colors.reset}`);
        console.log(`${colors.red}✗ ${vulns.high || 0} high vulnerabilities${colors.reset}`);
        console.log(`${colors.yellow}⚠ ${vulns.moderate || 0} moderate vulnerabilities${colors.reset}`);
        console.log(`${colors.cyan}ℹ ${vulns.low || 0} low vulnerabilities${colors.reset}`);
        
        // Update summary
        results.summary.critical += vulns.critical || 0;
        results.summary.high += vulns.high || 0;
        results.summary.moderate += vulns.moderate || 0;
        results.summary.low += vulns.low || 0;
        results.summary.total += results.npm.total;
        
        results.recommendations.push("Run 'npm audit fix' to automatically fix vulnerabilities");
      } catch (parseError) {
        console.error(`${colors.red}Error parsing npm audit output${colors.reset}`);
        results.npm = { error: 'Failed to parse npm audit output' };
      }
    } else {
      console.error(`${colors.red}Error running npm audit${colors.reset}`);
      results.npm = { error: error.message };
    }
  }
  
  console.log('');
}

/**
 * Run cargo audit
 */
function runCargoAudit() {
  console.log(`${colors.cyan}🔍 Running Cargo Audit...${colors.reset}\n`);
  
  try {
    const output = execSync('cd src-tauri && cargo audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(output);
    
    const vulnerabilities = audit.vulnerabilities?.list || [];
    
    results.cargo = {
      vulnerabilities: vulnerabilities.length,
      advisories: vulnerabilities,
    };
    
    console.log(`${colors.bold}🦀 Cargo Audit Results:${colors.reset}`);
    
    if (vulnerabilities.length === 0) {
      console.log(`${colors.green}✓ No vulnerabilities found${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ ${vulnerabilities.length} vulnerabilities found${colors.reset}`);
      
      vulnerabilities.forEach(vuln => {
        console.log(`  - ${vuln.advisory?.id || 'Unknown'}: ${vuln.advisory?.title || 'No title'}`);
      });
      
      // Update summary (cargo vulnerabilities are typically high severity)
      results.summary.high += vulnerabilities.length;
      results.summary.total += vulnerabilities.length;
      
      results.recommendations.push("Update vulnerable Rust dependencies in Cargo.toml");
      results.recommendations.push("Run 'cargo update' to update within semver ranges");
    }
    
  } catch (error) {
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout);
        const vulnerabilities = audit.vulnerabilities?.list || [];
        
        results.cargo = {
          vulnerabilities: vulnerabilities.length,
          advisories: vulnerabilities,
        };
        
        console.log(`${colors.bold}🦀 Cargo Audit Results:${colors.reset}`);
        console.log(`${colors.red}✗ ${vulnerabilities.length} vulnerabilities found${colors.reset}`);
        
        vulnerabilities.forEach(vuln => {
          console.log(`  - ${vuln.advisory?.id || 'Unknown'}: ${vuln.advisory?.title || 'No title'}`);
        });
        
        // Update summary
        results.summary.high += vulnerabilities.length;
        results.summary.total += vulnerabilities.length;
        
        results.recommendations.push("Update vulnerable Rust dependencies in Cargo.toml");
      } catch (parseError) {
        console.error(`${colors.red}Error parsing cargo audit output${colors.reset}`);
        results.cargo = { error: 'Failed to parse cargo audit output' };
      }
    } else {
      console.error(`${colors.red}Error running cargo audit${colors.reset}`);
      console.error(`${colors.yellow}Note: cargo-audit may not be installed. Run: cargo install cargo-audit --locked${colors.reset}`);
      results.cargo = { error: error.message };
    }
  }
  
  console.log('');
}

/**
 * Print summary
 */
function printSummary() {
  console.log(`${colors.bold}📊 Summary:${colors.reset}`);
  console.log(`Total: ${results.summary.total} vulnerabilities`);
  
  const actionRequired = results.summary.critical + results.summary.high;
  if (actionRequired > 0) {
    console.log(`${colors.red}Action Required: ${actionRequired} (high/critical)${colors.reset}`);
  } else {
    console.log(`${colors.green}Action Required: 0 (high/critical)${colors.reset}`);
  }
  
  console.log('');
  
  if (results.recommendations.length > 0) {
    console.log(`${colors.bold}💡 Recommendations:${colors.reset}`);
    results.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });
    console.log('');
  }
}

/**
 * Determine exit code
 */
function getExitCode() {
  const criticalOrHigh = results.summary.critical + results.summary.high;
  
  if (criticalOrHigh > 0) {
    console.log(`${colors.red}❌ Audit failed (critical/high vulnerabilities found)${colors.reset}`);
    return 1;
  }
  
  if (failOnModerate && results.summary.moderate > 0) {
    console.log(`${colors.yellow}⚠ Audit failed (moderate vulnerabilities found, --fail-on-moderate enabled)${colors.reset}`);
    return 2;
  }
  
  console.log(`${colors.green}✅ Audit passed (no critical/high vulnerabilities)${colors.reset}`);
  return 0;
}

/**
 * Save report to file
 */
function saveReport(filePath) {
  const report = `
Dependency Audit Report
Generated: ${new Date().toISOString()}

npm Audit Results:
- Critical: ${results.npm?.vulnerabilities?.critical || 0}
- High: ${results.npm?.vulnerabilities?.high || 0}
- Moderate: ${results.npm?.vulnerabilities?.moderate || 0}
- Low: ${results.npm?.vulnerabilities?.low || 0}

Cargo Audit Results:
- Vulnerabilities: ${results.cargo?.vulnerabilities || 0}

Summary:
- Total: ${results.summary.total}
- Critical: ${results.summary.critical}
- High: ${results.summary.high}
- Moderate: ${results.summary.moderate}
- Low: ${results.summary.low}

Recommendations:
${results.recommendations.map(r => `- ${r}`).join('\n')}
`;
  
  fs.writeFileSync(filePath, report);
  console.log(`${colors.green}Report saved to: ${filePath}${colors.reset}`);
}

/**
 * Main execution
 */
function main() {
  if (outputJson) {
    // JSON output mode - suppress console output
    const originalLog = console.log;
    console.log = () => {};
    
    runNpmAudit();
    runCargoAudit();
    
    console.log = originalLog;
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(getExitCode());
  } else {
    // Normal output mode
    console.log(`${colors.bold}${colors.cyan}🔍 Running Dependency Security Audit...${colors.reset}\n`);
    
    runNpmAudit();
    runCargoAudit();
    printSummary();
    
    if (saveReportPath) {
      saveReport(saveReportPath);
    }
    
    process.exit(getExitCode());
  }
}

main();
