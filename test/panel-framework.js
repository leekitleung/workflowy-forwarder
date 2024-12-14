// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.12
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 提升panel变量到模块作用域
    let panel;

    // 默认配置
    const DEFAULT_CONFIG = {
        version: 'v${SCRIPT_VERSION}',
        theme: 'dark',
        refreshInterval: 60000,
        excludeTags: '',
        dailyPlanner: {
            enabled: false,
            taskName: '',
            nodeId: '',
            calendarNodeId: '' // 默认为空
        },
        target: {
            work: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            },
            personal: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            },
            temp: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            }
        },
        collector: {
            enabled: false,
            taskName: '',
            nodeId: '',
            tags: '',
            autoComplete: true,
            copyFormat: 'plain'
        }
    };

    // 配置管理
    const ConfigManager = {
        // 获取完整配置
        getConfig() {
            try {
                const saved = localStorage.getItem('wf_config');
                return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
            } catch (error) {
                console.error('读取配置失败:', error);
                return DEFAULT_CONFIG;
            }
        },

        // 保存配置
        saveConfig(config) {
            try {
                localStorage.setItem('wf_config', JSON.stringify(config));
                return true;
            } catch (error) {
                console.error('保存配置失败:', error);
                return false;
            }
        },

        // 重置配置
        resetConfig() {
            try {
                localStorage.setItem('wf_config', JSON.stringify(DEFAULT_CONFIG));
                return true;
            } catch (error) {
                console.error('重置配置失败:', error);
                return false;
            }
        },


        validateConfig(config) {
            const errors = [];

            // Validate node ID (support single or multiple, comma-separated)
            const validateNodeId = (id, name) => {
                if (!id) return;
                const ids = id.split(',').map(i => i.trim());
                for (const singleId of ids) {
                    if (singleId && !/^[0-9a-f]{12}$/.test(singleId)) {
                        errors.push(`${name}的节点ID "${singleId}" 格式不正确`);
                    }
                }
            };

            // Validate tags (support single or multiple, comma-separated)
            const validateTags = (tags, name) => {
                if (!tags) return;
                const tagList = tags.split(',').map(t => t.trim());
                for (const tag of tagList) {
                    // Update regex to support Chinese characters and numbers
                    // ^ - start
                    // #? - optional # symbol
                    // [0-9\u4e00-\u9fa5a-zA-Z\s_]+ - support numbers, Chinese, English, spaces and underscore
                    // $ - end
                    if (tag && !/^#?[0-9\u4e00-\u9fa5a-zA-Z\s_]+$/.test(tag)) {
                        errors.push(`${name}的标签 "${tag}" 格式不正确，标签只能包含数字、中文、英文、空格和下划线`);
                    }
                }
            };

            // Validate DailyPlanner
            if (config.dailyPlanner.enabled) {
                validateNodeId(config.dailyPlanner.nodeId, 'DailyPlanner');
                validateTags(config.dailyPlanner.tag, 'DailyPlanner');
            }

            // Validate Target
            Object.entries(config.target).forEach(([key, value]) => {
                if (value.enabled) {
                    validateNodeId(value.nodeId, `Target-${key}`);
                    validateTags(value.tag, `Target-${key}`);
                }
            });

            // Validate Collector
            if (config.collector.enabled) {
                validateNodeId(config.collector.nodeId, 'Collector');
                validateTags(config.collector.tags, 'Collector');
            }

            // Validate exclude tags
            if (config.excludeTags) {
                validateTags(config.excludeTags, '排除标签');
            }

            return errors;
        }
    };

    // 添加基础样式
    GM_addStyle(`
        /* 面板基础样式优化 */
        .wf-panel {
            position: fixed;
            right: -319px; /* 使用固定宽度 */
            top: 46px;
            height: calc(100vh - 46px);
            width: 319px;
            background: #2B3135; /* 更深的背景色 */
            border-left: 1px solid #5c6062; /* 更明显的边框 */
            z-index: 100;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 更流畅的动画 */
            display: flex;
            flex-direction: column;
        }

        /* 链接区域样式优化 */
        .planner-links {
            display: flex;
            flex-direction: column;
            gap: 0px;
            margin: 12px;
        }

        .planner-links-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            width: 100%;
        }

        .planner-link {
            display: flex;
            justify-content: flex-end;
            color: rgba(144, 147, 149, 0.5);
            font-size: 12px;
            text-decoration: none;
            padding: 8px 16px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M4.4632 3.60609L5.0693 3L8.06933 6.00003L5.0693 9.00006L4.4632 8.39397L6.85714 6.00003L4.4632 3.60609Z' fill='%23909395' fill-opacity='0.5'/%3E%3Cpath d='M6 12C2.68629 12 -4.07115e-07 9.31371 -2.62268e-07 6C-1.17422e-07 2.68629 2.68629 -4.07115e-07 6 -2.62268e-07C9.31371 -1.17422e-07 12 2.68629 12 6C12 9.31371 9.31371 12 6 12ZM6 11.1429C8.84032 11.1429 11.1429 8.84032 11.1429 6C11.1429 3.15968 8.84032 0.857143 6 0.857143C3.15968 0.857142 0.857142 3.15968 0.857142 6C0.857142 8.84032 3.15968 11.1429 6 11.1429Z' fill='%23909395' fill-opacity='0.5'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 12px;
        }

        .planner-link:hover {
            color: rgba(53, 125, 166, 1);
            text-decoration: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M4.4632 3.60609L5.0693 3L8.06933 6.00003L5.0693 9.00006L4.4632 8.39397L6.85714 6.00003L4.4632 3.60609Z' fill='%23357DA6'/%3E%3Cpath d='M6 12C2.68629 12 -4.07115e-07 9.31371 -2.62268e-07 6C-1.17422e-07 2.68629 2.68629 -4.07115e-07 6 -2.62268e-07C9.31371 -1.17422e-07 12 2.68629 12 6C12 9.31371 9.31371 12 6 12ZM6 11.1429C8.84032 11.1429 11.1429 8.84032 11.1429 6C11.1429 3.15968 8.84032 0.857143 6 0.857143C3.15968 0.857142 0.857142 3.15968 0.857142 6C0.857142 8.84032 3.15968 11.1429 6 11.1429Z' fill='%23357DA6'/%3E%3C/svg%3E");
            transform: translateX(-2px); /* 轻微位移效果 */
        }

        /* Today's Plan链接特殊样式 */
        .today-link {
            display: flex !important;
            margin-right: auto;
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
            transition: all 0.2s ease;
        }

        .today-link:hover::before {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M8.5 1H8V0H7V1H3V0H2V1H1.5C0.67 1 0 1.67 0 2.5V9.5C0 10.33 0.67 11 1.5 11H8.5C9.33 11 10 10.33 10 9.5V2.5C10 1.67 9.33 1 8.5 1ZM9 9.5C9 9.78 8.78 10 8.5 10H1.5C1.22 10 1 9.78 1 9.5V4H9V9.5ZM9 3H1V2.5C1 2.22 1.22 2 1.5 2H2V3H3V2H7V3H8V2H8.5C8.78 2 9 2.22 9 2.5V3Z' fill='%23357DA6'/%3E%3C/svg%3E");
        }

        /* 卡片样式优化 */
        .task-item {
            position: relative;
            padding: 12px;
            background: rgba(53, 60, 63, 1);
            border: 1px solid rgba(58, 67, 71, 1);
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .task-item:hover {
            background: rgba(56, 70, 81, 1);
            border-color: rgba(68, 80, 88, 1);
            transform: translateY(-1px);
        }

        /* 镜像节点标记优化 */
        .has-mirrors::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: #4a9eff;
            border-radius: 3px 0 0 3px;
            opacity: 0.8; /* 更明显的标记 */
        }

        /* 操作按钮容器 */
        .task-actions {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0 12px;
            opacity: 0;
            transform: translateX(10px);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: linear-gradient(to right, transparent, var(--bg-color, rgba(43, 49, 53, 0.95)) 20%);
        }

        .task-item:hover .task-actions {
            opacity: 1;
            transform: translateX(0);
        }

        /* 操作按钮 */
        .task-action-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            color: #9EA1A2;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateX(10px);
        }

        .task-item:hover .task-action-btn {
            opacity: 1;
            transform: translateX(0);
        }

        .task-action-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            transform: scale(1.1);
        }

        /* 按钮图标 */
        .task-action-btn svg {
            width: 14px;
            height: 14px;
        }

        /* 针对彩色节点的样式调整 */
        .task-item.colored .task-actions {
            background: linear-gradient(to right, transparent, var(--node-color, rgba(43, 49, 53, 0.95)) 20%);
        }

        /* 清除按钮样式优化 */
        .clear-all-container {
            padding: 12px;
            background: #2c3135;
            border-top: 1px solid #444;
            margin-top: auto;
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
            transition: all 0.2s ease;
        }

        .clear-all-btn:hover {
            background: #d9534f;
            transform: translateY(-1px);
        }

        /* 切换按钮样式 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: #2B3135;
            border: none;
            padding: 8px;
            cursor: pointer;
            z-index: 101;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            border-radius: 50%;
        }

        .wf-toggle:hover {
            background: #363b3f;
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: rgba(158, 161, 162, 1);
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle:hover .toggle-arrow {
            opacity: 1;
        }

        /* 主题变量 */
        :root[data-theme="dark"] {
            --bg-color: #1e2124;
            --panel-bg: #2B3135;
            --border-color: #5c6062;
            --text-color: #d9dbdb;
            --text-secondary: #9ea1a2;
            --input-bg: #383f44;
            --input-border: #5c6062;
            --input-focus-border: #4a9eff;
            --input-focus-bg: #404850;
            --section-bg: rgba(255, 255, 255, 0.03);
            --group-bg: rgba(255, 255, 255, 0.02);
            --divider-color: #3a4347;
        }

        :root[data-theme="light"] {
            --bg-color: #f5f5f5;
            --panel-bg: #ffffff;
            --border-color: #e0e0e0;
            --text-color: #333333;
            --text-secondary: #666666;
            --input-bg: #ffffff;
            --input-border: #d0d0d0;
            --input-focus-border: #2196f3;
            --input-focus-bg: #f8f9fa;
            --section-bg: rgba(0, 0, 0, 0.02);
            --group-bg: rgba(0, 0, 0, 0.01);
            --divider-color: #e0e0e0;
        }

        /* 设置面板内容样式 */
        .config-header {
            padding: 24px 12px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .config-header h2 {
            margin: 0;
            font-size: 18px;
            color: var(--text-color);
            font-weight: 500;
        }

        .header-actions {
            margin-top: 12px;
        }

        .theme-toggle {
            background: none;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .version-tag {
            font-size: 8px;
            color: var(--text-secondary);
            margin-left: 8px;
            padding: 0px 2px;
            background: var(--bg-color);
            border-radius: 4px;
            border: 1px solid var(--border-color);
        }

        /* 模�������������������切����按钮组样式 */
        .mode-switch {
            display: flex;
            background: rgba(39, 45, 50, 1);
            border-radius: 6px;
            padding: 6px;
            margin: 16px 12px;
        }

        .mode-btn {
            flex: 1;
            padding: 6px 10px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            font-size: 14px;
            margin: 2px;
        }

        .mode-btn.active {
            background: rgba(56, 70, 81, 1);
            color: var(--text-color);
        }

        .mode-btn:hover {
            background: var(--hover-bg);
            color: var(--text-color);
        }

        /* 配置按钮样式 */
        .config-trigger {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-color);
        }

        .config-trigger-btn {
            width: 100%;
            padding: 12px;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .config-trigger-btn:hover {
            background: var(--hover-bg);
        }

        /* 配置面板样式 */
        .config-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-color);
            z-index: 200;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease;
            display: flex;
            flex-direction: column;
        }

        .config-panel.visible {
            opacity: 1;
            visibility: visible;
        }

        .config-panel-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .config-panel-title {
            font-size: 16px;
            color: var(--text-color);
            margin: 0;
        }

        .config-panel-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 20px;
            padding: 4px;
        }

        .config-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        /* 配置组样式优化 */
        .config-group {
            margin-bottom: 16px;
            padding: 16px;
            background: var(--section-bg);
            border-radius: 6px;
            border: 1px solid var(--border-color);
        }

        .group-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .task-name-input {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
        }

        .config-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .config-item label {
            min-width: 80px;
            color: var(--text-secondary);
        }

        .config-item input {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
        }

        .config-buttons {
            padding: 16px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-color);
        }

        .config-btn {
            width: 100%;
            padding: 12px;
            margin-bottom: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .config-save {
            background: var(--btn-bg);
            color: var(--btn-text);
        }

        .config-reset {
            background: var(--input-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }

        /* 复选框样式 */
        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
        }

        /* 复选框标签样式 */
        .checkbox-label {
            margin-left: 8px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        /* 下拉选择框样式 */
        .config-select {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
            cursor: pointer;
        }

        .config-select option {
            background: var(--bg-color);
            color: var(--text-color);
        }

        /* 任务名称输入框样式 */
        .task-name-input {
            background: none;
            border: 1px solid transparent;
            color: var(--text-color);
            font-size: 14px;
            padding: 6px 10px;
            border-radius: 4px;
            width: 120px;
            transition: all 0.2s ease;
        }

        .task-name-input:hover,
        .task-name-input:focus {
            background: var(--input-bg);
            border-color: var(--input-border);
            outline: none;
        }

        /* 分组头部样式 */
        .group-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .group-header input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
        }

        /* 配置项样式 */
        .config-item {
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .config-item label {
            min-width: 60px;
            color: var(--text-secondary);
            font-size: 13px;
        }

        .config-item input:not([type="checkbox"]) {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .config-item input:focus {
            outline: none;
            border-color: var(--input-focus-border);
            background: var(--input-focus-bg);
        }

        /* 模式切换样式 */
        .mode-switch {
            display: flex;
            background: rgba(39, 45, 50, 1);
            border-radius: 6px;
            padding: 6px;
            margin: 16px 12px;
        }

        .mode-btn {
            flex: 1;
            padding: 6px 10px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            font-size: 14px;
            margin: 2px;
        }

        .mode-btn.active {
            background: rgba(56, 70, 81, 1);
            color: var(--text-color);
        }

        .mode-btn:hover {
            background: var(--hover-bg);
            color: var(--text-color);
        }


        .mode-contents {
            flex: 1;
            overflow: hidden;
            position: relative;
        }
        /* 模式内容区域样式 */
        .mode-content {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow-y: auto;
            display: none;
            padding:16px;
        }

        .mode-content.active {
            display: block;
        }

        /* 任务列表样式 */
        .task-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .task-item {
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
            background: var(--section-bg);
            border: 1px solid var(--border-color);
        }

        .task-item:hover {
            background: var(--group-bg);
        }

        .task-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .task-title {
            font-size: 14px;
            color: var(--text-color);
        }

        .task-actions {
            display: flex;
            gap: 8px;
        }


        .task-action-btn {
            padding: 4px 8px;
            border: none;
            background: var(--input-bg);
            color: var(--text-color);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .task-action-btn:hover {
            background: var(--input-focus-bg);
        }

        /* Toast 提示样式 */
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            pointer-events: none;
            transition: opacity 0.3s ease;
            opacity: 0;
        }

        /* 禁用状态的输入框样式 */
        input:disabled,
        select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--section-bg) !important;
        }

        /* 禁用状态的输入框hover效果 */
        input:disabled:hover,
        select:disabled:hover {
            border-color: var(--input-border) !important;
            background: var(--section-bg) !important;
        }

        /* Mode switching styles */
        .mode-switch {
            display: flex;
            background: var(--section-bg);
            border-radius: 6px;
            padding: 6px;
            gap: 6px;
            margin: 16px 12px;
        }

        .mode-btn {
            flex: 1;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            font-size: 14px;
        }

        .mode-btn.active {
            background: var(--input-bg);
            color: var(--text-color);
        }

        .mode-btn:hover {
            background: var(--hover-bg);
            color: var(--text-color);
        }

        .mode-content {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: none;
        }

        .mode-content.active {
            display: block;
        }

        /* Task list styles */
        .task-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .task-item {
            padding: 12px;
            background: var(--section-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-bottom: 8px;
        }

        .task-item:hover {
            background: var(--hover-bg);
        }

        .error-state {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
            font-style: italic;
            border-radius: 4px;
            margin: 12px;
            font-size: 14px;
        }

        /* 自���义复选框样式 */
        .checkbox-wrapper {
            position: relative;
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 8px;
        }

        .checkbox-wrapper input[type="checkbox"] {
            opacity: 0;
            position: absolute;
        }

        .checkbox-custom {
            position: absolute;
            top: 0;
            left: 0;
            width: 16px;
            height: 16px;
            border: 2px solid var(--text-color);
            border-radius: 3px;
            transition: all 0.2s ease;
        }

        .checkbox-wrapper input[type="checkbox"]:checked + .checkbox-custom {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        .checkbox-wrapper input[type="checkbox"]:checked + .checkbox-custom::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 5px;
            width: 4px;
            height: 8px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        /* 任务项样式 */
        .task-item {
            display: flex;
            align-items: flex-start;
            padding: 8px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s ease;
        }

        .task-item:hover {
            background-color: var(--hover-color);
        }

        .task-content {
            flex: 1;
            display: flex;
            align-items: flex-start;
        }

        .task-text {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .task-name {
            font-size: 14px;
            line-height: 1.4;
        }

        .task-note {
            font-size: 12px;
            color: var(--secondary-text-color);
            margin-top: 4px;
        }

        .task-actions {
            display: flex;
            gap: 4px;
        }

        .task-actions button {
            padding: 4px;
            border: none;
            background: none;
            color: var(--text-color);
            opacity: 0.6;
            cursor: pointer;
            transition: opacity 0.2s ease;
        }

        .task-actions button:hover {
            opacity: 1;
        }

        /* 标题栏样式 */
        .task-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .task-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        /* Target模式样式 */
        .target-tasks {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .target-section {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            overflow: hidden;
        }

        .target-section .task-header {
            background: var(--header-background);
            border-bottom: 1px solid var(--border-color);
        }

        .target-section .task-list {
            max-height: 300px;
            overflow-y: auto;
        }

        /* 滚动条样式 */
        .target-section .task-list::-webkit-scrollbar {
            width: 6px;
        }

        .target-section .task-list::-webkit-scrollbar-track {
            background: var(--background-color);
        }

        .target-section .task-list::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }

        .target-section .task-list::-webkit-scrollbar-thumb:hover {
            background: var(--secondary-text-color);
        }

        /* 镜像节点标记 */
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

        /* 改进多列布局响应式 */
        .target-tasks {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            padding: 16px;
        }

        @media (max-width: 768px) {
            .target-tasks {
                grid-template-columns: 1fr;
            }
        }

        /* 统一卡片样式 */
        .task-item {
            position: relative;
            padding: 12px;
            background: var(--section-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s ease;
        }

        .task-item:hover {
            background: var(--hover-bg);
            border-color: var(--border-color-hover);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* 更多视觉反馈 */
        .task-item .reminder-actions button {
            opacity: 0;
            transform: translateX(10px);
            transition: all 0.2s ease;
        }

        .task-item:hover .reminder-actions button {
            opacity: 1;
            transform: translateX(0);
        }

        .task-item .reminder-actions button:hover {
            transform: scale(1.1);
        }

        /* 面板显示/隐藏状态 */
        .wf-panel {
            position: fixed;
            right: -319px;
            top: 46px;
            height: calc(100vh - 46px);
            width: 319px;
            background: #2B3135;
            border-left: 1px solid #5c6062;
            z-index: 100;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        }

        .wf-panel.visible {
            transform: translateX(-319px);
        }

        .wf-panel.visible ~ #content {
            padding-right: 319px;
        }

        #content {
            transition: padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 切换按钮样式 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: #2B3135;
            border: none;
            padding: 8px;
            cursor: pointer;
            z-index: 101;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            border-radius: 50%;
        }

        .wf-toggle:hover {
            background: #363b3f;
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: rgba(158, 161, 162, 1);
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle:hover .toggle-arrow {
            opacity: 1;
        }

        /* 卡片颜色支持 */
        .task-item.colored {
            background: var(--node-color);
            border-color: var(--node-border-color);
            color: var(--text-color);
        }

        .task-item.colored:hover {
            background: var(--node-color-hover);
            border-color: var(--node-border-color-hover);
        }

        .task-item.colored .reminder-actions {
            background: var(--actions-bg-hover);
        }

        .task-item.colored .task-name,
        .task-item.colored .task-note {
            color: var(--text-color);
        }

        /* 时间块样式 */
        .time-block {
            margin-bottom: 16px;
        }

        .time-label {
            font-family: "Aclonica", sans-serif;
            font-weight: 400;
            font-style: italic;
            color: #d9dbdb;
            font-size: 14px;
            margin-bottom: 4px;
            padding: 4px;
        }

        .time-block .task-list {
            margin-left: 12px;
        }

        .time-block:last-child {
            margin-bottom: 0;
        }

        /* 节点分组样式 */
        .node-section {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(92, 96, 98, 0.5);
        }

        .node-section:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }

        .node-title {
            font-family: "Aclonica", sans-serif;
            font-weight: 400;
            font-style: italic;
            color: #d9dbdb;
            font-size: 14px;
            margin-bottom: 12px;
            padding: 4px;
        }

        .node-content {
            margin-left: 12px;
        }

        /* ... 其他样式 ... */
        .input-with-help {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .help-text {
            font-size: 12px;
            color: var(--text-secondary);
            font-style: italic;
        }
    `);

    // 面板切换函数
    function togglePanel() {
        const panel = document.querySelector('.wf-panel');
        const toggleBtn = document.querySelector('.wf-toggle');
        const content = document.getElementById('content');

        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');

            // 更新内容区域padding
            if (content) {
                content.style.paddingRight = panel.classList.contains('visible') ? '319px' : '0';
            }
        }
    }

    // 主题切换函数
    function toggleTheme() {
        const html = document.documentElement;
        const themeIcon = document.querySelector('.theme-icon');
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';

        localStorage.setItem('wf_theme', newTheme);
    }

    // 初始化主题
    function initTheme() {
        const savedTheme = localStorage.getItem('wf_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function handleKeyPress(e) {
        // Ctrl + /
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            togglePanel();
        }
    }

    // 添加模式选择限制的相关函数
    function handleModeSelection(checkbox) {
        const enabledModes = [
            'enable-daily',
            'enable-work',
            'enable-personal',
            'enable-temp',
            'enable-collector'
        ].filter(id => document.getElementById(id)?.checked);

        if (enabledModes.length > 3 && checkbox.checked) {
            checkbox.checked = false;
            showToast('多只能启用3个模式');
            return false;
        }

        // 更新相关输入框的状态
        const group = checkbox.closest('.config-group');
        if (group) {
            const inputs = group.querySelectorAll('input:not([type="checkbox"]), select');
            inputs.forEach(input => {
                input.disabled = !checkbox.checked;
                if (!checkbox.checked) {
                    input.value = ''; // 取消选择时清空输入
                }
            });
        }

        return true;
    }

    // 工具函数
    function createToast() {
        const toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
        return toast;
    }

    // 显示提示信息
    function showToast(message) {
        const toast = document.querySelector('.toast') || createToast();
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }

    function updateModeButtons() {
        if (!panel) return;
        const config = ConfigManager.getConfig();

        // Update Daily button
        const dailyBtn = document.getElementById('mode-daily');
        if (dailyBtn) {
            dailyBtn.textContent = config.dailyPlanner.taskName || 'Daily';
            dailyBtn.style.display = config.dailyPlanner.enabled ? 'block' : 'none';
        }

        // Update Target button
        const targetBtn = document.getElementById('mode-target');
        if (targetBtn) {
            const targetEnabled = config.target.work.enabled ||
                                config.target.personal.enabled ||
                                config.target.temp.enabled;
            targetBtn.style.display = targetEnabled ? 'block' : 'none';

            let targetName = 'Target';
            if (config.target.work.enabled && config.target.work.taskName) {
                targetName = config.target.work.taskName;
            } else if (config.target.personal.enabled && config.target.personal.taskName) {
                targetName = config.target.personal.taskName;
            } else if (config.target.temp.enabled && config.target.temp.taskName) {
                targetName = config.target.temp.taskName;
            }
            targetBtn.textContent = targetName;
        }

        // Update Collector button
        const collectorBtn = document.getElementById('mode-collector');
        if (collectorBtn) {
            collectorBtn.textContent = config.collector.taskName || 'Collector';
            collectorBtn.style.display = config.collector.enabled ? 'block' : 'none';
        }
    }

    // 加载配置
    function loadConfig() {
        if (!panel) return;
        const config = ConfigManager.getConfig();

        // 设置表单值并控制输入框状态
        const setInputsState = (prefix, enabled) => {
            const group = document.getElementById(`enable-${prefix}`)?.closest('.config-group');
            if (group) {
                const inputs = group.querySelectorAll('input:not([type="checkbox"]), select');
                inputs.forEach(input => {
                    input.disabled = !enabled;
                });
            }
        };

        // 设置表单值
        Object.entries({
            'node-daily': config.dailyPlanner.nodeId,
            'task-daily': config.dailyPlanner.taskName,
            'enable-daily': config.dailyPlanner.enabled,
            'calendar-node-daily': config.dailyPlanner.calendarNodeId,

            'node-work': config.target.work.nodeId,
            'task-work': config.target.work.taskName,
            'enable-work': config.target.work.enabled,
            'tag-work': config.target.work.tag,

            'node-personal': config.target.personal.nodeId,
            'task-personal': config.target.personal.taskName,
            'enable-personal': config.target.personal.enabled,
            'tag-personal': config.target.personal.tag,

            'node-temp': config.target.temp.nodeId,
            'task-temp': config.target.temp.taskName,
            'enable-temp': config.target.temp.enabled,
            'tag-temp': config.target.temp.tag,

            'node-collector': config.collector.nodeId,
            'task-collector': config.collector.taskName,
            'enable-collector': config.collector.enabled,
            'tag-collector': config.collector.tags,
            'auto-complete-collector': config.collector.autoComplete,
            'copy-format-collector': config.collector.copyFormat,

            'refresh-interval': config.refreshInterval,
            'exclude-tags': config.excludeTags
        }).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // 设置各模式输入框状态
        setInputsState('daily', config.dailyPlanner.enabled);
        setInputsState('work', config.target.work.enabled);
        setInputsState('personal', config.target.personal.enabled);
        setInputsState('temp', config.target.temp.enabled);
        setInputsState('collector', config.collector.enabled);

        // 更新模式按钮
        updateModeButtons();
    }

    function initPanel() {
        panel = document.createElement('div');
        panel.className = 'wf-panel';

        panel.innerHTML = `
            <div class="config-header">
                <h2>
                    Workflowy<br/>
                    Forwarder Plus
                    <span class="version-tag">v${DEFAULT_CONFIG.version}</span>
                </h2>
            </div>

            <!-- Mode switching buttons -->
            <div class="mode-switch">
                <button id="mode-daily" class="mode-btn">Daily</button>
                <button id="mode-target" class="mode-btn">Target</button>
                <button id="mode-collector" class="mode-btn">Collector</button>
            </div>

            <!-- Links area -->
            <div class="planner-links">
                <div class="planner-links-row">
                    <a href="#" class="planner-link today-link" id="goto-today">
                        Today's Plan
                    </a>
                    <a href="#" class="planner-link scan-link">
                        Daily
                    </a>
                </div>
                <div class="follow-links-wrapper">
                    <a href="#" class="planner-link follow-link">
                        Target
                    </a>
                    <a href="#" class="planner-link follow-link">
                        Target
                    </a>
                </div>
                <a href="#" class="planner-link collect-link">
                    Collector
                </a>
            </div>

            <!-- Mode content containers -->
            <div class="mode-contents">
                <div class="mode-content" id="daily-content"></div>
                <div class="mode-content" id="target-content">
                    <div class="task-list">
                        <!-- Target tasks will be rendered here -->
                    </div>
                </div>
                <div class="mode-content" id="collector-content">
                    <div class="task-list">
                        <!-- Collected items will be rendered here -->
                    </div>
                </div>
            </div>

            <!-- Clear button -->
            <div class="clear-all-container">
                <button class="clear-all-btn" id="clear-all">清除当前节点</button>
            </div>

            <!-- Config trigger -->
            <div class="config-trigger">
                <button class="config-trigger-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.5 1L7.5 0H8.5L9.5 1L10.5 1.5L11.5 1L12.5 1.5L13 2.5L14 3.5L14.5 4.5L15 5.5V6.5L14 7.5V8.5L15 9.5V10.5L14.5 11.5L14 12.5L13 13.5L12.5 14.5L11.5 15L10.5 14.5L9.5 15H8.5L7.5 16H6.5L5.5 15L4.5 14.5L3.5 15L2.5 14.5L2 13.5L1 12.5L0.5 11.5L0 10.5V9.5L1 8.5V7.5L0 6.5V5.5L0.5 4.5L1 3.5L2 2.5L2.5 1.5L3.5 1L4.5 1.5L5.5 1H6.5Z" fill="currentColor"/>
                        <circle cx="8" cy="8" r="2" fill="var(--bg-color)"/>
                    </svg>
                    ��置
                </button>
            </div>

            <!-- Config panel -->
            <div class="config-panel">
                <div class="config-panel-header">
                    <h3 class="config-panel-title">设置</h3>
                    <button class="config-panel-close">×</button>
                </div>
                <div class="config-panel-content">
                    <!-- DailyPlanner 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>DailyPlanner 设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-daily">
                                <input type="text" class="task-name-input" id="task-daily" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-daily" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>日历节点</label>
                                    <div class="input-with-help">
                                        <input type="text" id="calendar-node-daily" 
                                               placeholder="输入日历节点ID"
                                               title="用于Today's Plan功能的日历根节点ID">
                                        <span class="help-text">留空则不显示Today's Plan链接</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Target 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>Target 设置</h3>
                        </div>
                        <!-- 工作任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-work">
                                <input type="text" class="task-name-input" id="task-work" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-work" placeholder="输入节点ID，多个用逗号分隔">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-work"
                                        placeholder="输入标签，如: #01每日推进,#重要 (支持数字、中文、英文，多个用逗号分隔)">
                                </div>
                            </div>
                        </div>

                        <!-- 个人任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-personal">
                                <input type="text" class="task-name-input" id="task-personal" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-personal" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-personal" placeholder="输入标签，如: #01每日推进 (支持数字、中文、英文)">
                                </div>
                            </div>
                        </div>

                        <!-- 临时任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-temp">
                                <input type="text" class="task-name-input" id="task-temp" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-temp" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-temp" placeholder="输入标签，如: #01每日推进 (支持数字、中文、英文)">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Collector 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>Collector 设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-collector">
                                <input type="text" class="task-name-input" id="task-collector" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-collector" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-collector" placeholder="输入标签，多个用逗号分隔">
                                </div>
                                <div class="config-item">
                                    <label>自动完成</label>
                                    <input type="checkbox" id="auto-complete-collector">
                                    <span class="checkbox-label">复制内容后自动标记完成</span>
                                </div>
                                <div class="config-item">
                                    <label>复制格式</label>
                                    <select id="copy-format-collector" class="config-select">
                                        <option value="plain">纯文本</option>
                                        <option value="markdown">Markdown</option>
                                        <option value="opml">OPML</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 基本设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>基本设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="config-item">
                                <label>主题</label>
                                <button class="theme-toggle">
                                    <i class="theme-icon">🌙</i>
                                    <span class="theme-text">切换主题</span>
                                </button>
                            </div>
                            <div class="config-item">
                                <label>刷新间隔</label>
                                <input type="number" id="refresh-interval" placeholder="毫秒">
                            </div>
                            <div class="config-item">
                                <label>排除标签</label>
                                <input type="text" id="exclude-tags" placeholder="输入要排除的标签，多个用逗号分隔">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="config-buttons">
                    <button class="config-btn config-save">保存设置</button>
                    <button class="config-btn config-reset">重置设置</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 统一使用一个modeButtons变量
        const modeButtons = document.querySelectorAll('.mode-btn');

        // 初始化模式切换和链接更新
        function initModeHandlers() {
            modeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.id.replace('mode-', '');

                    // 更新按钮状态
                    modeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // 保存当前模式
                    localStorage.setItem('wf_current_mode', mode);

                    // 切换模式内容
                    switchMode(mode);

                    // 更新链接显示
                    updateLinks(mode);
                });
            });
        }

        // 初始化链接更新
        function updateLinks(mode) {
            const config = ConfigManager.getConfig();
            const links = {
                daily: [
                    {
                        selector: '.today-link',
                        display: !!config.dailyPlanner.calendarNodeId, // 只在有日历节点ID时显示
                        href: '#',
                        text: "Today's Plan"
                    },
                    {
                        selector: '.scan-link',
                        display: true,
                        href: WF.getItemById(config.dailyPlanner.nodeId)?.getUrl() || '#',
                        text: config.dailyPlanner.taskName || 'Daily'
                    }
                ],
                target: [
                    {
                        selector: '.follow-link:nth-child(1)',
                        display: true,
                        href: WF.getItemById(config.target.work.nodeId)?.getUrl() || '#',
                        text: config.target.work.taskName || 'Target'
                    },
                    {
                        selector: '.follow-link:nth-child(2)',
                        display: true,
                        href: WF.getItemById(config.target.personal.nodeId)?.getUrl() || '#',
                        text: config.target.personal.taskName || 'Target'
                    }
                ],
                collector: [
                    {
                        selector: '.collect-link',
                        display: true,
                        href: WF.getItemById(config.collector.nodeId)?.getUrl() || '#',
                        text: config.collector.taskName || 'Collector'
                    }
                ]
            };

            // 隐藏所有链接
            document.querySelectorAll('.planner-link').forEach(link => {
                link.style.display = 'none';
            });

            // 显示当前模式的链接
            if (links[mode]) {
                links[mode].forEach(link => {
                    const element = document.querySelector(link.selector);
                    if (element) {
                        element.style.display = link.display ? 'flex' : 'none';
                        element.href = link.href;
                        element.textContent = link.text; // 更新链接文本
                    }
                });
            }
        }

        // 初始化清除按钮
        document.getElementById('clear-all').onclick = () => {
            if (confirm('确定要清除当前模式的所有节点吗？')) {
                const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                clearAllReminders(currentMode);
                showToast('已清除所有节点');
            }
        };

        initTodayPlan();

        // 初始化配置面板
        initConfigPanel();

        // 初始化模式处理
        initModeHandlers();

        // 恢复上次的模式
        const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
        const savedModeBtn = document.querySelector(`#mode-${savedMode}`);
        if (savedModeBtn) {
            savedModeBtn.click();
        }

        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'wf-toggle';
        toggleBtn.innerHTML = `
            <svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        `;
        document.body.appendChild(toggleBtn);

        // 添加切换按钮事件监听
        toggleBtn.onclick = togglePanel;
        document.addEventListener('keydown', handleKeyPress, false);

        // 初始化主题
        initTheme();

        // Initialize Today's Plan functionality
        initTodayPlan();
    }

    // 将 switchMode 函数移到模块作用域
    function switchMode(mode) {
        // Hide all content
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected mode content
        const contentEl = document.getElementById(`${mode}-content`);
        const buttonEl = document.getElementById(`mode-${mode}`);

        if (contentEl && buttonEl) {
            contentEl.classList.add('active');
            buttonEl.classList.add('active');

            // 渲染内容
            const config = ConfigManager.getConfig();
            try {
                switch (mode) {
                    case 'daily':
                        ViewRenderer.renderDailyView(contentEl, config);
                        break;
                    case 'target':
                        ViewRenderer.renderTargetView(contentEl, config);
                        break;
                    case 'collector':
                        ViewRenderer.renderCollectorView(contentEl, config);
                        break;
                }
            } catch (error) {
                console.error('Error rendering mode content:', error);
                contentEl.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
            }
        }

        // Save current mode
        localStorage.setItem('wf_current_mode', mode);
    }

    // 添加checkMirrorNodes函数定义
    function checkMirrorNodes(node) {
        try {
            if (!node) return false;
            const element = node.getElement();
            return element?.closest('.project')?.classList.contains('hasMirrors') || false;
        } catch (error) {
            console.error('检查镜像节点失败:', error);
            return false;
        }
    }

    // 更新getNodeColor函数
    function getNodeColor(node) {
        try {
            const name = node.getName();
            if (!name) return null;

            // 匹配颜色类
            const colorMatch = name.match(/class="colored ((?:c-|bc-)[a-z]+)"/);
            if (!colorMatch) return null;

            const colorClass = colorMatch[1];

            // 文本颜色映射
            const textColorMap = {
                'c-red': '#d32f2f',
                'c-orange': '#ef6c00',
                'c-yellow': '#f9a825',
                'c-green': '#388e3c',
                'c-blue': '#1e88e5',
                'c-purple': '#7b1fa2',
                'c-pink': '#e91e63',
                'c-sky': '#00bcd4',
                'c-teal': '#009688',
                'c-gray': '#757575'
            };

            // 背景颜色映射
            const bgColorMap = {
                'bc-red': 'rgba(211, 47, 47, 0.2)',
                'bc-orange': 'rgba(239, 108, 0, 0.2)',
                'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                'bc-green': 'rgba(56, 142, 60, 0.2)',
                'bc-blue': 'rgba(30, 136, 229, 0.2)',
                'bc-purple': 'rgba(123, 31, 162, 0.2)',
                'bc-pink': 'rgba(233, 30, 99, 0.2)',
                'bc-sky': 'rgba(0, 188, 212, 0.2)',
                'bc-teal': 'rgba(0, 150, 136, 0.2)',
                'bc-gray': 'rgba(117, 117, 117, 0.2)'
            };

            if (colorClass.startsWith('c-')) {
                const color = textColorMap[colorClass];
                return {
                    background: `${color}1a`, // 10% opacity
                    border: `${color}33`,     // 20% opacity
                    text: color,
                    hover: {
                        background: `${color}26`, // 15% opacity
                        border: `${color}40`,     // 25% opacity
                        actions: `${color}0d`     // 5% opacity
                    }
                };
            } else if (colorClass.startsWith('bc-')) {
                const bgColor = bgColorMap[colorClass];
                const [r, g, b] = bgColor.match(/\d+/g);
                return {
                    background: bgColor,
                    border: bgColor.replace('0.2', '0.3'),
                    text: '#000000',
                    hover: {
                        background: `rgba(${r}, ${g}, ${b}, 0.25)`,
                        border: `rgba(${r}, ${g}, ${b}, 0.35)`,
                        actions: `rgba(${r}, ${g}, ${b}, 0.1)`
                    }
                };
            }

            return null;
        } catch (error) {
            console.error('获取节点颜色失败:', error);
            return null;
        }
    }

    // 更新卡片样式
    GM_addStyle(`
        /* 卡片基础样式 */
        .task-item {
            position: relative;
            padding: 12px;
            background: var(--bg-color, rgba(53, 60, 63, 1));
            border: 1px solid var(--border-color, rgba(58, 67, 71, 1));
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-color, #e8e8e8));
        }

        /* 彩色节点样式 */
        .task-item.colored {
            background: var(--node-bg-color);
            border-color: var(--node-border-color);
            color: var(--node-text-color);
        }

        .task-item.colored:hover {
            background: var(--node-bg-color);
            border-color: var(--node-border-color);
        }

        .task-item.colored .task-name,
        .task-item.colored .task-note {
            color: var(--node-text-color);
        }

        /* 操作按钮区域 */
        .task-item.colored .task-actions {
            background: linear-gradient(to right, 
                transparent, 
                var(--node-bg-color) 20%
            );
        }
    `);

    // 添加复制格式处理函数
    function formatContent(node, format = 'plain') {
        try {
            switch (format) {
                case 'plain': {
                    // 纯文本格式：移除所有HTML标记
                    const name = node.getNameInPlainText().trim();
                    const note = node.getNoteInPlainText().trim();
                    return note ? `${name}\n${note}` : name;
                }

                case 'formatted': {
                    // 保留原始格式：保持HTML标记
                    const name = node.getName().trim();
                    const note = node.getNote().trim();
                    return note ? `${name}\n${note}` : name;
                }

                case 'markdown': {
                    // 转换为Markdown格式
                    const convertToMarkdown = (html) => {
                        return html
                            // 处理粗体
                            .replace(/<b>(.*?)<\/b>/g, '**$1**')
                            // 处理斜体
                            .replace(/<i>(.*?)<\/i>/g, '_$1_')
                            // 处理链接
                            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
                            // 处理换行
                            .replace(/<br\s*\/?>/g, '\n')
                            // 移除其他HTML标记
                            .replace(/<[^>]+>/g, '')
                            // 清理多余空白
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const name = convertToMarkdown(node.getName());
                    const note = convertToMarkdown(node.getNote());
                    return note ? `${name}\n\n${note}` : name;
                }

                default:
                    return node.getNameInPlainText();
            }
        } catch (error) {
            console.error('格式化内容失败:', error);
            // 发生错误时返回纯文本
            return node.getNameInPlainText();
        }
    }

    // 更新Templates对象中的taskItem函数
    const Templates = {
        taskItem: (child, showCopy = true, mode = '') => {
            const hasMirrors = checkMirrorNodes(child);
            const colors = getNodeColor(child);
            
            // 构建颜色样式
            const colorStyle = colors ? `
                style="
                    --node-bg-color: ${colors.background};
                    --node-border-color: ${colors.border};
                    --node-text-color: ${colors.text};
                    --node-bg-color-hover: ${colors.hover.background};
                    --node-border-color-hover: ${colors.hover.border};
                    --actions-bg-hover: ${colors.hover.actions};
                "
            ` : '';

            // Collector模式特殊处理
            if (mode === 'collector') {
                return `
                    <div class="task-item ${child.isCompleted() ? 'completed' : ''} 
                        ${hasMirrors ? 'has-mirrors' : ''} ${colors ? 'colored' : ''}"
                        data-id="${child.getId()}"
                        ${colorStyle}>
                        <div class="task-content">
                            <label class="checkbox-wrapper">
                                <input type="checkbox" ${child.isCompleted() ? 'checked' : ''}>
                                <span class="checkbox-custom"></span>
                            </label>
                            <div class="task-text">
                                <div class="content-wrapper">
                                    <div class="name-content">${child.getName()}</div>
                                    ${child.getNote() ? `
                                        <div class="note-content">${child.getNote()}</div>
                                    ` : ''}
                                </div>
                                <div class="meta-info">
                                    <span class="timestamp">
                                        ${new Date(child.getLastModifiedDate()).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="task-action-btn link" title="跳转到节点">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                                </svg>
                            </button>
                            <button class="task-action-btn remove" title="移除">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // 生成节点链接
            const nodeLink = child.getUrl();
            
            // 根据模式决定是否添加链接
            const contentWrapper = (content) => {
                if (mode === 'collector') {
                    return content;
                } else {
                    return `<a href="${nodeLink}" class="task-link">${content}</a>`;
                }
            };
            
            return `
                <div class="task-item ${child.isCompleted() ? 'completed' : ''} 
                    ${hasMirrors ? 'has-mirrors' : ''} ${colors ? 'colored' : ''}"
                    data-id="${child.getId()}"
                    ${colorStyle}>
                    <div class="task-content">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" ${child.isCompleted() ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                        </label>
                        <div class="task-text">
                            ${contentWrapper(`
                                <span class="task-name">${child.getNameInPlainText()}</span>
                                ${child.getNoteInPlainText() ? `
                                    <span class="task-note">${child.getNoteInPlainText()}</span>
                                ` : ''}
                            `)}
                        </div>
                    </div>
                    <div class="task-actions">
                        ${showCopy ? `
                            <button class="task-action-btn copy" title="复制">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="task-action-btn remove" title="移除">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
    };

    // 添加extractReminderContent函数定义
    function extractReminderContent(text) {
        if (!text) return '';
        return normalizeReminderText(text
            .replace(/#remind/, '')
            .replace(/#提醒/, '')
            .replace(/#稍后处理/, '')
            .replace(/#01每日推进/, '')
            .trim());
    }

    // 添加normalizeReminderText函数定义
    function normalizeReminderText(text) {
        return text.trim().replace(/\s+/g, ' ');
    }

    // 添加时间块处理函数
    function createTimeBlocks() {
        const blocks = [];
        for (let hour = 5; hour <= 22; hour++) {
            blocks.push({
                time: `${hour.toString().padStart(2, '0')}:00`,
                nodes: []
            });
        }
        return blocks;
    }

    // 更新时间节点处理函数
    function getNodeTime(node) {
        const name = node.getNameInPlainText();
        const timeMatch = name.match(/^(\d{2}):(\d{2})/);
        if (!timeMatch) return null;

        const hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);

        // 只返回小时匹配的时间
        if (minute === 0 && hour >= 5 && hour <= 22) {
            return {
                time: `${hour.toString().padStart(2, '0')}:00`,
                node: node
            };
        }

        return null;
    }

    // 添加ViewRenderer对象
    const ViewRenderer = {
        // 渲染 DailyPlanner 视图
        async renderDailyView(container, config) {
            if (!config.dailyPlanner.enabled || !config.dailyPlanner.nodeId) {
                container.innerHTML = '<div class="empty-state">请先配置日常计划节点</div>';
                return;
            }

            container.innerHTML = '<div class="loading">加载中...</div>';

            try {
                const node = WF.getItemById(config.dailyPlanner.nodeId);
                if (!node) {
                    container.innerHTML = '<div class="error-state">节点不存在或无法访问</div>';
                    return;
                }

                // 获取所有节点
                const allNodes = getAllDescendants(node);
                if (!allNodes || allNodes.length === 0) {
                    container.innerHTML = '<div class="empty-state">暂无任务</div>';
                    return;
                }

                // 创建时间块
                const timeBlocks = createTimeBlocks();

                // 将节点分配到对应时间块
                allNodes.forEach(child => {
                    const timeInfo = getNodeTime(child);
                    if (timeInfo) {
                        const block = timeBlocks.find(b => b.time === timeInfo.time);
                        if (block) {
                            // 只收集时间节点的子节点，并验证节点有效性
                            const children = timeInfo.node.getChildren();
                            if (children && children.length > 0) {
                                const validChildren = children.filter(node => this.validateNode(node));
                                block.nodes.push(...validChildren);
                            }
                        }
                    }
                });

                // 渲染时间块
                const content = timeBlocks
                    .filter(block => block.nodes.length > 0) // 只显示有子节点的时间块
                    .map(block => `
                        <div class="time-block">
                            <div class="time-label">${block.time}</div>
                            <div class="task-list">
                                ${block.nodes.map(node => Templates.taskItem(node, false, 'daily')).join('')}
                            </div>
                        </div>
                    `).join('');

                container.innerHTML = `
                    <div class="daily-tasks">
                        <div class="task-list">
                            ${content || '<div class="empty-state">暂无时间块任务</div>'}
                        </div>
                    </div>
                `;

                // 添加事件监听
                this.addTaskEventListeners(container);

            } catch (error) {
                console.error('Error rendering daily view:', error);
                container.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
            }
        },

        // 添加DailyPlanner特有的事件监听器
        addDailyPlannerEventListeners(container) {
            // 复制按钮事件
            container.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) {
                        console.error('Task ID not found');
                        showToast('复制失败：无法获取任务ID');
                        return;
                    }

                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) {
                            throw new Error('Task node not found');
                        }

                        const content = node.getNameInPlainText();
                        await navigator.clipboard.writeText(content);
                        showToast('已复制');

                    } catch (error) {
                        console.error('Error copying content:', error);
                        showToast('复制失败：' + error.message);
                    }
                });
            });
        },

        // 渲染 Target 视图
        async renderTargetView(container, config) {
            if (!config.target.work.enabled && !config.target.personal.enabled && !config.target.temp.enabled) {
                container.innerHTML = '<div class="empty-state">请先启用目标模式</div>';
                return;
            }

            try {
                const targetNodes = new Map();
                const processedIds = new Set();

                // 处理节点函数
                function processNode(node, config) {
                    const id = node.getId();
                    if (processedIds.has(id)) return;
                    processedIds.add(id);

                    const name = node.getNameInPlainText();
                    const note = node.getNoteInPlainText();
                    const tag = config.tag ? config.tag.replace(/^#/, '') : '01每日推进';

                    if (!name.includes('#index') && !note.includes('#index') &&
                        (name.includes(`#${tag}`) || note.includes(`#${tag}`))) {

                        const content = note.includes(`#${tag}`) ? note : name;
                        const hasMirrors = checkMirrorNodes(node);

                        targetNodes.set(id, {
                            id,
                            name: content,
                            displayName: note.includes(`#${tag}`) ? name : content,
                            time: node.getLastModifiedDate().getTime(),
                            completed: node.isCompleted(),
                            hasMirrors,
                            url: node.getUrl()
                        });
                    }

                    node.getChildren().forEach(child => processNode(child, config));
                }

                // 处理每个启用的目标节点
                if (config.target.work.enabled) {
                    const workNode = WF.getItemById(config.target.work.nodeId);
                    if (workNode) processNode(workNode, config.target.work);
                }

                if (config.target.personal.enabled) {
                    const personalNode = WF.getItemById(config.target.personal.nodeId);
                    if (personalNode) processNode(personalNode, config.target.personal);
                }

                if (config.target.temp.enabled) {
                    const tempNode = WF.getItemById(config.target.temp.nodeId);
                    if (tempNode) processNode(tempNode, config.target.temp);
                }

                // 渲染节点
                const content = Array.from(targetNodes.values())
                    .sort((a, b) => b.time - a.time)
                    .map(node => this.createTargetItem(node))
                    .join('');

                container.innerHTML = content || '<div class="empty-state">暂无目标内容</div>';
                this.addTaskEventListeners(container);

            } catch (error) {
                console.error('渲染目标视图失败:', error);
                container.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
            }
        },

        // 添加目标项模板
        createTargetItem(node) {
            const colors = getNodeColor(WF.getItemById(node.id));
            const colorStyle = colors ? `
                style="
                    --node-bg-color: ${colors.background};
                    --node-border-color: ${colors.border};
                    --node-text-color: ${colors.text};
                    --node-bg-color-hover: ${colors.hover.background};
                    --node-border-color-hover: ${colors.hover.border};
                    --actions-bg-hover: ${colors.hover.actions};
                "
            ` : '';

            return `
                <div class="task-item ${node.completed ? 'completed' : ''} 
                    ${node.hasMirrors ? 'has-mirrors' : ''} ${colors ? 'colored' : ''}"
                    data-id="${node.id}"
                    ${colorStyle}>
                    <div class="task-content">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" ${node.completed ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                        </label>
                        <div class="task-text">
                            <a href="${node.url}" class="task-link">${node.displayName}</a>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn copy" title="复制链接">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <button class="task-action-btn remove" title="移除">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        },

        // 渲染 Collector 视图
        async renderCollectorView(container, config) {
            if (!config.collector.enabled || !config.collector.nodeId) {
                container.innerHTML = '<div class="empty-state">请先配置收集箱节点</div>';
                return;
            }

            try {
                // 收集节点
                const collectedNodes = collectNodes(config);
                if (collectedNodes.size === 0) {
                    container.innerHTML = '<div class="empty-state">暂无待处理内容</div>';
                    return;
                }

                // 渲染节点
                const content = Array.from(collectedNodes.values())
                    .sort((a, b) => b.time - a.time) // 按修改时间排序
                    .map(node => {
                        return `
                            <div class="task-item ${node.completed ? 'completed' : ''}" 
                                data-id="${node.id}">
                                <div class="task-content">
                                    <label class="checkbox-wrapper">
                                        <input type="checkbox" ${node.completed ? 'checked' : ''}>
                                        <span class="checkbox-custom"></span>
                                    </label>
                                    <div class="task-text">
                                        <div class="content-wrapper">
                                            <div class="name-content">${node.name}</div>
                                            ${node.childrenContent ? `
                                                <div class="children-content">${node.childrenContent}</div>
                                            ` : ''}
                                        </div>
                                        <div class="meta-info">
                                            <span class="timestamp">
                                                ${new Date(node.time).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="task-actions">
                                    <button class="task-action-btn link" title="跳转到节点">
                                        <svg viewBox="0 0 24 24" width="14" height="14">
                                            <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                                        </svg>
                                    </button>
                                    <button class="task-action-btn remove" title="移除">
                                        <svg viewBox="0 0 24 24" width="14" height="14">
                                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('');

                container.innerHTML = `
                    <div class="collector-tasks">
                        <div class="task-list">
                            ${content}
                        </div>
                    </div>
                `;

                // 添加事件监听
                this.addCollectorEventListeners(container, config);

            } catch (error) {
                console.error('渲染收集器视图失败:', error);
                container.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
            }
        },

        // Collector特有的事件监听器
        addCollectorEventListeners(container, config) {
            // 卡片点击事件 - 复制内容
            container.querySelectorAll('.task-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    // 忽略按钮点击
                    if (e.target.closest('.task-actions')) return;
                    
                    const taskId = item.dataset.id;
                    if (!taskId) return;

                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) throw new Error('Task node not found');

                        // 处理内容并复制
                        const content = processCollectorContent(node);
                        await navigator.clipboard.writeText(content);
                        showToast('已复制');

                        // 自动完成处理
                        if (config.collector.autoComplete) {
                            await WF.completeItem(node);
                            item.classList.add('completed');
                            item.querySelector('input[type="checkbox"]').checked = true;
                        }
                    } catch (error) {
                        console.error('Error copying content:', error);
                        showToast('复制失败：' + error.message);
                    }
                });
            });

            // 链接按钮事件
            container.querySelectorAll('.task-action-btn.link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止冒泡到卡片
                    const taskId = e.target.closest('.task-item')?.dataset.id;
                    if (!taskId) return;

                    const node = WF.getItemById(taskId);
                    if (node) {
                        window.location.href = node.getUrl();
                    }
                });
            });

            // 移除按钮事件
            container.querySelectorAll('.task-action-btn.remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止冒泡到卡片
                    // ... 移除按钮的代码保持不变 ...
                });
            });
        },

        // 通用事件监听器
        addTaskEventListeners(container) {
            // 复选框事件
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    e.stopPropagation();
                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) return;

                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) throw new Error('Task node not found');

                        // 更新WorkFlowy状态
                        await WF.completeItem(node);
                        taskItem.classList.toggle('completed', e.target.checked);

                    } catch (error) {
                        console.error('更新状态失败:', error);
                        showToast('更新失败：' + error.message);
                        // 恢复复选框状态
                        e.target.checked = !e.target.checked;
                    }
                });
            });

            // 复制按钮事件
            container.querySelectorAll('.task-action-btn.copy').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const taskId = e.target.closest('.task-item')?.dataset.id;
                    if (!taskId) return;
    
                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) throw new Error('Task node not found');
    
                        // 获取完整URL
                        const url = node.getUrl();
                        const fullUrl = url.startsWith('http') ? url : `https://workflowy.com${url}`;
                        
                        await navigator.clipboard.writeText(fullUrl);
                        showFeedback(btn, '已复制链接');
                    } catch (error) {
                        console.error('复制链接失败:', error);
                        showFeedback(btn, '复制失败');
                    }
                });
            });

            // 移除按钮事件
            container.querySelectorAll('.task-action-btn.remove').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) return;

                    try {
                        // 存储移除记录
                        const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');
                        
                        if (!removedItems.includes(taskId)) {
                            removedItems.push(taskId);
                            localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(removedItems));
                        }

                        // 显示反馈并移除元素
                        showFeedback(taskItem, '已移除');
                        setTimeout(() => {
                            taskItem.style.opacity = '0';
                            setTimeout(() => taskItem.remove(), 300);
                        }, 700);

                    } catch (error) {
                        console.error('移除失败:', error);
                        showFeedback(taskItem, '移除失败');
                    }
                });
            });

            // 链接按钮事件
            container.querySelectorAll('.task-action-btn.link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = e.target.closest('.task-item')?.dataset.id;
                    if (!taskId) return;

                    const node = WF.getItemById(taskId);
                    if (node) {
                        WF.zoomTo(node);
                    }
                });
            });

            // 刷新按钮事件
            container.querySelector('.refresh-btn')?.addEventListener('click', () => {
                const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                switchMode(currentMode);
            });
        },

        // 获取节点数据
        async fetchNodeData(nodeId) {
            if (!nodeId) return null;

            try {
                // 确保WF对象存在
                if (typeof WF === 'undefined') {
                    console.error('WorkFlowy API not available');
                    return null;
                }

                const node = WF.getItemById(nodeId);
                if (!node) {
                    console.error('Node not found:', nodeId);
                    return null;
                }

                // 安全获取子节点
                const children = node.getChildren();
                if (!children || !Array.isArray(children)) {
                    console.error('Invalid children data for node:', nodeId);
                    return null;
                }

                return children.map(child => {
                    try {
                        return {
                            id: child.getId() || '',
                            name: child.getNameInPlainText() || '',
                            note: child.getNoteInPlainText() || '',
                            completed: child.isCompleted()
                        };
                    } catch (error) {
                        console.error('Error processing child node:', error);
                        return null;
                    }
                }).filter(Boolean); // 过滤掉null值

            } catch (error) {
                console.error('Error fetching node data:', error);
                return null;
            }
        },

        // 过滤排除的标签
        filterExcludedTags(nodes, excludeTags) {
            if (!excludeTags || !nodes) return nodes;

            const tags = excludeTags.split(',').map(t => t.trim());
            return nodes.filter(node =>
                !tags.some(tag =>
                    node.name.includes(tag) || node.note.includes(tag)
                )
            );
        },

        // 验证节点是否有效
        validateNode(node) {
            try {
                // 检查节点是否存在
                if (!node) return false;
                // 尝试访问节点属性，如果节点无效会抛出异常
                node.getId();
                node.getNameInPlainText();
                return true;
            } catch (error) {
                console.error('节点验证失败:', error);
                return false;
            }
        },

        // 添加复制内容函数
        async copyNodeContent(node) {
            try {
                let contentToCopy = '';

                if (this.isUrlNode(node)) {
                    // 获取原始HTML内容
                    const htmlContent = node.getName();

                    if (htmlContent.includes('<a href=')) {
                        // 已经是链接格式
                        contentToCopy = htmlContent;
                    } else {
                        // 构造链接
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
                    // 非URL节点使用原始HTML
                    contentToCopy = node.getName();
                }

                // 创建临时元素
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.innerHTML = contentToCopy;
                document.body.appendChild(tempDiv);

                // 选择内容
                const range = document.createRange();
                range.selectNodeContents(tempDiv);

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);

                // 执行复制
                const success = document.execCommand('copy');

                // 清理
                selection.removeAllRanges();
                document.body.removeChild(tempDiv);

                return success;

            } catch (error) {
                console.error('复制内容失败:', error);
                return false;
            }
        },

        // 添加URL节点检查函数
        isUrlNode(node) {
            const htmlContent = node.getName();
            const plainText = node.getNameInPlainText();

            return htmlContent.includes('<a href=') ||
                   /https?:\/\/[^\s]+/.test(plainText);
        }
    }


    // 初始化// 启动代码
    function waitForWF() {
        if (typeof WF !== 'undefined') {
            console.log('WorkFlowy API 加载完成');
            try {
                // 初始化面板
                initPanel();

                // 启动定时刷新
                setInterval(() => {
                    try {
                        const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                        const contentEl = document.getElementById(`${currentMode}-content`);
                        if (contentEl) {
                            const config = ConfigManager.getConfig();
                            switch (currentMode) {
                                case 'daily':
                                    ViewRenderer.renderDailyView(contentEl, config);
                                    break;
                                case 'target':
                                    ViewRenderer.renderTargetView(contentEl, config);
                                    break;
                                case 'collector':
                                    ViewRenderer.renderCollectorView(contentEl, config);
                                    break;
                            }
                        }
                    } catch (error) {
                        console.error('刷新内容时发生错:', error);
                        showToast('刷新失败，请重试');
                    }
                }, ConfigManager.getConfig().refreshInterval || 60000);

                // 初始化主题
                initTheme();

                // 恢复上次的模式
                const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
                switchMode(savedMode);

            } catch (error) {
                console.error('初始化失败:', error);
                showToast('初始化失败，请刷新页面重试');
            }
        } else {
            console.log('等待 WorkFlowy API...');
            setTimeout(waitForWF, 100);
        }
    }

    console.log('WorkFlowy Forwarder Plus Framework 启动...');
    waitForWF();

    // 添加递归获取节点函数
    function getAllDescendants(node, maxDepth = 10, currentDepth = 0) {
        if (!node || currentDepth >= maxDepth) return [];

        let descendants = [];
        try {
            const children = node.getChildren();
            if (!children || !Array.isArray(children)) return [];

            // 添加直接子节点
            descendants.push(...children);

            // 递归获取每个子节点的后代
            for (const child of children) {
                descendants.push(...getAllDescendants(child, maxDepth, currentDepth + 1));
            }
        } catch (error) {
            console.error('获取节点后代失败:', error);
        }

        return descendants;
    }

    // 添加配置面板初始化函数
    function initConfigPanel() {
        const configTrigger = panel.querySelector('.config-trigger-btn');
        const configPanel = panel.querySelector('.config-panel');
        const configClose = panel.querySelector('.config-panel-close');
        const saveBtn = panel.querySelector('.config-save');
        const resetBtn = panel.querySelector('.config-reset');
        const themeToggle = panel.querySelector('.theme-toggle');

        // 置面板显示/隐藏
        configTrigger.addEventListener('click', () => {
            configPanel.classList.add('visible');
        });

        configClose.addEventListener('click', () => {
            configPanel.classList.remove('visible');
        });

        // 保存按钮事件处理
        saveBtn.addEventListener('click', () => {
            try {
                const config = ConfigManager.getConfig(); // 获取当前配置

                // 收集表单数据
                const formData = {
                    dailyPlanner: {
                        enabled: document.getElementById('enable-daily').checked,
                        nodeId: document.getElementById('node-daily').value.trim(),
                        taskName: document.getElementById('task-daily').value.trim(),
                        calendarNodeId: document.getElementById('calendar-node-daily').value.trim() || '35a73627730b'
                    },
                    target: {
                        work: {
                            enabled: document.getElementById('enable-work').checked,
                            nodeId: document.getElementById('node-work').value.trim(),
                            taskName: document.getElementById('task-work').value.trim(),
                            tag: document.getElementById('tag-work').value.trim()
                        },
                        personal: {
                            enabled: document.getElementById('enable-personal').checked,
                            nodeId: document.getElementById('node-personal').value.trim(),
                            taskName: document.getElementById('task-personal').value.trim(),
                            tag: document.getElementById('tag-personal').value.trim()
                        },
                        temp: {
                            enabled: document.getElementById('enable-temp').checked,
                            nodeId: document.getElementById('node-temp').value.trim(),
                            taskName: document.getElementById('task-temp').value.trim(),
                            tag: document.getElementById('tag-temp').value.trim()
                        }
                    },
                    collector: {
                        enabled: document.getElementById('enable-collector').checked,
                        nodeId: document.getElementById('node-collector').value.trim(),
                        taskName: document.getElementById('task-collector').value.trim(),
                        tags: document.getElementById('tag-collector').value.trim(),
                        autoComplete: document.getElementById('auto-complete-collector').checked,
                        copyFormat: document.getElementById('copy-format-collector').value
                    },
                    refreshInterval: parseInt(document.getElementById('refresh-interval').value) || 60000,
                    excludeTags: document.getElementById('exclude-tags').value.trim(),
                    theme: config.theme // 保持主题设置不变
                };

                // 验证配置
                const errors = ConfigManager.validateConfig(formData);
                if (errors.length > 0) {
                    showToast('保存失败：' + errors[0]);
                    console.error('配置验证失败:', errors);
                    return;
                }

                // 保存配置
                if (ConfigManager.saveConfig(formData)) {
                    showToast('配置已保存');
                    // 更新模式按钮
                    updateModeButtons();
                    // 更新输入框状态
                    loadConfig();
                    // 刷新当前视图
                    const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                    switchMode(currentMode);
                    // 更新链接
                    updateLinks(currentMode);
                } else {
                    showToast('保存失败，请重试');
                }
            } catch (error) {
                console.error('保存配置时发生错误:', error);
                showToast('保存失败：' + error.message);
            }
        });

        // 重置按钮事处理
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？')) {
                if (ConfigManager.resetConfig()) {
                    loadConfig();
                    showToast('配置已重置');
                    // 更新当前视图
                    const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                    switchMode(currentMode);
                    updateLinks(currentMode);
                } else {
                    showToast('重置失败');
                }
            }
        });

        // 主题切换
        themeToggle.addEventListener('click', toggleTheme);

        // 为所有模式的复选框添加事件监听
        ['enable-daily', 'enable-work', 'enable-personal', 'enable-temp', 'enable-collector']
            .forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', function() {
                        handleModeSelection(this);
                    });
                }
            });

        // 加载配置
        loadConfig();
    }

    // 改进日期节点处理
    function findDateNode(targetDate) {
        const config = ConfigManager.getConfig();
        const calendarNodeId = config.dailyPlanner.calendarNodeId;
    
        if (!calendarNodeId) {
            throw new Error('未配置日历节点ID');
        }
    
        const parser = new DOMParser();
    
        // Optimized timestamp getter
        function getMsFromItemName(item) {
            const name = item.getName();
            if (!name.includes('<time')) return null;
    
            const time = parser.parseFromString(name, 'text/html').querySelector("time");
            if (!time) return null;
    
            const ta = time.attributes;
            if (!ta || !ta.startyear || ta.starthour || ta.endyear) return null;
    
            return Date.parse(`${ta.startyear.value}/${ta.startmonth.value}/${ta.startday.value}`);
        }
    
        // Optimized search with year pre-check
        function findFirstMatchingItem(targetTimestamp, parent) {
            const name = parent.getName();
            const currentYear = new Date(targetTimestamp).getFullYear();
            if (name.includes('Plan of') && !name.includes(currentYear.toString())) {
                return null;
            }
    
            const nodeTimestamp = getMsFromItemName(parent);
            if (nodeTimestamp === targetTimestamp) return parent;
    
            for (let child of parent.getChildren()) {
                const match = findFirstMatchingItem(targetTimestamp, child);
                if (match) return match;
            }
    
            return null;
        }
    
        // Cache handling
        const todayKey = targetDate.toDateString();
        const cachedNode = sessionStorage.getItem(todayKey);
    
        if (cachedNode) {
            try {
                const node = WF.getItemById(cachedNode);
                if (node) return node;
            } catch (e) {
                sessionStorage.removeItem(todayKey);
            }
        }
    
        // Get calendar root node
        const calendarNode = WF.getItemById(calendarNodeId);
        if (!calendarNode) {
            throw new Error('未找到日历节点');
        }
    
        const todayTimestamp = targetDate.setHours(0,0,0,0);
        const found = findFirstMatchingItem(todayTimestamp, calendarNode);
    
        if (found) {
            sessionStorage.setItem(todayKey, found.getId());
            return found;
        }
    
        return null;
    }

    // 添加clearAllReminders函数
    function clearAllReminders(mode) {
        try {
            // 清除指定模式的所有移除记录
            localStorage.removeItem(`workflowy_removed_${mode}`);
            
            // 刷新当前视图
            const contentEl = document.getElementById(`${mode}-content`);
            if (contentEl) {
                const config = ConfigManager.getConfig();
                switch (mode) {
                    case 'daily':
                        ViewRenderer.renderDailyView(contentEl, config);
                        break;
                    case 'target':
                        ViewRenderer.renderTargetView(contentEl, config);
                        break;
                    case 'collector':
                        ViewRenderer.renderCollectorView(contentEl, config);
                        break;
                }
            }
        } catch (error) {
            console.error('清除失败:', error);
            showToast('清除失败，请重试');
        }
    }

    // 添加内容处理函数
    function processCollectorContent(node) {
        try {
            const name = node.getName();
            const plainName = node.getNameInPlainText();
            const children = node.getChildren();

            // 单节点处理
            if (children.length === 0) {
                // 检查日期时间格式
                const dateTimeMatch = plainName.match(/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}\s+\|\s+(.+)$/);
                if (dateTimeMatch) {
                    const content = dateTimeMatch[1].trim();
                    // 检查是否是纯URL
                    if (/^https?:\/\/[^\s#]+$/.test(content)) {
                        return content;
                    }
                    return content;
                }

                // 检查HTML链接
                if (name.includes('<a href=')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = name;
                    const anchor = tempDiv.querySelector('a');
                    if (anchor) {
                        const title = anchor.textContent;
                        const url = anchor.href;
                        return createOPML(title, url);
                    }
                }

                // 检查纯URL
                if (/^https?:\/\/[^\s#]+$/.test(plainName)) {
                    return plainName;
                }

                return plainName;
            }

            // 多节点处理
            const firstChild = children[0];
            const isFirstChildSameAsParent = firstChild.getNameInPlainText() === plainName;
            const relevantChildren = isFirstChildSameAsParent ? children.slice(1) : children;

            // 检查标题和链接格式
            const titleNode = relevantChildren.find(child => 
                child.getNameInPlainText().startsWith('标题：'));
            const linkNode = relevantChildren.find(child => 
                child.getNameInPlainText().startsWith('链接：'));

            if (titleNode && linkNode) {
                const title = titleNode.getNameInPlainText().replace(/^标题[：:]\s*/, '').trim();
                const url = linkNode.getNameInPlainText().replace(/^链接[：:]\s*/, '').trim();
                return createOPML(title, url);
            }

            // 处理带缩进的内容
            let formattedContent = plainName.replace(/#稍后处理/g, '').trim();
            
            // 处理子节点内容
            const processChildren = (nodes, level = 1) => {
                return nodes.map(child => {
                    const content = child.getNameInPlainText()
                        .replace(/#稍后处理/g, '')
                        .trim();
                    
                    if (!content) return '';

                    const indent = '  '.repeat(level);
                    const childContent = `${indent}- ${content}`;

                    // 递归处理子节点
                    const grandChildren = child.getChildren();
                    if (grandChildren.length > 0) {
                        const nestedContent = processChildren(grandChildren, level + 1);
                        return nestedContent ? `${childContent}\n${nestedContent}` : childContent;
                    }

                    return childContent;
                }).filter(line => line.trim()).join('\n');
            };

            const childrenContent = processChildren(relevantChildren);
            if (childrenContent) {
                formattedContent += '\n' + childrenContent;
            }

            return formattedContent;

        } catch (error) {
            console.error('处理收集器内容失败:', error);
            return node.getNameInPlainText();
        }
    }

    // 创建OPML格式内容
    function createOPML(title, url) {
        return `<?xml version="1.0"?>
<opml version="2.0">
    <head>
        <title>${title}</title>
    </head>
    <body>
        <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
    </body>
</opml>`;
    }

    // 添加收集器节点处理函数
    function collectNodes(config) {
        const collectedNodes = new Map();
        const processedNodes = new Set();

        // 检查节点是否为空
        function isEmptyNode(node) {
            const name = node.getNameInPlainText();
            // 移除日期时间格式
            const nameWithoutDateTime = name.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/, '');
            // 移除标签
            const nameWithoutTags = nameWithoutDateTime.replace(/#[^\s#]+/g, '');
            // 检查是否还有其他内容
            return nameWithoutTags.trim() === '' && node.getChildren().length === 0;
        }

        // 递归搜索节点
        function searchNodes(node) {
            if (!node || processedNodes.has(node.getId())) return;

            const nodeId = node.getId();
            const nodeName = node.getNameInPlainText();

            // 检查标签
            if (nodeName.includes('#稍后处理') && !isEmptyNode(node)) {
                // 标记节点及其子节点为已处理
                processedNodes.add(nodeId);
                node.getChildren().forEach(child => {
                    processedNodes.add(child.getId());
                });

                // 收集子节点内容
                let childrenContent = '';
                const children = node.getChildren();
                if (children.length > 0) {
                    children.forEach(child => {
                        const childName = child.getNameInPlainText()
                            .replace(/#稍后处理/g, '').trim();
                        const childNote = child.getNoteInPlainText();

                        childrenContent += `- ${childName}\n`;
                        if (childNote) {
                            childrenContent += `  ${childNote}\n`;
                        }
                    });
                }

                // 保存节点信息
                collectedNodes.set(nodeId, {
                    id: nodeId,
                    name: nodeName.replace(/#稍后处理/g, '').trim(),
                    childrenContent: childrenContent.trim(),
                    time: node.getLastModifiedDate().getTime(),
                    completed: node.isCompleted(),
                    url: node.getUrl()
                });
            } else {
                // 继续搜索子节点
                node.getChildren().forEach(child => {
                    if (!processedNodes.has(child.getId())) {
                        searchNodes(child);
                    }
                });
            }
        }

        // 开始收集
        try {
            const collectorNode = WF.getItemById(config.collector.nodeId);
            if (collectorNode) {
                searchNodes(collectorNode);
            }
        } catch (error) {
            console.error('收集节点失败:', error);
        }

        return collectedNodes;
    }

    // 添加创建卡片项函数
    function createTaskItem(node, mode) {
        try {
            if (!node) return '';

            const isCompleted = node.isCompleted();
            const hasMirrors = checkMirrorNodes(node);
            const colors = getNodeColor(node);
            
            // 构建颜色样式
            const colorStyle = colors ? `
                style="
                    --node-bg-color: ${colors.background};
                    --node-border-color: ${colors.border};
                    --node-text-color: ${colors.text};
                    --node-bg-color-hover: ${colors.hover.background};
                    --node-border-color-hover: ${colors.hover.border};
                    --actions-bg-hover: ${colors.hover.actions};
                "
            ` : '';

            // 收集模式特殊处理
            if (mode === 'collector') {
                const name = node.getNameInPlainText().replace(/#稍后处理/g, '').trim();
                const children = node.getChildren();
                let childrenContent = '';

                if (children.length > 0) {
                    childrenContent = children.map(child => {
                        const childName = child.getNameInPlainText()
                            .replace(/#稍后处理/g, '')
                            .trim();
                        const childNote = child.getNoteInPlainText();
                        let content = `- ${childName}`;
                        if (childNote) {
                            content += `\n  ${childNote}`;
                        }
                        return content;
                    }).join('\n');
                }

                return `
                    <div class="task-item collect-mode ${isCompleted ? 'completed' : ''} 
                        ${hasMirrors ? 'has-mirrors' : ''} ${colors ? 'colored' : ''}"
                        data-id="${node.getId()}"
                        ${colorStyle}>
                        ${name ? `<div class="parent-title">${name}</div>` : ''}
                        <div class="task-content">
                            <label class="checkbox-wrapper">
                                <input type="checkbox" ${isCompleted ? 'checked' : ''}>
                                <span class="checkbox-custom"></span>
                            </label>
                            <div class="task-text">
                                ${childrenContent ? 
                                    `<div class="children-content">${childrenContent}</div>` :
                                    `<div class="single-content">${name}</div>`
                                }
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="task-action-btn link" title="跳转到节点">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                                </svg>
                            </button>
                            <button class="task-action-btn remove" title="移除">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            }

            // 其他模式的处理保持不变...
        } catch (error) {
            console.error('创建卡片失败:', error);
            return '';
        }
    }

    // 添加操作反馈函数
    function showFeedback(element, message) {
        const taskItem = element.closest('.task-item');
        const feedback = document.createElement('div');
        feedback.className = 'action-feedback';
        feedback.textContent = message;
        taskItem.appendChild(feedback);
        
        // 添加动画类
        requestAnimationFrame(() => {
            feedback.classList.add('show');
            setTimeout(() => {
                feedback.classList.remove('show');
                setTimeout(() => feedback.remove(), 300);
            }, 1000);
        });
    }

   
    

    // 添加反馈样式
    GM_addStyle(`
        /* 操作反馈样式 */
        .action-feedback {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            z-index: 1000;
        }

        .action-feedback.show {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    `);

    // 更新Today's Plan功能
    function initTodayPlan() {
        const todayLink = document.querySelector('.today-link');
        if (!todayLink) return;
    
        todayLink.addEventListener('click', async (e) => {
            e.preventDefault();
    
            try {
                const today = new Date();
                const node = findDateNode(today);
                
                if (node) {
                    WF.zoomTo(node);
                } else {
                    showToast('未找到今天的日期节点');
                }
            } catch (error) {
                console.error('导航到今天失败:', error);
                showToast('导航失败: ' + error.message);
            }
        });
    }

    // 添加递归获取节点函数
    function getAllDescendants(node, maxDepth = 10, currentDepth = 0) {
        if (!node || currentDepth >= maxDepth) return [];

        let descendants = [];
        try {
            const children = node.getChildren();
            if (!children || !Array.isArray(children)) return [];

            // 添加直接子节点
            descendants.push(...children);

            // 递归获取每个子节点的后代
            for (const child of children) {
                descendants.push(...getAllDescendants(child, maxDepth, currentDepth + 1));
            }
        } catch (error) {
            console.error('获��节点后代失败:', error);
        }

        return descendants;
    }
})();
