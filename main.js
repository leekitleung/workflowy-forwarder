// ==UserScript==
// @name         WorkFlowy Reminder (Improved)
// @namespace    http://tampermonkey.net/
// @version      3.3.4
// @description  workflowy forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_notification
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 保持原有样式定义
    GM_addStyle(`

    <link href="https://fonts.googleapis.com/css2?family=Aclonica&display=swap" rel="stylesheet">

    .right-bar div:nth-child(1) {
        width: 300px;
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
            color: rgba(231, 239, 251, 1);
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
        color: #e8e8e8;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.3s;
        font-size: 14px;
        margin: 2px;
    }

    .mode-btn.active {
        background: rgba(56, 70, 81, 1);
        
    }

    .mode-btn:hover {
        background: rgba(53, 125, 166, 1);
        color:rgba(255, 255, 255, 1);
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
        background:rgba(53, 60, 63, 1);
        border: 1px solid rgba(58, 67, 71, 1);
        transition: opacity 0.3s ease;
        font-size: 14px;
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
        top: 13px;  
        display: flex;
        gap: 4px;
        opacity: 0;  /* 默认隐藏 */
        transition: opacity 0.2s ease;
        z-index: 2;
    }


    .reminder-item:hover .reminder-actions {
        opacity: 1;
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
        padding: 12px;
        margin-bottom: 12px;
        position: relative;
    }

    .collect-mode .parent-title {
        margin-bottom: 8px;
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
        right: 10px;
        top: 10px;  
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
`);

    const SCRIPT_VERSION = GM_info.script.version;
    const TARGET_NODE_ID = '8220a888febe';
    let reminders = JSON.parse(localStorage.getItem('workflowy_reminders') || '{}');
    let currentMode = 'scan';
    let visitedItems = JSON.parse(localStorage.getItem('workflowy_visited_items') || '[]');

    // 新增: WorkFlowy状态同步函数
    function syncWorkflowyState(itemId, completed) {
        const item = WF.getItemById(itemId);
        if (item) {
            WF.editGroup(() => {
                if (item.isCompleted() !== completed) {
                    WF.completeItem(item);
                }
            });
        }
    }

    // 新增: 定期同步检查函数
    function synchronizeWorkflowyStates() {
        Object.entries(reminders).forEach(([id, reminder]) => {
            const item = WF.getItemById(id);
            if (item) {
                const workflowyCompleted = item.isCompleted();
                if (reminder.completed !== workflowyCompleted) {
                    reminder.completed = workflowyCompleted;
                    saveReminders();
                    updateReminderList();
                }
            }
        });
    }

    // 原有的初始化和等待函数
    function waitForWF() {
        if(typeof WF !== 'undefined') {
            console.log('WorkFlowy API 加载完成');
            initReminder();
            // 新增: 启动定期同步检查
            setInterval(synchronizeWorkflowyStates, 5000);
        } else {
            console.log('等待 WorkFlowy API...');
            setTimeout(waitForWF, 100);
        }
    }

    function handleKeyPress(event) {
        // Ctrl + /
        if (event.ctrlKey && event.key === '/') {
            setTimeout(() => {
                togglePanel();
                showShortcutToast();
            }, 50);
        }
    }

    function showShortcutToast() {
        let toast = document.getElementById('shortcut-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shortcut-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = '面板已切换 (Ctrl + /)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    function updateLastRefreshTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.title = `最后刷新: ${timeStr}`;
        }
    }

    function updateButtonStyles() {
        const scanBtn = document.getElementById('scan-reminders');
        const followBtn = document.getElementById('follow-reminders');
        const collectBtn = document.getElementById('collect-reminders');

        scanBtn.classList.toggle('active', currentMode === 'scan');
        followBtn.classList.toggle('active', currentMode === 'follow');
        collectBtn.classList.toggle('active', currentMode === 'collect');

        const plannerLink = document.querySelector('.planner-link');
        if (plannerLink) {
            plannerLink.style.display = currentMode === 'scan' ? 'flex' : 'none';
        }
    }

    function togglePanel() {
        const panel = document.querySelector('.reminder-panel');
        const toggleBtn = document.querySelector('.reminder-toggle');
        const content = document.getElementById('content');

        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
            if (content) {
                content.style.paddingRight = panel.classList.contains('visible') ? '319px' : '0';
            }
        }
    }

    // 提醒项创建和事件��理函数

    function createReminderItem(reminder) {
        const isCompleted = reminder.completed || false;
        let displayText = reminder.name;
        if (reminder.mode === 'follow' && reminder.displayName) {
            displayText = reminder.displayName;
        }

        // 确保URL包含完整域名
        const fullUrl = reminder.url.startsWith('http') ?
            reminder.url :
            `https://workflowy.com${reminder.url}`;

        return `
            <div class="reminder-item ${reminder.hasMirrors ? 'has-mirrors' : ''}
                ${isCompleted ? 'completed' : ''}"
                data-id="${reminder.id}"
                data-mode="${reminder.mode}">
                <div class="reminder-checkbox-wrapper">
                    <input type="checkbox"
                        class="reminder-checkbox"
                        ${isCompleted ? 'checked' : ''}
                        data-id="${reminder.id}">
                </div>
                <div class="reminder-item-content">
                    <span class="reminder-item-name" onclick="WF.getItemById('${reminder.id}') && WF.zoomTo(WF.getItemById('${reminder.id}'))">${displayText}</span>
                
                    <div class="reminder-actions">
                        <button class="reminder-action-btn copy" data-content="${fullUrl}">
                        </button>
                        <button class="reminder-action-btn remove" data-id="${reminder.id}">
                        </button>
                    </div>
                </div>
            </div>`;
    }

    function createCollectModeItem(reminder) {
        const isCompleted = reminder.completed || false;
        const parentName = cleanContent(reminder.name || '');
        let childrenContent = '';

        if (reminder.childrenContent) {
            childrenContent = reminder.childrenContent
                .split('\n')
                .map(line => {
                    // 保持原有缩进结构，但统一使用破折号
                    const indentMatch = line.match(/^(\s*)/);
                    const indent = indentMatch ? indentMatch[1] : '';
                    const content = line.trim().replace(/^[-•]\s*/, '');
                    return `${indent}- ${content}`;
                })
                .filter(line => line.trim())
                .join('\n');
        }

        return `
            <div class="reminder-item collect-mode ${isCompleted ? 'completed' : ''}"
                 data-id="${reminder.id}"
                 data-mode="${reminder.mode}">

                ${parentName ? `<div class="parent-title">${parentName}</div>` : ''}
                <div class="children-content">
                    <div class="reminder-checkbox-wrapper">
                        <input type="checkbox"
                            class="reminder-checkbox"
                            ${isCompleted ? 'checked' : ''}
                            data-id="${reminder.id}">
                    </div>
                ${childrenContent ?
                    `<div class="children-content-item">${childrenContent}</div>` :
                    `<div class="single-content-item">${parentName}</div>`
                }
                </div>
                <div class="reminder-actions">
                    <button class="reminder-action-btn open" data-id="${reminder.id}">
                        
                    </button>
                    <button class="reminder-action-btn remove" data-id="${reminder.id}">
                    
                    </button>
                </div>
            </div>`;
    }

    function handleRemoveButton(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            if (reminders[id]) {
                delete reminders[id];
                saveReminders();

                const reminderItem = this.closest('.reminder-item');
                const feedback = document.createElement('div');
                feedback.className = 'action-feedback';
                feedback.textContent = '已移除';
                reminderItem.appendChild(feedback);

                setTimeout(() => {
                    feedback.remove();
                    reminderItem.style.opacity = '0';
                    setTimeout(() => {
                        reminderItem.remove();
                        const parentBlock = reminderItem.closest('.reminder-block');
                        if (parentBlock && !parentBlock.querySelector('.reminder-item')) {
                            updateReminderList();
                        }
                    }, 300);
                }, 700);
            }
        });
    }

    function showFeedback(element, message) {
        const reminderItem = element.closest('.reminder-item');
        const feedback = document.createElement('div');
        feedback.className = 'action-feedback';
        feedback.textContent = message;
        reminderItem.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }

    function addEventListeners(listElement) {
        // Checkbox事件
        listElement.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                const reminderItem = this.closest('.reminder-item');
                if (reminderItem) {
                    const isCompleted = this.checked;
                    reminderItem.classList.toggle('completed', isCompleted);

                    // 同步到 WorkFlowy
                    syncWorkflowyState(id, isCompleted);

                    // 更新本地状态
                    const reminder = reminders[id];
                    if (reminder) {
                        reminder.completed = isCompleted;
                        saveReminders();
                    }
                }
            });
        });

        // 复制链接按钮事件
        listElement.querySelectorAll('.reminder-action-btn.copy').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const content = this.dataset.content;
                if (content) {
                    navigator.clipboard.writeText(content).then(() => {
                        showFeedback(this, '已复制');
                    });
                }
            });
        });

        // 移除按钮事件
        listElement.querySelectorAll('.reminder-action-btn.remove').forEach(handleRemoveButton);

        // 打开按钮事件（收集模式特有）
        listElement.querySelectorAll('.reminder-action-btn.open').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                const item = WF.getItemById(id);
                if (item) {
                    WF.zoomTo(item);
                }
            });
        });
    }

    // Content area click for URL copying


    function cleanContent(text) {
        return text
            .replace(/@\d{1,2}:\d{2}/g, '')
            .replace(/#稍后处理/g, '')
            .trim();
    }

    // 扫描模式收集函数
    function scanReminders() {
        const targetNode = WF.getItemById(TARGET_NODE_ID);
        if (!targetNode) {
            console.log('未找到指定节点');
            return;
        }

        const newReminders = {};
        const firstLevelNodes = targetNode.getChildren();

        firstLevelNodes.forEach(node => {
            const name = node.getNameInPlainText();
            const id = node.getId();

            if (name.toLowerCase().includes('references')) {
                return;
            }

            const timeMatch = name.match(/^(\d{2})/);
            if (timeMatch) {
                const number = parseInt(timeMatch[1]);
                if (number >= 5 && number <= 22) {
                    const children = node.getChildren();
                    children.forEach(child => {
                        const childName = child.getNameInPlainText();
                        if (childName.trim() && !childName.toLowerCase().includes('references')) {
                            const reminderTime = new Date();
                            reminderTime.setHours(number, 0, 0, 0);

                            const childItem = WF.getItemById(child.getId());
                            if (childItem) {
                                newReminders[child.getId()] = {
                                    id: child.getId(),
                                    name: childName,
                                    parentName: name,
                                    parentId: id,
                                    time: reminderTime.getTime(),
                                    notified: false,
                                    mode: 'scan',
                                    url: childItem.getUrl(),
                                    completed: childItem.isCompleted()
                                };
                            }
                        }
                    });
                }
            }
        });

        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'scan')),
            ...newReminders
        };
        saveReminders();
        updateReminderList();
    }

    // 跟进模式收集函数
    function followReminders() {
        const newReminders = {};
        const targetNodeIds = ['6280897d3c65', '3b7e610683fe'];
        const tempReminders = new Map();
        const processedIds = new Set();

        function processItem(item) {
            const id = item.getId();
            if (processedIds.has(id)) return;
            processedIds.add(id);

            const name = item.getNameInPlainText();
            const note = item.getNoteInPlainText();

            if (!name.includes('#index') && !note.includes('#index') &&
                (name.includes('#01每日推进') || note.includes('#01每日推进'))) {

                const reminderText = note.includes('#01每日推进') ? note : name;
                const normalizedContent = extractReminderContent(reminderText);
                const element = item.getElement();
                const hasMirrors = element?.closest('.project')?.classList.contains('hasMirrors');

                const newReminder = {
                    id,
                    name: reminderText,
                    originalName: name,
                    hasNoteTag: note.includes('#01每日推进'),
                    time: Date.now(),
                    notified: false,
                    mode: 'follow',
                    url: item.getUrl(),
                    hasMirrors,
                    completed: item.isCompleted(),
                    displayName: note.includes('#01每日推进') ? `${name} ` : name
                };

                const existingReminder = tempReminders.get(normalizedContent);
                if (!existingReminder || (hasMirrors && !existingReminder.hasMirrors)) {
                    tempReminders.set(normalizedContent, newReminder);
                }
            }

            item.getChildren().forEach(processItem);
        }

        for (const targetNodeId of targetNodeIds) {
            const targetNode = WF.getItemById(targetNodeId);
            if (targetNode) {
                processItem(targetNode);
            }
        }

        for (const reminder of tempReminders.values()) {
            newReminders[reminder.id] = reminder;
        }

        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'follow')),
            ...newReminders
        };
        saveReminders();
        updateReminderList();
    }

    // 收集模式收集函数
    function collectReminders() {
        const newReminders = {};
        const inboxId = '17cfc44d9b20';
        const inboxItem = WF.getItemById(inboxId);

        if (!inboxItem) {
            console.log('未找到收件箱节点');
            return;
        }

        const existingCollectReminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode === 'collect')
        );

        const firstLevelNodes = inboxItem.getChildren();
        firstLevelNodes.forEach(parentNode => {
            const parentName = parentNode.getNameInPlainText();
            const parentId = parentNode.getId();

            if (parentName.includes('#稍后处理')) {
                let fullContent = '';
                const children = parentNode.getChildren();

                if (children.length > 0) {
                    children.forEach(child => {
                        const childName = child.getNameInPlainText()
                            .replace(/#稍后处理/g, '').trim();
                        const childNote = child.getNoteInPlainText();

                        fullContent += `- ${childName}\n`;
                        if (childNote) {
                            fullContent += `  ${childNote}\n`;
                        }
                    });
                }

                const existingReminder = existingCollectReminders[parentId];
                const creationTime = existingReminder ?
                    existingReminder.creationTime :
                    Date.now();

                newReminders[parentId] = {
                    id: parentId,
                    name: parentName.replace(/#稍后处理/g, '').trim(),
                    childrenContent: fullContent.trim(),
                    time: parentNode.getLastModifiedDate().getTime(),
                    creationTime,
                    notified: false,
                    mode: 'collect',
                    url: parentNode.getUrl(),
                    completed: parentNode.isCompleted()
                };
            }
        });

        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'collect')),
            ...newReminders
        };
        saveReminders();
        updateReminderList();
    }

    // 更新提醒列表显示
    function updateReminderList() {
        const listElement = document.getElementById('reminder-list');
        if (!listElement) return;

        const currentReminders = Object.values(reminders).filter(r => r.mode === currentMode);

        if (currentMode === 'scan') {
            const remindersByParent = {};

            currentReminders.forEach(reminder => {
                const parentId = reminder.parentId;
                if (!remindersByParent[parentId]) {
                    remindersByParent[parentId] = {
                        name: reminder.parentName,
                        time: reminder.time,
                        items: []
                    };
                }
                remindersByParent[parentId].items.push(reminder);
            });

            const blocks = Object.entries(remindersByParent)
                .sort(([_, a], [__, b]) => a.time - b.time)
                .map(([parentId, block]) => {
                    const items = block.items
                        .map(reminder => createReminderItem(reminder))
                        .join('');

                    return `
                        <div class="reminder-block">
                            <div class="reminder-block-title">${block.name}</div>
                            ${items}
                        </div>
                    `;
                }).join('');

            listElement.innerHTML = blocks || '<div class="no-reminders">暂无时间块内容<br>时间格式：05-22</div>';
            addEventListeners(listElement);
        } else if (currentMode === 'follow') {
            const items = currentReminders
                .sort((a, b) => extractReminderContent(a.name)
                    .localeCompare(extractReminderContent(b.name)));

            listElement.innerHTML = items
                .map(reminder => createReminderItem(reminder))
                .join('') ||
                '<div class="no-reminders">暂无跟进事项<br>使用格式：任务内容 #01每日推进</div>';
            addEventListeners(listElement);
        } else if (currentMode === 'collect') {
            const items = currentReminders.sort((a, b) => b.time - a.time);

            listElement.innerHTML = items
                .map(reminder => createCollectModeItem(reminder))
                .join('') ||
                '<div class="no-reminders">暂无待整理事项<br>使用格式：任务内容 #稍后处理</div>';
            addCollectModeEventListeners(listElement);
        }
    }

    function addCollectModeEventListeners(listElement) {
        // 内容区域点击复制功能
        listElement.querySelectorAll('.collect-mode .children-content, .collect-mode .single-content').forEach(content => {
            content.addEventListener('click', async function(e) {
                e.stopPropagation();
                const reminderItem = this.closest('.reminder-item');
                const id = reminderItem.dataset.id;
                const reminder = reminders[id];

                if (reminder) {
                    try {
                        const formattedContent = formatCollectContent(reminder);
                        await navigator.clipboard.writeText(formattedContent);
                        showFeedback(this, '已复制内容');

                        // 调试用，可以在控制台查看格式化后的内容
                        console.log('Formatted content:', formattedContent);
                    } catch (error) {
                        console.error('复制失败:', error);
                        showFeedback(this, '复制失败');
                    }
                }
            });
        });

        // 使用通用事件监听器处理其他功能
        addEventListeners(listElement);
    }

    function formatCollectContent(reminder) {
        if (!reminder) return '';

        let formattedContent = '';

        // 处理父节点内容
        if (reminder.name) {
            formattedContent += reminder.name.replace(/#稍后处理/g, '').trim();
        }

        // 处理子节点内容
        if (reminder.childrenContent) {
            const childLines = reminder.childrenContent.split('\n');
            for (let line of childLines) {
                // 跳过空行
                if (!line.trim()) continue;

                // 检测已有的缩进级别和内容
                const indentMatch = line.match(/^(\s*)[-•]\s*(.*)/);
                if (indentMatch) {
                    // 获取现有缩进级别
                    const indent = indentMatch[1].length;
                    const content = indentMatch[2].trim();
                    // 使用两个空格作为一级缩进
                    formattedContent += '\n' + '  '.repeat(Math.max(1, Math.floor(indent/2))) + '- ' + content;
                } else {
                    // 如果没有检测到缩进标记，作为一级子节点处理
                    formattedContent += '\n  - ' + line.trim();
                }
            }
        }

        return formattedContent;
    }

    function initReminder() {
        // 创建提醒面板

        const panel = document.createElement('div');
        panel.className = 'reminder-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h1>
                    Workflowy<br/>
                    Forwarder Plus  
                    <span class="version-tag">v${SCRIPT_VERSION}</span>
                </h1>
                <div class="mode-switch">
                    <button class="mode-btn active" id="scan-reminders">DailyPlanner</button>
                    <button class="mode-btn" id="follow-reminders">Target</button>
                    <button class="mode-btn" id="collect-reminders">Collector</button>
                </div>
                <a href="https://workflowy.com/#/${TARGET_NODE_ID}" class="planner-link">
                    进入节点
                </a>
            </div>
            <div class="panel-content">
                <div class="reminder-list" id="reminder-list"></div>
            </div>
            <div class="clear-all-container">
                <button class="clear-all-btn" id="clear-all">清除所有笔记</button>
            </div>
        `;

        document.body.appendChild(panel);


        // 添加面板切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'reminder-toggle';
        toggleBtn.innerHTML = `
            <svg aria-hidden="true" focusable="false" class="toggle-arrow" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path fill="currentColor" d="M4.7 244.7c-6.2 6.2-6.2 16.4 0 22.6l176 176c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L54.6 272 432 272c8.8 0 16-7.2 16-16s-7.2-16-16-16L54.6 240 203.3 91.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0l-176 176z"></path>
            </svg>
        `;
        document.body.appendChild(toggleBtn);

        // 添加点击事件
        toggleBtn.onclick = togglePanel;

        // 添加键盘快捷键监听
        document.addEventListener('keydown', handleKeyPress, false);

        // 初始化事件监听
        document.getElementById('scan-reminders').onclick = () => {
            currentMode = 'scan';
            scanReminders();
            updateButtonStyles();
        };

        document.getElementById('follow-reminders').onclick = () => {
            currentMode = 'follow';
            followReminders();
            updateButtonStyles();
        };

        document.getElementById('collect-reminders').onclick = () => {
            currentMode = 'collect';
            collectReminders();
            updateButtonStyles();
        };

        document.getElementById('clear-all').onclick = clearAllReminders;

        // 初始化界面状态
        updateButtonStyles();
        scanReminders();

        // 设置定时刷新
        setInterval(() => {
            if (currentMode === 'scan') {
                scanReminders();
            }
        }, 60000);
    }

    // 辅助函数
    function extractReminderContent(text) {
        return normalizeReminderText(text
            .replace(/@\d{1,2}:\d{2}/, '')
            .replace(/#remind/, '')
            .replace(/#提醒/, '')
            .replace(/#稍后处理/, '')
            .replace(/#01每日推进/, '')
            .trim());
    }

    function normalizeReminderText(text) {
        return text.trim().replace(/\s+/g, ' ');
    }

    function saveReminders() {
        localStorage.setItem('workflowy_reminders', JSON.stringify(reminders));
    }

    // 清除所有提醒
    function clearAllReminders() {
        reminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode !== currentMode)
        );
        saveReminders();
        updateReminderList();
    }

    // 启动应用
    console.log('WorkFlowy DAILY PLANNER 助手启动...');
    waitForWF();
})();
