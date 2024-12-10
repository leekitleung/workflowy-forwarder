// Default configuration values
const DEFAULT_CONFIG = {
  theme: {
    mode: 'light',
    light: {
      background: '#ffffff',
      text: '#000000',
      border: '#cccccc',
      highlight: '#f0f0f0'
    },
    dark: {
      background: '#222222', 
      text: '#ffffff',
      border: '#444444',
      highlight: '#333333'
    }
  },
  nodes: {
    order: ['home', 'message', 'notification'], // Default order
    custom: [] // For user-defined nodes
  },
  shortcuts: {
    togglePanel: 'Alt+R',
    refresh: 'Alt+F'
  },
  tags: {
    // Default tag definitions
    read: {
      text: '已读',
      color: '#888888'
    },
    unread: {
      text: '未读',
      color: '#ff0000'  
    }
  },
  refresh: {
    interval: 30000, // 30 seconds
    enabled: true
  },
  defaultMode: 'home' // Default panel mode when opened
};

// Configuration schema for validation
const CONFIG_SCHEMA = {
  theme: {
    mode: ['light', 'dark'],
    light: {
      background: 'color',
      text: 'color',
      border: 'color',
      highlight: 'color'
    },
    dark: {
      background: 'color',
      text: 'color', 
      border: 'color',
      highlight: 'color'
    }
  },
  nodes: {
    order: 'array',
    custom: 'array'
  },
  shortcuts: {
    togglePanel: 'string',
    refresh: 'string'
  },
  tags: 'object',
  refresh: {
    interval: 'number',
    enabled: 'boolean'
  },
  defaultMode: 'string'
};

export { DEFAULT_CONFIG, CONFIG_SCHEMA };
