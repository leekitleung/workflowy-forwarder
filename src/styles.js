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
        right: -319px;
        top: 46px;
        height: calc(100vh - 46px);
        width: 319px;
        background: #2B3135;
        border-left: 1px solid #5c6062;
        z-index: 100;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
    }
    
    .reminder-panel.visible {
        transform: translateX(-319px);
    }
    
    .reminder-panel.visible ~ #content {
        padding-right: 319px;
    }
    
    #content {
        transition: padding-right 0.3s ease;
    }
    
    #content.panel-visible {
        padding-right: 319px;
    }
    
    .panel-header {
        padding: 24px 12px 12px;
        flex-shrink: 0;
    }
        .panel-header h1{
            font-size: 20px;
            margin: 0 0 12px 0;
            color: rgb(217 219 219);
        }
    
    .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 0 12px;
    }
    
    .panel-content::-webkit-scrollbar {
        width: 8px;
    }
    
    .panel-content::-webkit-scrollbar-track {
        background: #353c3f;
    }
    
    .panel-content::-webkit-scrollbar-thumb {
        background: #636a6d;
        border-radius: 4px;
    }
    
    .reminder-toggle {
        position: fixed;
        right: 20px;
        top: 60px;
        background: #2B3135;
        border: none;
        padding: 8px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 101;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    
    
    
    .reminder-toggle:hover {
        background: #363b3f;
    }
    
    .reminder-toggle.active .toggle-arrow {
        transform: rotate(180deg);
    }
    
    .reminder-toggle::after {
        font-size: 10px;  /* Updated font size */
    }
    
    .reminder-toggle:hover::after {
        opacity: 1;
    }
    
    .toggle-arrow {
        width: 16px;
        height: 16px;
        color: rgba(158, 161, 162, 1);
        transition: transform 0.3s ease;
    }
    
    .mode-switch {
        display: flex;
        background: rgba(39, 45, 50, 1);
        border-radius: 6px;
        padding: 6px;
    }
    
    .mode-btn {
        flex: 1;
        padding: 6px 10px;
        border: none;
        background: transparent;
        color: #9EA1A2;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.3s;
        font-size: 14px;
        margin: 2px;
    }
    
    .mode-btn.active {
        background: rgba(56, 70, 81, 1);
        color:rgba(207, 234, 249, 1);
    }
    
    .mode-btn:hover {
        background: rgba(53, 125, 166, 1);
        color:rgba(185, 207, 221, 1);
    }
    
    .planner-links {
        display: flex;
        flex-direction: column;
        gap: 0px;  /* 减小链接之间的间距 */
    }
    
    .planner-link {
        display: flex;
        justify-content: flex-end;
        color: rgba(144, 147, 149, 0.5);
        font-size: 12px;
        text-decoration: none;
        padding: 8px 16px 8px;
        margin-right: 8px;
        border-radius: 4px;
        transition: all 0.3s;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M4.4632 3.60609L5.0693 3L8.06933 6.00003L5.0693 9.00006L4.4632 8.39397L6.85714 6.00003L4.4632 3.60609Z' fill='%23909395' fill-opacity='0.5'/%3E%3Cpath d='M6 12C2.68629 12 -4.07115e-07 9.31371 -2.62268e-07 6C-1.17422e-07 2.68629 2.68629 -4.07115e-07 6 -2.62268e-07C9.31371 -1.17422e-07 12 2.68629 12 6C12 9.31371 9.31371 12 6 12ZM6 11.1429C8.84032 11.1429 11.1429 8.84032 11.1429 6C11.1429 3.15968 8.84032 0.857143 6 0.857143C3.15968 0.857142 0.857142 3.15968 0.857142 6C0.857142 8.84032 3.15968 11.1429 6 11.1429Z' fill='%23909395' fill-opacity='0.5'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px;
        background-size: 12px;
    }
    
    .planner-link:hover{
        color: rgba(53, 125, 166, 1);
        text-decoration: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M4.4632 3.60609L5.0693 3L8.06933 6.00003L5.0693 9.00006L4.4632 8.39397L6.85714 6.00003L4.4632 3.60609Z' fill='%23357DA6'/%3E%3Cpath d='M6 12C2.68629 12 -4.07115e-07 9.31371 -2.62268e-07 6C-1.17422e-07 2.68629 2.68629 -4.07115e-07 6 -2.62268e-07C9.31371 -1.17422e-07 12 2.68629 12 6C12 9.31371 9.31371 12 6 12ZM6 11.1429C8.84032 11.1429 11.1429 8.84032 11.1429 6C11.1429 3.15968 8.84032 0.857143 6 0.857143C3.15968 0.857142 0.857142 3.15968 0.857142 6C0.857142 8.84032 3.15968 11.1429 6 11.1429Z' fill='%23357DA6'/%3E%3C/svg%3E");
    }
    
    .planner-links-row {
        display: flex;
        justify-content: space-between;  /* 改为两端对齐 */
        flex-direction: row;
        gap: 8px;
        width: 100%;                     /* 确保占满整个容器宽度 */
    }
    
    
    .planner-links-row .today-link {
        display: flex !important;        /* 强制显示 */
        margin-right: auto;             /* 让元素左对齐 */
        background-image: none;
        padding-left: 4px;
    }
    
    
    .today-link::before {
        content: '';
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 4px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M8.5 1H8V0H7V1H3V0H2V1H1.5C0.67 1 0 1.67 0 2.5V9.5C0 10.33 0.67 11 1.5 11H8.5C9.33 11 10 10.33 10 9.5V2.5C10 1.67 9.33 1 8.5 1ZM9 9.5C9 9.78 8.78 10 8.5 10H1.5C1.22 10 1 9.78 1 9.5V4H9V9.5ZM9 3H1V2.5C1 2.22 1.22 2 1.5 2H2V3H3V2H7V3H8V2H8.5C8.78 2 9 2.22 9 2.5V3Z' fill='%23909395' fill-opacity='0.5'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        vertical-align: middle;
    }
    
    .today-link:hover::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M8.5 1H8V0H7V1H3V0H2V1H1.5C0.67 1 0 1.67 0 2.5V9.5C0 10.33 0.67 11 1.5 11H8.5C9.33 11 10 10.33 10 9.5V2.5C10 1.67 9.33 1 8.5 1ZM9 9.5C9 9.78 8.78 10 8.5 10H1.5C1.22 10 1 9.78 1 9.5V4H9V9.5ZM9 3H1V2.5C1 2.22 1.22 2 1.5 2H2V3H3V2H7V3H8V2H8.5C8.78 2 9 2.22 9 2.5V3Z' fill='%23357DA6'/%3E%3C/svg%3E");
    }
    
    .follow-links-wrapper {
        display: flex;
        gap: 0px;  /* 将间距从12px减小到4px */
        justify-content: flex-end;
    }
    
    .follow-links-wrapper .follow-link {
    
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
    
    /* 带颜色卡片的悬浮效果 */
    .reminder-item.colored:hover {
        background: var(--node-color-hover);
        border-color: var(--node-border-color-hover);
    }
    
    /* 高亮卡片的悬浮效果 */
    .reminder-item.highlighted:hover {
        background: var(--node-color-hover);
        border-color: var(--node-border-color-hover);
    }
    
    /* 添加过渡动画 */
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
        opacity: 0;  /* 默认隐藏 */
        transition: opacity 0.2s ease, background-color 0.2s ease;
        z-index: 2;
        padding: 4px 8px;
        border-radius: 4px;
        
    }
    
    
    .reminder-item:hover .reminder-actions {
    
        opacity: 1;
        background: linear-gradient(to right, transparent, rgba(56, 70, 81, 0.8) 50%, rgba(56, 70, 81, 0.8));
    
    }
    
    /* 带颜色的卡片 actions 悬浮样式 */
    .reminder-item.colored:hover .reminder-actions,
    .reminder-item.highlighted:hover .reminder-actions {
        background: var(--actions-bg-hover);
    }
    
    .reminder-action-btn {
    }
    
    .reminder-action-btn:hover {
    }
    
    .reminder-action-btn.copy,.reminder-action-btn.open,.reminder-action-btn.remove  {
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
    }
    
    .reminder-action-btn.copy{
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234C5861'/%3E%3Cpath d='M5.34119 10.6494L7.33176 8.65881L7.99529 9.32233L6.00472 11.3129C5.08858 12.229 3.60323 12.229 2.6871 11.3129C1.77097 10.3968 1.77097 8.91142 2.6871 7.99528L4.67767 6.00472L5.34119 6.66824L3.35062 8.65881C2.80094 9.20849 2.80094 10.0997 3.35062 10.6494C3.9003 11.1991 4.79151 11.1991 5.34119 10.6494Z' fill='%239EA1A2'/%3E%3Cpath d='M9.32233 7.99528L8.65881 7.33176L10.6494 5.34119C11.1991 4.79151 11.1991 3.9003 10.6494 3.35062C10.0997 2.80094 9.20849 2.80094 8.65881 3.35062L6.66824 5.34119L6.00472 4.67767L7.99528 2.6871C8.91142 1.77097 10.3968 1.77097 11.3129 2.6871C12.229 3.60323 12.229 5.08858 11.3129 6.00472L9.32233 7.99528Z' fill='%239EA1A2'/%3E%3Cpath d='M7.99543 5.34121L8.65895 6.00473L6.00486 8.65883L5.34133 7.9953L7.99543 5.34121Z' fill='%239EA1A2'/%3E%3C/svg%3E");
        background-position: center;
    }
    
    .reminder-action-btn.open{
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234C5861'/%3E%3Cpath d='M4 3.01014L5.00844 2L10 7L5.00844 12L4 10.9899L7.98312 7L4 3.01014Z' fill='%239EA1A2'/%3E%3C/svg%3E");
    }
    
    .reminder-action-btn.remove{
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect opacity='0.2' width='14' height='14' rx='2' fill='%239EA1A2'/%3E%3Cpath d='M7.00001 7.92035L10.0796 11L11 10.0796L7.92037 7L11 3.92038L10.0796 3.00003L7.00001 6.07965L3.92035 3L3 3.92035L6.07966 7L3 10.0796L3.92035 11L7.00001 7.92035Z' fill='%239EA1A2'/%3E%3C/svg%3E");
    }
    
    .reminder-action-btn.copy:hover {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234988B1'/%3E%3Cpath d='M5.34119 10.6494L7.33176 8.65881L7.99529 9.32233L6.00472 11.3129C5.08858 12.229 3.60323 12.229 2.6871 11.3129C1.77097 10.3968 1.77097 8.91142 2.6871 7.99528L4.67767 6.00472L5.34119 6.66824L3.35062 8.65881C2.80094 9.20849 2.80094 10.0997 3.35062 10.6494C3.9003 11.1991 4.79151 11.1991 5.34119 10.6494Z' fill='white'/%3E%3Cpath d='M9.32233 7.99528L8.65881 7.33176L10.6494 5.34119C11.1991 4.79151 11.1991 3.9003 10.6494 3.35062C10.0997 2.80094 9.20849 2.80094 8.65881 3.35062L6.66824 5.34119L6.00472 4.67767L7.99528 2.6871C8.91142 1.77097 10.3968 1.77097 11.3129 2.6871C12.229 3.60323 12.229 5.08858 11.3129 6.00472L9.32233 7.99528Z' fill='white'/%3E%3Cpath d='M7.99543 5.34121L8.65895 6.00473L6.00486 8.65883L5.34133 7.9953L7.99543 5.34121Z' fill='white'/%3E%3C/svg%3E");
    
    }
    
    .reminder-action-btn.open:hover {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%2346A753'/%3E%3Cpath d='M4 3.01014L5.00844 2L10 7L5.00844 12L4 10.9899L7.98312 7L4 3.01014Z' fill='white'/%3E%3C/svg%3E");
    }
    
    .reminder-action-btn.remove:hover {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%23B04042'/%3E%3Cpath d='M7.00001 7.92035L10.0796 11L11 10.0796L7.92037 7L11 3.92038L10.0796 3.00003L7.00001 6.07965L3.92035 3L3 3.92035L6.07966 7L3 10.0796L3.92035 11L7.00001 7.92035Z' fill='white'/%3E%3C/svg%3E");
    
    }
    
    .collect-mode.reminder-item {
        background: rgba(53, 60, 63, 1);
        border: 1px solid rgba(58, 67, 71, 1);
        padding: 10px;
        margin-bottom: 10px;
        position: relative;
    }
    
    .collect-mode .parent-title {
        margin-bottom: 2px;
        padding-bottom: 4px;
        color: rgba(144, 147, 149, 0.5);
        font-size: 10px;
    }
    
    .collect-mode .children-content {
        white-space: pre-wrap;
        font-size: 14px;
        color: rgba(158, 161, 162, 1);
        line-height: 1.5;
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
        .collect-mode .single-content-item,.collect-mode .children-content-item {
    
            color: rgba(158, 161, 162, 1);
            line-height:1.2;
    
        }
    
    .reminder-item:hover {
        border-color: rgba(68, 80, 88, 1);
        background: rgba(56, 70, 81, 1);
    }
        .reminder-item:hover .reminder-item-name{
            color:rgba(217, 217, 217, 1);
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
export function applyStyles(settings) {
  const theme = settings.get('theme');
  const themeStyles = createThemeStyles(theme[theme.mode]);
  GM_addStyle(themeStyles + baseStyles);
}