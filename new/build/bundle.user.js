// ==UserScript==
// @name         站内提醒
// @namespace    https://github.com/xxxxx/xxxxx
// @version      1.0.0
// @description  站内提醒
// @author       xxxxx
// @match        https://*.example.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
"use strict";

let settings;

// Source: src/config.js
// Default configuration valuesconst DEFAULT_CONFIG = {  theme: {    mode: 'light',    light: {      background: '#ffffff',      text: '#000000',      border: '#cccccc',      highlight: '#f0f0f0'    },    dark: {      background: '#222222',       text: '#ffffff',      border: '#444444',      highlight: '#333333'    }  },  nodes: {    order: ['home', 'message', 'notification'], // Default order    custom: [] // For user-defined nodes  },  shortcuts: {    togglePanel: 'Alt+R',    refresh: 'Alt+F'  },  tags: {    // Default tag definitions    read: {      text: '已读',      color: '#888888'    },    unread: {      text: '未读',      color: '#ff0000'      }  },  refresh: {    interval: 30000, // 30 seconds    enabled: true  },  defaultMode: 'home' // Default panel mode when opened};// Configuration schema for validationconst CONFIG_SCHEMA = {  theme: {    mode: ['light', 'dark'],    light: {      background: 'color',      text: 'color',      border: 'color',      highlight: 'color'    },    dark: {      background: 'color',      text: 'color',       border: 'color',      highlight: 'color'    }  },  nodes: {    order: 'array',    custom: 'array'  },  shortcuts: {    togglePanel: 'string',    refresh: 'string'  },  tags: 'object',  refresh: {    interval: 'number',    enabled: 'boolean'  },  defaultMode: 'string'};{ DEFAULT_CONFIG, CONFIG_SCHEMA };

// Source: src/settings.js
class Settings {  constructor() {    this.config = this.loadConfig();  }  // Load config from localStorage, falling back to defaults  loadConfig() {    const saved = localStorage.getItem('reminder_config');    if (!saved) {      return DEFAULT_CONFIG;    }    try {      const parsed = JSON.parse(saved);      return this.migrateConfig(parsed);    } catch (e) {      console.error('Failed to load config:', e);      return DEFAULT_CONFIG;    }  }  // Handle config migrations/updates  migrateConfig(oldConfig) {    const newConfig = {...DEFAULT_CONFIG};    // Merge old config with new defaults    for (const [key, value] of Object.entries(oldConfig)) {      if (key in newConfig) {        newConfig[key] = this.mergeConfigValue(newConfig[key], value);      }    }    return newConfig;  }  // Recursively merge config values  mergeConfigValue(defaultValue, savedValue) {    if (typeof defaultValue !== typeof savedValue) {      return defaultValue;    }    if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {      const merged = {...defaultValue};      for (const [key, value] of Object.entries(savedValue)) {        if (key in defaultValue) {          merged[key] = this.mergeConfigValue(defaultValue[key], value);        }      }      return merged;    }    return savedValue;  }  // Save current config to localStorage  saveConfig() {    try {      localStorage.setItem('reminder_config', JSON.stringify(this.config));      return true;    } catch (e) {      console.error('Failed to save config:', e);      return false;    }  }  // Get a config value  get(path) {    return this.getConfigValue(this.config, path.split('.'));  }  // Set a config value  set(path, value) {    if (this.validateValue(path, value)) {      this.setConfigValue(this.config, path.split('.'), value);      this.saveConfig();      return true;    }    return false;  }  // Helper to get nested config values  getConfigValue(obj, path) {    return path.reduce((curr, key) => curr && curr[key], obj);  }  // Helper to set nested config values  setConfigValue(obj, path, value) {    const lastKey = path.pop();    const target = path.reduce((curr, key) => curr[key], obj);    target[lastKey] = value;  }  // Validate config values against schema  validateValue(path, value) {    const schemaType = this.getConfigValue(CONFIG_SCHEMA, path.split('.'));    if (!schemaType) {      return false;    }    if (Array.isArray(schemaType)) {      return schemaType.includes(value);    }    switch (schemaType) {      case 'string':        return typeof value === 'string';      case 'number':        return typeof value === 'number' && !isNaN(value);      case 'boolean':        return typeof value === 'boolean';      case 'array':        return Array.isArray(value);      case 'object':        return typeof value === 'object' && value !== null;      case 'color':        return /^#[0-9a-f]{6}$/i.test(value);      default:        return false;    }  }}new Settings();

// Source: src/styles.js
// Theme-based CSS variablesconst createThemeStyles = (theme) => `  :root {    --background: ${theme.background};    --text: ${theme.text};    --border: ${theme.border};    --highlight: ${theme.highlight};  }`;// Base stylesconst baseStyles = `  .reminder-panel {    position: fixed;    top: 20px;    right: 20px;    background: var(--background);    color: var(--text);    border: 1px solid var(--border);    padding: 10px;    z-index: 9999;  }  .reminder-header {    border-bottom: 1px solid var(--border);    padding-bottom: 5px;    margin-bottom: 10px;  }  .reminder-content {    max-height: 400px;    overflow-y: auto;  }  .reminder-item {    padding: 5px;    border-bottom: 1px solid var(--border);  }  .reminder-item:hover {    background: var(--highlight);  }`;// Export stylesfunction applyStyles(settings) {  const theme = settings.get('theme');  const themeStyles = createThemeStyles(theme[theme.mode]);  GM_addStyle(themeStyles + baseStyles);}

// Source: src/main.js
// Initialize reminder panelfunction initReminder() {  // Apply styles  applyStyles(settings);  // Create panel  const panel = document.createElement('div');  panel.className = 'reminder-panel';  // Initialize based on settings  const mode = settings.get('defaultMode');  // ... rest of initialization code}// Start the applicationinitReminder();    


// Initialize modules
settings = new Settings();

// Start the application
initReminder();

})();