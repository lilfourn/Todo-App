#!/usr/bin/env node

/**
 * Generates latest.json for Tauri updater manually
 * This script is needed because tauri-action has a bug where it can't find
 * signature files when the app name contains spaces.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const REPO = process.env.GITHUB_REPOSITORY || 'lilfourn/Todo-App';
const VERSION = process.env.VERSION;
const TAG = `v${VERSION}`;

if (!VERSION) {
  console.error('❌ VERSION environment variable is required');
  process.exit(1);
}

// Platform mappings
const PLATFORMS = {
  'aarch64-apple-darwin': {
    tauriTarget: 'darwin-aarch64',
    tarGzName: 'Todo.App_aarch64.app.tar.gz',
    sigPath: 'src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Todo App.app.tar.gz.sig'
  },
  'x86_64-apple-darwin': {
    tauriTarget: 'darwin-x86_64',
    tarGzName: 'Todo.App_x64.app.tar.gz',
    sigPath: 'src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Todo App.app.tar.gz.sig'
  }
};

async function findSignatureFile(sigPath) {
  const fullPath = path.join(__dirname, '../../', sigPath);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }

  // Try alternative paths
  const altPath = sigPath.replace('/release/', '/release/bundle/');
  const altFullPath = path.join(__dirname, '../../', altPath);

  if (fs.existsSync(altFullPath)) {
    return altFullPath;
  }

  return null;
}

async function readSignature(sigPath) {
  const foundPath = await findSignatureFile(sigPath);

  if (!foundPath) {
    console.warn(`⚠️  Signature file not found: ${sigPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(foundPath, 'utf8').trim();
    console.log(`✅ Read signature from: ${foundPath}`);
    return content;
  } catch (error) {
    console.error(`❌ Error reading signature file ${foundPath}:`, error.message);
    return null;
  }
}

async function generateLatestJson() {
  console.log('\n🔧 Generating latest.json for Tauri updater...\n');
  console.log(`   Version: ${VERSION}`);
  console.log(`   Repository: ${REPO}`);
  console.log(`   Tag: ${TAG}\n`);

  const platforms = {};
  let foundAnySignature = false;

  // Process each platform
  for (const [target, config] of Object.entries(PLATFORMS)) {
    console.log(`📦 Processing ${config.tauriTarget}...`);

    const signature = await readSignature(config.sigPath);

    if (signature) {
      platforms[config.tauriTarget] = {
        signature,
        url: `https://github.com/${REPO}/releases/download/${TAG}/${config.tarGzName}`
      };
      foundAnySignature = true;
      console.log(`   ✅ Added ${config.tauriTarget} to platforms\n`);
    } else {
      console.log(`   ⚠️  Skipping ${config.tauriTarget} (no signature found)\n`);
    }
  }

  if (!foundAnySignature) {
    console.error('❌ No signature files found. Cannot generate latest.json');
    process.exit(1);
  }

  // Construct the latest.json
  const latestJson = {
    version: VERSION,
    notes: 'See the release notes for details.',
    pub_date: new Date().toISOString(),
    platforms
  };

  // Write to file
  const outputPath = path.join(__dirname, '../../latest.json');
  fs.writeFileSync(outputPath, JSON.stringify(latestJson, null, 2), 'utf8');

  console.log('✅ Generated latest.json successfully!\n');
  console.log('📄 Content:');
  console.log(JSON.stringify(latestJson, null, 2));
  console.log(`\n📁 Output: ${outputPath}\n`);

  return outputPath;
}

// Run the script
generateLatestJson().catch(error => {
  console.error('❌ Failed to generate latest.json:', error);
  process.exit(1);
});
