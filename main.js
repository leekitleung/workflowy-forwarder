// ==UserScript==
// @name         WorkFlowy Reminder (Improved)
// @namespace    http://tampermonkey.net/
// @version      3.5.11
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
    
    @import url('https://fonts.googleapis.com/css2?family=Aclonica&display=swap');
    
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
    
    
    
    `);
    
    const MODE_NODES = {
        scan: '8220a888febe',  // DailyPlanner节点
        follow: ['6280897d3c65', '3b7e610683fe'],  // Target模式的两个节点
        collect: '17cfc44d9b20'  // Collector节点
    };
    
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
    
    // 新增颜色检测和更新函数
    function getNodeColorInfo(node) {
        try {
            const content = node.getName();
            if (!content) return null;
    
            const colorMatch = content.match(/class="colored ((?:c-|bc-)[a-z]+)"/);
            if (!colorMatch) return null;
    
            const colorClass = colorMatch[1];
            
            if (colorClass.startsWith('bc-')) {
                return {
                    type: 'highlight',
                    colorClass: colorClass
                };
            } else if (colorClass.startsWith('c-')) {
                const textColorMap = {
                    'c-red': '#d32f2f',
                    'c-orange': '#ef6c00',
                    'c-yellow': '#f9a825',
                    'c-green': '#388e3c',
                    'c-blue': '#1e88e5',
                    'c-purple': '#7b1fa2',
                    'c-pink': '#e91e63',    // 粉色
                    'c-sky': '#00bcd4',     // 天蓝色
                    'c-teal': '#009688',    // 青色
                    'c-gray': '#757575'     // 灰色
                };
                return {
                    type: 'colored',
                    colorClass: colorClass,
                    color: textColorMap[colorClass] || '#000000'
                };
            }
        } catch (error) {
            console.error('获取节点颜色信息失败:', error);
        }
        return null;
    }
    
    function getColorStyle(node) {
        try {
            const colorInfo = getNodeColorInfo(node);
            if (!colorInfo) return { style: '', class: '' };
    
            let colorStyle = '';
            let colorClass = '';
    
            if (colorInfo.type === 'colored') {
                colorClass = 'colored';
                colorStyle = `
                    --text-color: ${colorInfo.color};
                    --node-color: ${colorInfo.color}1a;
                    --node-border-color: ${colorInfo.color}33;
                    --node-color-hover: ${colorInfo.color}26;
                    --node-border-color-hover: ${colorInfo.color}40;
                    --actions-bg-hover: ${colorInfo.color}0d; /* 5% 透明度 */
                `;
            } else if (colorInfo.type === 'highlight') {
                colorClass = 'highlighted';
                const bgColorMap = {
                    'bc-red': 'rgba(211, 47, 47, 0.2)',
                    'bc-orange': 'rgba(239, 108, 0, 0.2)',
                    'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                    'bc-green': 'rgba(56, 142, 60, 0.2)',
                    'bc-blue': 'rgba(30, 136, 229, 0.2)',
                    'bc-purple': 'rgba(123, 31, 162, 0.2)',
                    'bc-pink': 'rgba(233, 30, 99, 0.2)',    // 粉色
                    'bc-sky': 'rgba(0, 188, 212, 0.2)',     // 天蓝色
                    'bc-teal': 'rgba(0, 150, 136, 0.2)',    // 青色
                    'bc-gray': 'rgba(117, 117, 117, 0.2)'   // 灰色
                };
                const backgroundColor = bgColorMap[colorInfo.colorClass];
                const [r, g, b] = backgroundColor.match(/\d+/g);
                colorStyle = `
                    --node-color: ${backgroundColor};
                    --node-border-color: ${backgroundColor.replace('0.2', '0.3')};
                    --node-color-hover: rgba(${r}, ${g}, ${b}, 0.25);
                    --node-border-color-hover: rgba(${r}, ${g}, ${b}, 0.35);
                    --actions-bg-hover: rgba(${r}, ${g}, ${b}, 0.1);
                `;
            }
    
            return { style: colorStyle, class: colorClass };
        } catch (error) {
            console.error('获取颜色样式失败:', error);
            return { style: '', class: '' };
        }
    }
    
    function applyNodeColor(element, node) {
        const colorInfo = getNodeColorInfo(node);
        if (!colorInfo) return;
    
        if (colorInfo.type === 'colored') {
            element.style.setProperty('--text-color', colorInfo.color);
            element.style.setProperty('--node-color', `${colorInfo.color}1a`); // 10% opacity
            element.style.setProperty('--node-border-color', `${colorInfo.color}33`); // 20% opacity
            element.classList.add('colored');
        } else if (colorInfo.type === 'highlight') {
            const bgColorMap = {
                'bc-red': 'rgba(211, 47, 47, 0.2)',
                'bc-orange': 'rgba(239, 108, 0, 0.2)',
                'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                'bc-green': 'rgba(56, 142, 60, 0.2)',
                'bc-blue': 'rgba(30, 136, 229, 0.2)',
                'bc-purple': 'rgba(123, 31, 162, 0.2)',
                'bc-pink': 'rgba(233, 30, 99, 0.2)',    // ���色
                'bc-sky': 'rgba(0, 188, 212, 0.2)',     // 天蓝色
                'bc-teal': 'rgba(0, 150, 136, 0.2)',    // 青色
                'bc-gray': 'rgba(117, 117, 117, 0.2)'   // 灰色
            };
            const backgroundColor = bgColorMap[colorInfo.colorClass];
            element.style.setProperty('--node-color', backgroundColor);
            element.style.setProperty('--node-border-color', backgroundColor.replace('0.2', '0.3'));
            element.classList.add('highlighted');
        }
    }
    
    function updateCardsColor() {
        const cards = document.querySelectorAll('.reminder-item');
        cards.forEach(card => {
            const id = card.dataset.id;
            if (!id) return;
    
            const node = WF.getItemById(id);
            if (!node) return;
    
            const colorInfo = getNodeColorInfo(node);
            if (!colorInfo) return;
    
            const computedStyle = window.getComputedStyle(colorInfo.element);
            
            if (colorInfo.type === 'text') {
                const color = computedStyle.color;
                card.style.setProperty('--text-color', color);
                card.style.setProperty('--node-color', color.replace('rgb', 'rgba').replace(')', ', 0.2)'));
            } else if (colorInfo.type === 'highlight') {
                const bgColor = computedStyle.backgroundColor;
                card.style.setProperty('--node-color', bgColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
            }
        });
    }
    
    function updateLastRefreshTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.title = `最后刷新: ${timeStr}`;
        }
    }
    
    // 在 updateButtonStyles 函数中添加显示逻辑
    function updateButtonStyles() {
        const scanBtn = document.getElementById('scan-reminders');
        const followBtn = document.getElementById('follow-reminders');
        const collectBtn = document.getElementById('collect-reminders');
    
        scanBtn.classList.toggle('active', currentMode === 'scan');
        followBtn.classList.toggle('active', currentMode === 'follow');
        collectBtn.classList.toggle('active', currentMode === 'collect');
    
        // 更新链接显示
        document.querySelectorAll('.planner-link').forEach(link => {
            link.style.display = 'none';
            // 移除之前可能添加的 !important
            link.style.setProperty('display', 'none', 'important');
        });
    
        if (currentMode === 'scan') {
            document.querySelector('.scan-link').style.setProperty('display', 'flex', 'important');
            document.querySelector('.today-link').style.setProperty('display', 'flex', 'important');
        } else if (currentMode === 'follow') {
            document.querySelectorAll('.follow-link').forEach(link => {
                link.style.setProperty('display', 'flex', 'important');
            });
        } else if (currentMode === 'collect') {
            document.querySelector('.collect-link').style.setProperty('display', 'flex', 'important');
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
        try {
            const node = WF.getItemById(reminder.id);
            if (!node) return '';
    
            const isCompleted = reminder.completed || false;
            let displayText = reminder.name;
            if (reminder.mode === 'follow' && reminder.displayName) {
                displayText = reminder.displayName;
            }
    
            // 获取颜色信息
            const colorInfo = getNodeColorInfo(node);
            let colorStyle = '';
            let colorClass = '';
            
            if (colorInfo) {
                if (colorInfo.type === 'colored') {
                    colorClass = 'colored';
                    colorStyle = `
                        --text-color: ${colorInfo.color};
                        --node-color: ${colorInfo.color}1a;
                        --node-border-color: ${colorInfo.color}33;
                    `;
                } else if (colorInfo.type === 'highlight') {
                    colorClass = 'highlighted';
                    const bgColorMap = {
                        'bc-red': 'rgba(211, 47, 47, 0.2)',
                        'bc-orange': 'rgba(239, 108, 0, 0.2)',
                        'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                        'bc-green': 'rgba(56, 142, 60, 0.2)',
                        'bc-blue': 'rgba(30, 136, 229, 0.2)',
                        'bc-purple': 'rgba(123, 31, 162, 0.2)'
                    };
                    const backgroundColor = bgColorMap[colorInfo.colorClass];
                    colorStyle = `
                        --node-color: ${backgroundColor};
                        --node-border-color: ${backgroundColor.replace('0.2', '0.3')};
                    `;
                }
            }
    
            // 确保URL包含完整域名
            const fullUrl = reminder.url.startsWith('http') ?
                reminder.url :
                `https://workflowy.com${reminder.url}`;
    
            return `
                <div class="reminder-item ${reminder.hasMirrors ? 'has-mirrors' : ''}
                    ${isCompleted ? 'completed' : ''} ${colorClass}"
                    data-id="${reminder.id}"
                    data-mode="${reminder.mode}"
                    style="${colorStyle}">
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
        } catch (error) {
            console.error('创建提醒项失败:', error);
            return '';
        }
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
                // 存储移除记录，包含模式信息
                const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');
                removedItems.push(id);
                localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(removedItems));
    
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
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const id = this.closest('.reminder-item').dataset.id;
                const node = WF.getItemById(id);
                
                if (node) {
                    try {
                        await copyNodeContent(node);
                        showFeedback(this, '已复制');
                    } catch (err) {
                        console.error('复制失败:', err);
                        showFeedback(this, '复制失败');
                    }
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
    

    async function copyNodeContent(node) {
        return new Promise((resolve, reject) => {
            try {
                let contentToCopy = '';
    
                if (isUrlNode(node)) {
                    // 获取原始HTML内容而不是纯文本
                    const htmlContent = node.getName();
                    
                    // 检查是否已经是带链接的格式
                    if (htmlContent.includes('<a href=')) {
                        // 如果已经是链接格式，直接使用原始HTML
                        contentToCopy = htmlContent;
                    } else {
                        // 如果不是链接格式，则构造链接
                        const text = node.getNameInPlainText();
                        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
                        
                        if (urlMatch) {
                            const url = urlMatch[0];
                            contentToCopy = `<a href="${url}">${text}</a>`;
                        } else {
                            contentToCopy = text;
                        }
                    }
                } else {
                    // 非URL节点使用原始HTML内容
                    contentToCopy = node.getName();
                }
    
                // 创建一个临时元素来处理富文本复制
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.innerHTML = contentToCopy;
                document.body.appendChild(tempDiv);
    
                // 创建一个范围来选择内容
                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
    
                // 执行复制命令
                const success = document.execCommand('copy');
                
                // 清理
                selection.removeAllRanges();
                document.body.removeChild(tempDiv);
                
                resolve(success);
            } catch (err) {
                console.error('复制失败:', err);
                reject(err);
            }
        });
    }
    
    function isUrlNode(node) {
        // 检查原始HTML内容是否包含链接标签或URL
        const htmlContent = node.getName();
        const plainText = node.getNameInPlainText();
        
        return htmlContent.includes('<a href=') || 
               /https?:\/\/[^\s]+/.test(plainText);
    }


    // Content area click for URL copying
    
    function cleanContent(text) {
        return text
            .replace(/#稍后处理/g, '')
            .trim();
    }
    
    function filterRemovedItems(newReminders, mode) {
        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${mode}`) || '[]');
        return Object.fromEntries(
            Object.entries(newReminders).filter(([id]) => !removedItems.includes(id))
        );
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
    
        const filteredReminders = filterRemovedItems(newReminders, 'scan');
    
        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'scan')),
            ...filteredReminders
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
    
        const filteredReminders = filterRemovedItems(newReminders, 'scan');
    
        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'scan')),
            ...filteredReminders
        };
        saveReminders();
        updateReminderList();
    }
    
    // 收集模式收集函数
    function collectReminders() {
        const newReminders = {};
        const inboxId = '17cfc44d9b20';
        const inboxItem = WF.getItemById(inboxId);
        const processedNodes = new Set(); // 用于追踪已处理的节点
    
        if (!inboxItem) {
            console.log('未找到收件箱节点');
            return;
        }
    
        const existingCollectReminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode === 'collect')
        );
    
        // 检查节点是否为空（只包含日期时间和标签）
        function isEmptyNode(node) {
            const name = node.getNameInPlainText();
            // 移除日期时间格式（如：2024-01-01 12:00）
            const nameWithoutDateTime = name.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/, '');
            // 移除标签
            const nameWithoutTags = nameWithoutDateTime.replace(/#[^\s#]+/g, '');
            // 检查是否还有其他内容
            return nameWithoutTags.trim() === '' && node.getChildren().length === 0;
        }
    
        // 递归函数：搜索包含 #稍后处理 标签的节点
        function searchNodesWithTag(node) {
            if (processedNodes.has(node.getId())) {
                return; // 跳过已处理的节点
            }
    
            const nodeName = node.getNameInPlainText();
            const nodeId = node.getId();
            
            // 如果当前节点包含标签且不是空节点
            if (nodeName.includes('#稍后处理') && !isEmptyNode(node)) {
                // 标记当前节点及其所有子节点为已处理
                processedNodes.add(nodeId);
                node.getChildren().forEach(child => {
                    processedNodes.add(child.getId());
                });
    
                const children = node.getChildren();
                let fullContent = '';
                
                // 收集子节点内容
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
    
                const existingReminder = existingCollectReminders[nodeId];
                const creationTime = existingReminder ?
                    existingReminder.creationTime :
                    Date.now();
    
                newReminders[nodeId] = {
                    id: nodeId,
                    name: nodeName.replace(/#稍后处理/g, '').trim(),
                    childrenContent: fullContent.trim(),
                    time: node.getLastModifiedDate().getTime(),
                    creationTime,
                    notified: false,
                    mode: 'collect',
                    url: node.getUrl(),
                    completed: node.isCompleted()
                };
            } else {
                // 如果当前节点不包含标签，继续搜索其子节点
                node.getChildren().forEach(child => {
                    if (!processedNodes.has(child.getId())) {
                        searchNodesWithTag(child);
                    }
                });
            }
        }
    
        // 从收件箱节点开始递归搜索
        searchNodesWithTag(inboxItem);
    
        const filteredReminders = filterRemovedItems(newReminders, 'collect');
    
        reminders = {
            ...Object.fromEntries(Object.entries(reminders).filter(([_, r]) => r.mode !== 'collect')),
            ...filteredReminders
        };
        saveReminders();
        updateReminderList();
    }
    
    // 更新提醒列表显示
    function updateReminderList() {
        const listElement = document.getElementById('reminder-list');
        if (!listElement) return;
    
        const currentReminders = Object.values(reminders).filter(r => r.mode === currentMode);
        console.log('Current mode:', currentMode);
        console.log('Current reminders:', currentReminders);
    
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
    
            listElement.innerHTML = blocks || '<div class="no-reminders">暂无时间块卡片</div>';
            addEventListeners(listElement);
            setTimeout(updateCardsColor, 0);
        } else if (currentMode === 'follow') {
            const items = currentReminders
                .sort((a, b) => extractReminderContent(a.name)
                    .localeCompare(extractReminderContent(b.name)));
    
            listElement.innerHTML = items
                .map(reminder => createReminderItem(reminder))
                .join('') ||
                '<div class="no-reminders">暂无跟进事项<br>使用格式：任务内容 #01每日推进</div>';
            addEventListeners(listElement);
            setTimeout(updateCardsColor, 0);
        } else if (currentMode === 'collect') {
            const items = currentReminders.sort((a, b) => b.time - a.time);
    
            listElement.innerHTML = items
                .map(reminder => createCollectModeItem(reminder))
                .join('') ||
                '<div class="no-reminders">暂无待整理事项<br>使用格式：任务内容 #稍后处理</div>';
            addCollectModeEventListeners(listElement);
            setTimeout(updateCardsColor, 0);
        }
    }
    
    // 添加颜色更新函数
    function updateCardsColor() {
        try {
            const items = document.querySelectorAll('.reminder-item');
            items.forEach(item => {
                const id = item.getAttribute('data-id');
                if (!id) return;
    
                const node = WF.getItemById(id);
                if (!node) return;
    
                const { style: colorStyle, class: colorClass } = getColorStyle(node);
                
                // 移除旧的颜色类
                item.classList.remove('colored', 'highlighted');
                // 添加新的颜色类
                if (colorClass) {
                    item.classList.add(colorClass);
                }
                // 更新样式
                if (colorStyle) {
                    item.style.cssText += colorStyle;
                }
            });
        } catch (error) {
            console.error('更新卡片颜色失败:', error);
        }
    }
    
    function addCollectModeEventListeners(listElement) {
        // 处理复选框的点击事件
        listElement.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                const reminderItem = this.closest('.reminder-item');
                if (reminderItem) {
                    const isCompleted = this.checked;
                    reminderItem.classList.toggle('completed', isCompleted);
                    syncWorkflowyState(id, isCompleted);
                    const reminder = reminders[id];
                    if (reminder) {
                        reminder.completed = isCompleted;
                        saveReminders();
                    }
                }
            });
        });
    
        // 辅助函数：处理富文本内容
        function processRichText(item, isParent = false) {
            const nodeData = item.data;
            let processedContent = (nodeData.nm || '').trim();
            
            // 处理特殊格式：日期时间|内容
            const splitContent = processedContent.match(/^([\d-]+\s+[\d:]+)\s*\|\s*(.+)$/);
            if (splitContent && !isParent) {
                processedContent = splitContent[2];
            }
            
            // 处理标签和内容
            processedContent = processedContent
                // 移除 #稍后处理 标签
                .replace(/#稍后处理/g, '')
                
                // 只对非父节点移除日期时间
                .replace(isParent ? '' : /\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}/g, '')
                // 移除其他 HTML span 标签
                .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
                // 处理链接
                .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, (match, url, text) => {
                    if (text === url || text === url + ' »') {
                        return url;
                    }
                    return `${text.replace(' »', '')} ${url}`;
                })
                // 移除多余空格
                .replace(/\s+/g, ' ')
                .trim();
        
            // 处理内嵌的链接
            if (nodeData.ct) {
                const contentLinks = Array.isArray(nodeData.ct) ? nodeData.ct : [];
                contentLinks.forEach(link => {
                    if (link.url) {
                        const linkText = link.text || new URL(link.url).hostname;
                        if (linkText === link.url) {
                            processedContent = processedContent.replace(link.url, link.url);
                        } else {
                            processedContent = processedContent.replace(link.url, `${linkText} ${link.url}`);
                        }
                    }
                });
            }
        
            return processedContent;
        }
        
        const processChildrenWithIndent = (children, level = 1) => {
            return children
                .map(child => {
                    const content = processRichText(child, false); // 子节点不保留时间戳
                    // 跳过空内容
                    if (!content.trim()) return '';
                    
                    const indent = '  '.repeat(level);
                    const childContent = `${indent}- ${content}`;
    
                    const grandChildren = child.getChildren();
                    if (grandChildren.length > 0) {
                        const nestedContent = processChildrenWithIndent(grandChildren, level + 1);
                        return nestedContent ? `${childContent}\n${nestedContent}` : childContent;
                    }
    
                    return childContent;
                })
                .filter(line => line.trim()) // 过滤空行
                .join('\n');
        };
    
        // 内容区域点击事件
        listElement.querySelectorAll('.collect-mode .children-content, .collect-mode .single-content').forEach(content => {
            content.addEventListener('click', async function(e) {
                if (e.target.closest('.reminder-checkbox-wrapper')) return;
                
                e.stopPropagation();
                const reminderItem = this.closest('.reminder-item');
                const id = reminderItem.dataset.id;
                const reminder = reminders[id];
        
                if (!reminder) return;
        
                try {
                    const wfItem = WF.getItemById(id);
                    const children = wfItem.getChildren();
                    let copied = false;
        
                    // 处理单节点情况（情况三）
                    if (children.length === 0) {
                        // 获取原始HTML内容和纯文本内容
                        const htmlContent = wfItem.getName();
                        const plainContent = wfItem.getNameInPlainText();
                        
                        // 检查是否以日期时间格式开头，并且包含分隔符 |
                        const dateTimeMatch = plainContent.match(/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}\s+\|\s+(.+)$/);
                        
                        if (dateTimeMatch) {
                            // 处理带日期时间格式的内容
                            processedContent = dateTimeMatch[1].replace(/#稍后处理/g, '').trim();
                        } else if (htmlContent.includes('<a href=')) {
                            // 如果是带链接的HTML内容，提取链接和文本
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = htmlContent.replace(/#稍后处理/g, '').trim();
                            const anchor = tempDiv.querySelector('a');
                            
                            if (anchor) {
                                const title = anchor.textContent;
                                const url = anchor.href;
                                
                                // 构造OPML格式，将链接放在note部分
                                const opmlContent = `<?xml version="1.0"?>
                                <opml version="2.0">
                                    <head>
                                        <title>${title}</title>
                                    </head>
                                    <body>
                                        <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                    </body>
                                </opml>`;
                                
                                try {
                                    await navigator.clipboard.writeText(opmlContent);
                                    copied = true;
                                } catch (error) {
                                    console.error('复制失败:', error);
                                    copied = false;
                                }
                            } else {
                                // 如果没有找到链接，使用普通文本
                                await navigator.clipboard.writeText(plainContent.replace(/#稍后处理/g, '').trim());
                                copied = true;
                            }
                        } else {
                            // 普通文本内容
                            await navigator.clipboard.writeText(plainContent.replace(/#稍后处理/g, '').trim());
                            copied = true;
                        }
                    }
                    // 处理多节点情况
                    else {
                        const parentContent = wfItem.getNameInPlainText().trim();
                        const firstChildContent = children[0].getNameInPlainText().trim();
                        const isFirstChildSameAsParent = firstChildContent === parentContent;
                        const isParentDateTime = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(parentContent);
                        
                        // 获取除第一个节点外的所有子节点（如果父子内容相同）
                        const relevantChildren = isFirstChildSameAsParent ? children.slice(1) : children;
                        
                        // 检查是否存在"标题："和"链接："格式
                        const titleNode = relevantChildren.find(child => 
                            child.getNameInPlainText().startsWith('标题：'));
                        const linkNode = relevantChildren.find(child => 
                            child.getNameInPlainText().startsWith('链接：'));
    
                        // 如果存在标题和链接节点（情况一或情况四的第一种）
                        if (titleNode && linkNode) {
                            const title = titleNode.getNameInPlainText().replace(/^标题[：:]\s*/, '').trim();
                            const url = linkNode.getNameInPlainText().replace(/^链接[：:]\s*/, '').trim();
                            
                            // 直接构造OPML格式的文本
                            const opmlContent = `<?xml version="1.0"?>
                            <opml version="2.0">
                                <head>
                                    <title>${title}</title>
                                </head>
                                <body>
                                    <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                </body>
                            </opml>`;
                        
                            try {
                                await navigator.clipboard.writeText(opmlContent);
                                copied = true;
                            } catch (error) {
                                console.error('复制失败:', error);
                                showFeedback(this, '复制失败');
                            }
                        }
                        // 处理普通文本和链接混合的情况（情况二或情况四的第二种）
                        else {
                            let contentToCopy = '';
                            
                            for (const child of relevantChildren) {
                                const htmlContent = child.getName();
                                const plainContent = child.getNameInPlainText();
                                
                                if (htmlContent.includes('<a href=')) {
                                    // 处理带链接的HTML内容
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = htmlContent.replace(/#稍后处理/g, '').trim();
                                    const anchor = tempDiv.querySelector('a');
                                    
                                    if (anchor) {
                                        const title = anchor.textContent;
                                        const url = anchor.href;
                                        
                                        // 使用OPML格式，与单节点处理保持一致
                                        const opmlContent = `<?xml version="1.0"?>
                                        <opml version="2.0">
                                            <head>
                                                <title>${title}</title>
                                            </head>
                                            <body>
                                                <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                            </body>
                                        </opml>`;
                                        
                                        contentToCopy += (contentToCopy ? '\n' : '') + opmlContent;
                                    } else {
                                        contentToCopy += (contentToCopy ? '\n' : '') + 
                                                    plainContent.replace(/#稍后处理/g, '').trim();
                                    }
                                } else {
                                    // 处理普通文本内容
                                    contentToCopy += (contentToCopy ? '\n' : '') + 
                                                plainContent.replace(/#稍后处理/g, '').trim();
                                }
                            }
                            
                            if (contentToCopy.trim()) {
                                await navigator.clipboard.writeText(contentToCopy);
                                copied = true;
                            }
                        }
                    }
    
                    if (copied) {
                        showFeedback(this, '已复制');
                        const checkbox = reminderItem.querySelector('.reminder-checkbox');
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            reminderItem.classList.add('completed');
                            reminder.completed = true;
                            saveReminders();
                            syncWorkflowyState(id, true);
                        }
                    }
                } catch (error) {
                    console.error('复制操作失败:', error);
                    showFeedback(this, '复制失败');
                }
            });
        });
    
        // 使用通用事件监听器处理其他功能
        addEventListeners(listElement);
    }
    
    // 辅助函数：标记为完成
    function markAsCompleted(reminderItem, reminder, id) {
        reminderItem.classList.add('completed');
        const checkbox = reminderItem.querySelector('.reminder-checkbox');
        if (checkbox) {
            checkbox.checked = true;
        }
    
        reminder.completed = true;
        saveReminders();
    
        // 同步到 WorkFlowy
        syncWorkflowyState(id, true);
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
    
                // 检测已有的缩进级别和���容
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
                <div class="planner-links">
                    <div class="planner-links-row">
                        <a href="#" class="planner-link today-link" id="goto-today">
                            Today's Plan
                        </a>
                        <a href="https://workflowy.com/#/${MODE_NODES.scan}" class="planner-link scan-link">
                            DailyPlanner
                        </a>
                    </div>
                    <div class="follow-links-wrapper">
                        <a href="https://workflowy.com/#/${MODE_NODES.follow[0]}" class="planner-link follow-link">
                            ForwardLogs
                        </a>
                        <a href="https://workflowy.com/#/${MODE_NODES.follow[1]}" class="planner-link follow-link">
                            Working
                        </a>
                    </div>
                    <a href="https://workflowy.com/#/${MODE_NODES.collect}" class="planner-link collect-link">
                        Collector
                    </a>
                </div>
    
            </div>
            <div class="panel-content">
                <div class="reminder-list" id="reminder-list"></div>
            </div>
            <div class="clear-all-container">
                <button class="clear-all-btn" id="clear-all">清除当前节点</button>
            </div>
        `;
    
        document.body.appendChild(panel);
    
    // 添加面板切换按钮 - 这部分需要确保在正确位置
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
    
    document.getElementById('goto-today').onclick = (e) => {
        e.preventDefault();
        
        try {
            // 缓存今天的时间戳
            const todayKey = new Date().toDateString();
            const cachedNode = sessionStorage.getItem(todayKey);
            
            if (cachedNode) {
                // 尝试���用缓存的节点ID
                try {
                    const node = WF.getItemById(cachedNode);
                    if (node) {
                        WF.zoomTo(node);
                        return;
                    }
                } catch (e) {
                    sessionStorage.removeItem(todayKey);
                }
            }
    
            // 获取日历根节点
            const calendarNode = WF.getItemById(WF.shortIdToId('35a73627730b'));
            if (!calendarNode) {
                WF.showMessage('未找到日历节点', true);
                return;
            }
    
            // 优化的时间戳获取函数
            const parser = new DOMParser();
            function getMsFromItemName(item) {
                const name = item.getName();
                // 快速检查是否包含time标签
                if (!name.includes('<time')) return null;
                
                const time = parser.parseFromString(name, 'text/html').querySelector("time");
                if (!time) return null;
                
                const ta = time.attributes;
                if (!ta || !ta.startyear || ta.starthour || ta.endyear) return null;
                
                return Date.parse(`${ta.startyear.value}/${ta.startmonth.value}/${ta.startday.value}`);
            }
    
            // 优化的查找函数：增加年份预检查
            function findFirstMatchingItem(targetTimestamp, parent) {
                // 获取节点名称
                const name = parent.getName();
                
                // 快速预检查：如果节点名包含年份信息，检查是否匹配
                const currentYear = new Date(targetTimestamp).getFullYear();
                if (name.includes('Plan of') && !name.includes(currentYear.toString())) {
                    return null;
                }
                
                // 检查当前节点
                const nodeTimestamp = getMsFromItemName(parent);
                if (nodeTimestamp === targetTimestamp) return parent;
                
                // 递归检查子节点
                for (let child of parent.getChildren()) {
                    const match = findFirstMatchingItem(targetTimestamp, child);
                    if (match) return match;
                }
                
                return null;
            }
    
            // 获取今天凌晨的时间戳
            const todayTimestamp = new Date((new Date).setHours(0,0,0,0)).valueOf();
            
            // 查找匹配今天日期的节点
            const found = findFirstMatchingItem(todayTimestamp, calendarNode);
    
            if (found) {
                // 缓存找到的节点ID
                sessionStorage.setItem(todayKey, found.getId());
                WF.zoomTo(found);
            } else {
                WF.showMessage('未找到今天的日期节点', true);
            }
        } catch (error) {
            console.error('导航到今天的日期时出错:', error);
            WF.showMessage('导航失败', true);
        }
    };
    
    
        // 初始化事件监听
        document.getElementById('scan-reminders').onclick = () => {
            if (currentMode === 'scan') {
                // 如果点击当前模式，清除该模式的移除记录
                localStorage.removeItem('workflowy_removed_scan');
                // 检查并清理已删除的节点
                cleanDeletedNodes('scan');
            }
            currentMode = 'scan';
            scanReminders();
            updateButtonStyles();
            updateCardsColor(); 
        };
    
        document.getElementById('follow-reminders').onclick = () => {
            if (currentMode === 'follow') {
                // 如果点击当前模式，清除该模式的移除记录
                localStorage.removeItem('workflowy_removed_follow');
                // 检查并清理已删除的节点
                cleanDeletedNodes('follow');
            }
            currentMode = 'follow';
            followReminders();
            updateButtonStyles();
            updateCardsColor(); 
        };
    
        document.getElementById('collect-reminders').onclick = () => {
            if (currentMode === 'collect') {
                // 如果点击当前模式，清除该模式的移除记录
                localStorage.removeItem('workflowy_removed_collect');
                // 检查并清理已删除的节点
                cleanDeletedNodes('collect');
            }
            currentMode = 'collect';
            collectReminders();
            updateButtonStyles();
            updateCardsColor(); 
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
    
    function cleanDeletedNodes(mode) {
        const currentReminders = { ...reminders };
        let hasChanges = false;
    
        // 检查每个提醒项
        for (const [id, reminder] of Object.entries(currentReminders)) {
            if (reminder.mode === mode) {
                try {
                    // 尝试获取节点，如果节点不存在会抛出异常
                    const node = WF.getItemById(id);
                    if (!node) {
                        // 如果节点不存在，删除这个提醒
                        delete reminders[id];
                        hasChanges = true;
                    }
                } catch (e) {
                    // 如果获取节点时出错，说明节点已被删除
                    delete reminders[id];
                    hasChanges = true;
                }
            }
        }
    
        // 如果有变更，保存更新后的提醒列表
        if (hasChanges) {
            saveReminders();
            // 更新显示
            updateReminderList();
        }
    }
    
    // 辅助函数
    function extractReminderContent(text) {
        return normalizeReminderText(text
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
        // 获取当前模式下的所有项目ID
        const currentModeItems = Object.entries(reminders)
            .filter(([_, r]) => r.mode === currentMode)
            .map(([id]) => id);
    
        // 添加到移除记录中
        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');
        const updatedRemovedItems = [...new Set([...removedItems, ...currentModeItems])];
        localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(updatedRemovedItems));
    
        // 清除当前模式的提醒
        reminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode !== currentMode)
        );
        saveReminders();
        updateReminderList();
    }
    
    // 启动应用
    console.log('WorkFlowy Forward Plus...');
    waitForWF();
    })();
    
    