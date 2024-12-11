const fs = require('fs');
const path = require('path');

// 读取元数据模板
const metadata = `// ==UserScript==
// @name         WorkFlowy Reminder (Improved)
// @namespace    http://tampermonkey.net/
// @version      ${process.env.npm_package_version || '1.0.0'}
// @description  workflowy forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_notification
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/leekitleung/workflowy-forwarder/main/dist/bundle.user.js
// @downloadURL  https://raw.githubusercontent.com/leekitleung/workflowy-forwarder/main/dist/bundle.user.js
// ==/UserScript==
`;

// 读取主代码文件
const mainCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

// 组合完整的用户脚本
const userScript = metadata + '\n' + mainCode;

// 确保dist目录存在
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'));
}

// 写入构建后的文件
fs.writeFileSync(
  path.join(__dirname, 'dist/bundle.user.js'),
  userScript,
  'utf8'
);

console.log('Build completed successfully!'); 