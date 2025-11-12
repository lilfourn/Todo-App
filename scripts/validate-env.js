#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * Validates that required environment variables are present and properly formatted
 * without exposing their actual values. Can also check if .env is tracked by git.
 * 
 * Usage:
 *   node scripts/validate-env.js           # Validate environment variables
 *   node scripts/validate-env.js --check-git  # Also check if .env is in git
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function error(message) {
  console.error(`${colors.red}✗ ERROR:${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
  console.warn(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Determine which environment file to use (precedence: .env.local > .env)
 */
function resolveEnvFile() {
  const envLocalPath = join(projectRoot, '.env.local');
  const envPath = join(projectRoot, '.env');
  
  if (existsSync(envLocalPath)) {
    info(`Using .env.local (takes precedence over .env)`);
    return { path: envLocalPath, name: '.env.local' };
  }
  
  if (existsSync(envPath)) {
    info(`Using .env`);
    return { path: envPath, name: '.env' };
  }
  
  return null;
}

/**
 * Check if environment file exists
 */
function checkEnvFileExists() {
  const envFile = resolveEnvFile();
  
  if (!envFile) {
    error('No environment file found (.env or .env.local)');
    info('Please copy .env.example to .env and fill in your Supabase credentials');
    info('Run: cp .env.example .env');
    return null;
  }
  
  success(`${envFile.name} file exists`);
  return envFile;
}

/**
 * Load and parse environment file
 */
function loadEnvFile(envFilePath) {
  const envContent = readFileSync(envFilePath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

/**
 * Validate required environment variables exist
 */
function validateRequiredVars(env) {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  let allPresent = true;
  
  for (const varName of required) {
    if (!env[varName] || env[varName].length === 0) {
      error(`Missing required variable: ${varName}`);
      allPresent = false;
    } else {
      success(`${varName} is present`);
    }
  }
  
  return allPresent;
}

/**
 * Validate Supabase URL format
 */
function validateSupabaseUrl(url) {
  // Normalize URL: trim whitespace and remove trailing slash
  const normalizedUrl = url.trim().replace(/\/$/, '');
  const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/;
  
  if (!urlPattern.test(normalizedUrl)) {
    error(`Invalid VITE_SUPABASE_URL format: "${url}"`);
    info('Expected format: https://your-project-ref.supabase.co');
    info('Note: Trailing slashes and whitespace are automatically removed');
    return false;
  }
  
  success('VITE_SUPABASE_URL format is valid');
  return true;
}

/**
 * Validate Supabase anon key format (JWT)
 */
function validateAnonKey(key) {
  if (!key.startsWith('eyJ')) {
    error('VITE_SUPABASE_ANON_KEY does not start with "eyJ" (not a JWT)');
    return false;
  }
  
  const parts = key.split('.');
  if (parts.length !== 3) {
    error(`VITE_SUPABASE_ANON_KEY has ${parts.length} parts, expected 3 (JWT format)`);
    return false;
  }
  
  success('VITE_SUPABASE_ANON_KEY format is valid (JWT)');
  return true;
}

/**
 * Check if environment files are tracked by git
 */
function checkGitTracking() {
  const filesToCheck = ['.env', '.env.local'];
  let allSafe = true;
  
  for (const file of filesToCheck) {
    try {
      const result = execSync(`git ls-files ${file}`, { 
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (result) {
        error(`${file} file is tracked by git!`);
        error('This is a CRITICAL SECURITY ISSUE - your secrets are exposed in git history');
        info('Immediate actions required:');
        info(`  1. Remove ${file} from git: git rm --cached ${file}`);
        info('  2. Commit the removal: git commit -m "Remove environment files from version control"');
        info('  3. Rotate your Supabase anon key in the Supabase dashboard');
        info('  4. Clean git history: Use git filter-branch or BFG Repo-Cleaner');
        allSafe = false;
      } else {
        success(`${file} is not tracked by git`);
      }
    } catch (err) {
      // If git command fails, we might not be in a git repo or file is not tracked
      if (err.status === 1 && err.stdout.trim() === '') {
        success(`${file} is not tracked by git`);
      } else {
        warning(`Could not check git status for ${file}: ${err.message}`);
      }
    }
  }
  
  return allSafe;
}

/**
 * Main validation function
 */
function main() {
  const args = process.argv.slice(2);
  const checkGit = args.includes('--check-git');
  
  console.log('\n🔍 Validating environment configuration...\n');
  
  let exitCode = 0;
  
  // Check if environment file exists and resolve which one to use
  const envFile = checkEnvFileExists();
  if (!envFile) {
    process.exit(1);
  }
  
  // Load environment variables
  let env;
  try {
    env = loadEnvFile(envFile.path);
  } catch (err) {
    error(`Failed to load ${envFile.name} file: ${err.message}`);
    process.exit(1);
  }
  
  // Validate required variables exist
  if (!validateRequiredVars(env)) {
    exitCode = 1;
  }
  
  // Validate URL format
  if (env.VITE_SUPABASE_URL && !validateSupabaseUrl(env.VITE_SUPABASE_URL)) {
    exitCode = 1;
  }
  
  // Validate anon key format
  if (env.VITE_SUPABASE_ANON_KEY && !validateAnonKey(env.VITE_SUPABASE_ANON_KEY)) {
    exitCode = 1;
  }
  
  // Check git tracking if requested
  if (checkGit && !checkGitTracking()) {
    exitCode = 1;
  }
  
  console.log('');
  
  if (exitCode === 0) {
    success('All environment validations passed!\n');
  } else {
    error('Environment validation failed. Please fix the issues above.\n');
  }
  
  process.exit(exitCode);
}

main();
