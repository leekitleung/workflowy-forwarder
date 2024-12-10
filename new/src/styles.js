// Theme-based CSS variables
const createThemeStyles = (theme) => `
  :root {
    --background: ${theme.background};
    --text: ${theme.text};
    --border: ${theme.border};
    --highlight: ${theme.highlight};
  }
`;

// Base styles
const baseStyles = `
  .reminder-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--background);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 10px;
    z-index: 9999;
  }

  .reminder-header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  .reminder-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .reminder-item {
    padding: 5px;
    border-bottom: 1px solid var(--border);
  }

  .reminder-item:hover {
    background: var(--highlight);
  }
`;

// Export styles
export function applyStyles(settings) {
  const theme = settings.get('theme');
  const themeStyles = createThemeStyles(theme[theme.mode]);
  GM_addStyle(themeStyles + baseStyles);
}