import { DEFAULT_CONFIG, CONFIG_SCHEMA } from './config.js';

class Settings {
  constructor() {
    this.config = this.loadConfig();
  }

  // Load config from localStorage, falling back to defaults
  loadConfig() {
    const saved = localStorage.getItem('reminder_config');
    if (!saved) {
      return DEFAULT_CONFIG;
    }
    
    try {
      const parsed = JSON.parse(saved);
      return this.migrateConfig(parsed);
    } catch (e) {
      console.error('Failed to load config:', e);
      return DEFAULT_CONFIG;
    }
  }

  // Handle config migrations/updates
  migrateConfig(oldConfig) {
    const newConfig = {...DEFAULT_CONFIG};
    
    // Merge old config with new defaults
    for (const [key, value] of Object.entries(oldConfig)) {
      if (key in newConfig) {
        newConfig[key] = this.mergeConfigValue(newConfig[key], value);
      }
    }
    
    return newConfig;
  }

  // Recursively merge config values
  mergeConfigValue(defaultValue, savedValue) {
    if (typeof defaultValue !== typeof savedValue) {
      return defaultValue;
    }
    
    if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
      const merged = {...defaultValue};
      for (const [key, value] of Object.entries(savedValue)) {
        if (key in defaultValue) {
          merged[key] = this.mergeConfigValue(defaultValue[key], value);
        }
      }
      return merged;
    }
    
    return savedValue;
  }

  // Save current config to localStorage
  saveConfig() {
    try {
      localStorage.setItem('reminder_config', JSON.stringify(this.config));
      return true;
    } catch (e) {
      console.error('Failed to save config:', e);
      return false;
    }
  }

  // Get a config value
  get(path) {
    return this.getConfigValue(this.config, path.split('.'));
  }

  // Set a config value
  set(path, value) {
    if (this.validateValue(path, value)) {
      this.setConfigValue(this.config, path.split('.'), value);
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Helper to get nested config values
  getConfigValue(obj, path) {
    return path.reduce((curr, key) => curr && curr[key], obj);
  }

  // Helper to set nested config values
  setConfigValue(obj, path, value) {
    const lastKey = path.pop();
    const target = path.reduce((curr, key) => curr[key], obj);
    target[lastKey] = value;
  }

  // Validate config values against schema
  validateValue(path, value) {
    const schemaType = this.getConfigValue(CONFIG_SCHEMA, path.split('.'));
    
    if (!schemaType) {
      return false;
    }

    if (Array.isArray(schemaType)) {
      return schemaType.includes(value);
    }

    switch (schemaType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'color':
        return /^#[0-9a-f]{6}$/i.test(value);
      default:
        return false;
    }
  }
}

export default new Settings();
