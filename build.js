const fs = require('fs');
const path = require('path');

// GitHub repository configuration
const GITHUB_CONFIG = {
  username: 'leekitleung',          // GitHub username
  repository: 'workflowy-forwarder', // Repository name
  branch: 'main',                    // Branch name
  scriptPath: 'dist/bundle.user.js'  // Path to script in repo
};

// Generate GitHub URLs
const GITHUB_URLS = {
  raw: `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.scriptPath}`,
  homepage: `https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}`,
  issues: `https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/issues`
};

// Userscript metadata
const metadata = `// ==UserScript==
// @name         WorkFlowy Reminder (Improved)
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @description  workflowy forwarder Plus
// @author       Namkit
// @homepage     ${GITHUB_URLS.homepage}
// @supportURL   ${GITHUB_URLS.issues}
// @updateURL    ${GITHUB_URLS.raw}
// @downloadURL  ${GITHUB_URLS.raw}
// @match        https://workflowy.com/*
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

`;

// Source files in order of dependency
const sourceFiles = [
  'src/config.js',
  'src/settings.js',
  'src/styles.js',
  'src/main.js'
];

// Process source content to remove imports/exports
function processContent(content) {
  return content
    // Remove import statements while keeping variable names
    .replace(/import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+(\w+)\s+from\s+['"][^'"]+['"];?/g, '')
    
    // Remove export keywords while keeping the declarations
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+/g, '')
    
    // Remove empty lines
    .replace(/^\s*[\r\n]/gm, '');
}

// Read and process source files
function buildBundle() {
  // Create build directory if it doesn't exist
  const buildDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  let bundle = metadata;
  
  // Wrap in IIFE with module initialization
  bundle += `(function() {
"use strict";

let settings;

`;
  
  // Concatenate source files
  sourceFiles.forEach(file => {
    try {
      const filePath = path.join(__dirname, file);
      console.log(`Processing file: ${file}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${file}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const processed = processContent(content);
      
      // Add file header comment
      bundle += `// Source: ${file}\n${processed}\n\n`;
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      throw error;
    }
  });
  
  // Add module initialization
  bundle += `
// Initialize modules
settings = new Settings();

// Start the application
initReminder();

})();`;
  
  // Write bundle file
  const bundlePath = path.join(buildDir, 'bundle.user.js');
  fs.writeFileSync(bundlePath, bundle);
  
  console.log('Bundle created successfully!');
  console.log('Output:', bundlePath);
}

// Add error handling
try {
  buildBundle();
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 