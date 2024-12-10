// Base styles
const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Aclonica&display=swap');
    
    /* 处理以 http:// 或 https:// 开头的链接文本 */
    [href^="http://"],
    [href^="https://"] {
        display: inline-block;
        max-width: 30ch;  /* 限制最大宽度为30个字符 */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
    }
        
    .right-bar > div:first-child {
        width: 300px !important;
    }
    
    .reminder-panel {
        position: fixed;
        top: 0;
        right: -300px;
        width: 300px;
        height: 100vh;
        background: #2c3135;
        border-left: 1px solid #444;
        transition: right 0.3s ease;
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .reminder-panel.visible {
        right: 0;
    }

    .panel-header {
        padding: 15px;
        border-bottom: 1px solid #444;
        background: #2c3135;
    }

    .panel-header h1 {
        margin: 0;
        font-size: 18px;
        color: #e8e8e8;
        font-weight: normal;
    }

    .mode-switch {
        display: flex;
        gap: 5px;
        margin-top: 10px;
    }

    .mode-btn {
        flex: 1;
        padding: 5px;
        border: 1px solid #444;
        background: #42484b;
        color: #e8e8e8;
        cursor: pointer;
        font-size: 14px;
        border-radius: 4px;
    }

    .mode-btn.active {
        background: #4a9eff;
        border-color: #4a9eff;
    }

    .planner-links {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .planner-link {
        display: none;
        padding: 8px;
        text-decoration: none;
        color: #e8e8e8;
        background: #42484b;
        border: 1px solid #444;
        border-radius: 4px;
        font-size: 14px;
        align-items: center;
        justify-content: center;
    }

    .planner-link:hover {
        background: #4a9eff;
        border-color: #4a9eff;
    }

    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        background: #2c3135;
    }

    .reminder-toggle {
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        padding: 10px;
        background: #2c3135;
        border: 1px solid #444;
        border-right: none;
        cursor: pointer;
        z-index: 999;
        border-radius: 4px 0 0 4px;
    }

    .reminder-toggle.active {
        right: 300px;
    }

    .toggle-arrow {
        width: 16px;
        height: 16px;
        transition: transform 0.3s ease;
        color: #e8e8e8;
    }

    .active .toggle-arrow {
        transform: rotate(180deg);
    }

    .follow-links-wrapper .follow-link {
        display: none;
    }

    .reminder-block {
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
    }

    .reminder-block-title {
        font-family: "Aclonica", sans-serif;
        font-weight: 400;
        font-style: normal;
        font-style: italic;
        color: #d9dbdb;
        font-size: 14px;
        margin-bottom: 4px;
        padding: 4px;
        font-weight: bold;
    }

    .reminder-item {
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 6px;
        position: relative;
        border: 1px solid rgba(58, 67, 71, 1);
        transition: opacity 0.3s ease;
        font-size: 14px;
        background: rgba(53, 60, 63, 1);
    }

    .reminder-item.colored,
    .reminder-item.highlighted {
        background: var(--node-color);
        border-color: var(--node-border-color);
        color: var(--text-color);
    }

    .reminder-item.colored:hover {
        background: var(--node-color-hover);
        border-color: var(--node-border-color-hover);
    }

    .reminder-item.highlighted:hover {
        background: var(--node-color-hover);
        border-color: var(--node-border-color-hover);
    }

    .reminder-item {
        transition: background-color 0.2s ease,
                    border-color 0.2s ease;
    }

    .reminder-item.completed {
        opacity: 0.6;
    }

    .reminder-item.completed .reminder-item-name {
        text-decoration: line-through;
        color: #9ea1a2;
    }

    .collect-mode .reminder-checkbox-wrapper {
        position: absolute;
        left: 0px;
        top: 0px;
        display: flex;
        align-items: center;
    }

    .reminder-checkbox-wrapper {
        position: absolute;
        left: 10px;
        top: 13px;
        display: flex;
        align-items: center;
    }

    .reminder-checkbox {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border: 1px solid #5c6062;
        border-radius: 3px;
        background: transparent;
        cursor: pointer;
        position: relative;
        margin: 0;
    }

    .reminder-checkbox:checked {
        background: #4a9eff;
        border-color: #4a9eff;
    }

    .reminder-checkbox:checked::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 0px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 1px 1px 0;
        transform: rotate(45deg);
    }

    .reminder-item-content {
        padding-left: 20px;
    }

    .reminder-item-name {
        font-size: 14px;
        color: rgba(158, 161, 162, 1);
        line-height: 1.2;
        word-break: break-word;
        cursor: pointer;
    }

    .has-mirrors::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #4a9eff;
        border-radius: 3px 0 0 3px;
        opacity: 0.6;
    }

    .reminder-actions {
        position: absolute;
        right: 10px;
        top: 9px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease, background-color 0.2s ease;
        z-index: 2;
        padding: 4px 8px;
        border-radius: 4px;
    }

    .reminder-item:hover .reminder-actions {
        opacity: 1;
        background: linear-gradient(to right, transparent, rgba(56, 70, 81, 0.8) 50%, rgba(56, 70, 81, 0.8));
    }

    .reminder-item.colored:hover .reminder-actions,
    .reminder-item.highlighted:hover .reminder-actions {
        background: var(--actions-bg-hover);
    }

    .reminder-action-btn.copy,
    .reminder-action-btn.open,
    .reminder-action-btn.remove {
        background-size: 14px 14px;
        background-position: center;
        background-repeat: no-repeat;
        width: 14px;
        height: 14px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 2px;
        border: none;
        cursor: pointer;
    }

    .reminder-action-btn.copy {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8e8e8'%3E%3Cpath d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E");
    }

    .reminder-action-btn.open {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8e8e8'%3E%3Cpath d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z'/%3E%3C/svg%3E");
    }

    .reminder-action-btn.remove {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8e8e8'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
    }

    .collect-mode .reminder-actions {
        display: flex;
        gap: 4px;
        right: 2px;
        top: 4px;
    }

    .collect-mode .single-content,
    .collect-mode .children-content {
        font-size: 14px;
        color: #9ea1a2;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        cursor: pointer;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        position: relative;
    }

    .collect-mode .single-content-item,
    .collect-mode .children-content-item {
        color: rgba(158, 161, 162, 1);
        line-height: 1.2;
    }

    .reminder-item:hover {
        border-color: rgba(68, 80, 88, 1);
        background: rgba(56, 70, 81, 1);
    }

    .reminder-item:hover .reminder-item-name {
        color: rgba(217, 217, 217, 1);
    }

    .collect-mode.reminder-item:hover .single-content-item,
    .collect-mode.reminder-item:hover .children-content-item {
        color: rgba(217, 217, 217, 1);
    }

    .collect-mode.reminder-item.completed {
        opacity: 0.6;
    }

    .collect-mode.reminder-item.completed .single-content,
    .collect-mode.reminder-item.completed .children-content {
        text-decoration: line-through;
        color: #808080;
    }

    .action-feedback {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
    }

    #shortcut-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 10001;
    }

    #shortcut-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        visibility: visible;
    }

    .clear-all-container {
        padding: 12px;
        background: #2c3135;
        border-top: 1px solid #444;
        flex-shrink: 0;
    }

    .clear-all-btn {
        width: 100%;
        height: 32px;
        background: #42484b;
        color: #e8e8e8;
        border: none;
        border-radius: 22px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s;
    }

    .clear-all-btn:hover {
        background: #d9534f;
    }

    .reminder-list {
        margin-bottom: 60px;
    }

    .panel-content {
        padding-bottom: 80px;
    }

    .version-tag {
        font-size: 8px;
        color: #8b9398;
        font-weight: normal;
        margin-left: 8px;
        padding: 0px 2px;
        background: #2a3135;
        border-radius: 4px;
        display: inline-block;
        vertical-align: middle;
        line-height: 1.5;
        border: 1px solid #444;
    }

    .no-reminders {
        text-align: center;
        color: #a8a8a8;
        font-size: 14px;
        padding: 20px;
        line-height: 1.6;
    }
`;

// Export styles
export function applyStyles() {
    GM_addStyle(baseStyles);
}