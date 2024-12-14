// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.9
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
        version: '0.0.6',
        theme: 'dark',
        refreshInterval: 60000,
        excludeTags: '',
        dailyPlanner: {
            enabled: false,
            taskName: '',
            nodeId: ''
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
        /* 面板基础样式 */
        .wf-panel {
            position: fixed;
            right: -320px;
            top: 46px;
            height: calc(100vh - 46px);
            width: 320px;
            background: var(--bg-color, #2B3135);
            border-left: 1px solid var(--border-color, #5c6062);
            z-index: 100;
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .wf-panel.visible {
            transform: translateX(-320px);
        }

        .wf-panel.visible ~ #content {
            padding-right: 320px;
        }

        #content {
            transition: padding-right 0.3s ease;
        }

        /* 切换按钮样式 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: var(--bg-color, #2B3135);
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
        }

        .wf-toggle:hover {
            background: var(--hover-bg, #363b3f);
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: var(--text-secondary, #9EA1A2);
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

        /* 模式切换按钮组样式 */
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

        /* 自定义复选框样式 */
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
    `);

    // 面板切换函数
    function togglePanel() {
        const panel = document.querySelector('.wf-panel');
        const toggleBtn = document.querySelector('.wf-toggle');
        const content = document.getElementById('content');

        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
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

    function handleKeyPress(event) {
        if (event.ctrlKey && event.key === '/') {
            setTimeout(() => {
                togglePanel();
            }, 50);
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
                        DailyPlanner
                    </a>
                </div>
                <div class="follow-links-wrapper">
                    <a href="#" class="planner-link follow-link">
                        ForwardLogs
                    </a>
                    <a href="#" class="planner-link follow-link">
                        Working
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
                    设置
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
                                    <input type="text" id="tag-personal" placeholder="输入��签，如: #01每日推进 (支持数字、中文、英文)">
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
                        display: true,
                        href: '#'
                    },
                    {
                        selector: '.scan-link',
                        display: true,
                        href: `https://workflowy.com/#/${config.dailyPlanner.nodeId}`
                    }
                ],
                target: [
                    {
                        selector: '.follow-link:nth-child(1)',
                        display: true,
                        href: `https://workflowy.com/#/${config.target.work.nodeId}`
                    },
                    {
                        selector: '.follow-link:nth-child(2)',
                        display: true,
                        href: `https://workflowy.com/#/${config.target.personal.nodeId}`
                    }
                ],
                collector: [
                    {
                        selector: '.collect-link',
                        display: true,
                        href: `https://workflowy.com/#/${config.collector.nodeId}`
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

    // 更新Templates对象,添加remove图标
    const Templates = {
        // SVG图标
        icons: {
            refresh: `<svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>`,
            copy: `<svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>`,
            remove: `<svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>`
        },
    
        // 任务项模板
        taskItem: (child, showCopy = true) => {
            const hasMirrors = checkMirrorNodes(child);
            return `
                <div class="task-item ${child.isCompleted() ? 'completed' : ''} ${hasMirrors ? 'has-mirrors' : ''}" 
                    data-id="${child.getId()}">
                    <div class="task-content">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" ${child.isCompleted() ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                        </label>
                        <div class="task-text">
                            <span class="task-name">${child.getNameInPlainText()}</span>
                            ${child.getNoteInPlainText() ? `
                                <span class="task-note">${child.getNoteInPlainText()}</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="reminder-actions">
                        ${showCopy ? `
                            <button class="reminder-action-btn copy" title="复制">
                                ${Templates.icons.copy}
                            </button>
                        ` : ''}
                        <button class="reminder-action-btn remove" title="移除">
                            ${Templates.icons.remove} 
                        </button>
                    </div>
                </div>
            `;
        },
    
        // 标题栏模板
        header: (title, showRefresh = true) => `
            <div class="task-header">
                <h3>${title}</h3>
                ${showRefresh ? `
                    <div class="header-actions">
                        <button class="refresh-btn" title="刷新">
                            ${Templates.icons.refresh}
                        </button>
                    </div>
                ` : ''}
            </div>
        `
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
    
                // 使用递归函数获取所有层级的节点
                const allNodes = getAllDescendants(node);
                if (!allNodes || allNodes.length === 0) {
                    container.innerHTML = '<div class="empty-state">暂无任务<br>在目标节点添加任务后刷新</div>';
                    return;
                }
    
                // Filter excluded tags
                const filteredNodes = allNodes.filter(child => {
                    if (!config.excludeTags) return true;
                    const tags = config.excludeTags.split(',').map(t => t.trim());
                    const name = child.getNameInPlainText();
                    const note = child.getNoteInPlainText();
                    return !tags.some(tag => {
                        const tagWithoutHash = tag.replace(/^#/, '');
                        return name.includes(`#${tagWithoutHash}`) || 
                               name.includes(tagWithoutHash) ||
                               note.includes(`#${tagWithoutHash}`) ||
                               note.includes(tagWithoutHash);
                    });
                });
    
                container.innerHTML = `
                    <div class="daily-tasks">
                        ${Templates.header(config.dailyPlanner.taskName || '日常计划')}
                        <div class="task-list">
                            ${filteredNodes.map(child => Templates.taskItem(child)).join('')}
                        </div>
                    </div>
                `;
    
                // 添加事件监听
                this.addTaskEventListeners(container);
                this.addDailyPlannerEventListeners(container);
                
            } catch (error) {
                console.error('Error rendering daily view:', error);
                container.innerHTML = '<div class="error-state">加载失败，请刷新��试</div>';
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
            const targetTypes = ['work', 'personal', 'temp'];
            const enabledTargets = targetTypes.filter(type => config.target[type].enabled);
            
            if (enabledTargets.length === 0) {
                container.innerHTML = '<div class="empty-state">请先启用目标追踪模式</div>';
                return;
            }
            
            container.innerHTML = '<div class="loading">加载中...</div>';
            
            try {
                const targetContent = [];
                
                for (const type of enabledTargets) {
                    // 支持多节点ID
                    const nodeIds = (config.target[type].nodeId || '').split(',')
                        .map(id => id.trim())
                        .filter(Boolean);
                        
                    if (nodeIds.length === 0) continue;
                    
                    const allNodes = [];
                    
                    // 获取所有节点的数据(包括子节点)
                    for (const nodeId of nodeIds) {
                        const node = WF.getItemById(nodeId);
                        if (!node) {
                            console.warn(`Node not found: ${nodeId}`);
                            continue;
                        }
                        
                        // 使用递归函数获取所有层级的节点
                        const descendants = getAllDescendants(node);
                        if (descendants.length > 0) {
                            allNodes.push(...descendants);
                        }
                    }
                    
                    if (allNodes.length === 0) continue;
                    
                    // 过滤和排序节点
                    const filteredNodes = allNodes.filter(child => {
                        // 全局排除标签
                        if (config.excludeTags) {
                            const excludeTags = config.excludeTags.split(',').map(t => t.trim());
                            const name = child.getNameInPlainText();
                            const note = child.getNoteInPlainText();
                            if (excludeTags.some(tag => {
                                const tagWithoutHash = tag.replace(/^#/, '');
                                return name.includes(`#${tagWithoutHash}`) || 
                                       name.includes(tagWithoutHash) ||
                                       note.includes(`#${tagWithoutHash}`) ||
                                       note.includes(tagWithoutHash);
                            })) {
                                return false;
                            }
                        }
                        
                        // 目标特定标签
                        if (config.target[type].tag) {
                            const tags = config.target[type].tag.split(',').map(t => t.trim());
                            const name = child.getNameInPlainText();
                            const note = child.getNoteInPlainText();
                            return tags.some(tag => {
                                const tagWithoutHash = tag.replace(/^#/, '');
                                return name.includes(`#${tagWithoutHash}`) || 
                                       name.includes(tagWithoutHash) ||
                                       note.includes(`#${tagWithoutHash}`) ||
                                       note.includes(tagWithoutHash);
                            });
                        }
                        
                        return true;
                    });

                    if (filteredNodes.length === 0) continue;

                    // 排序节点
                    const sortedNodes = filteredNodes.sort((a, b) => {
                        const aContent = extractReminderContent(a.getNameInPlainText());
                        const bContent = extractReminderContent(b.getNameInPlainText());
                        return aContent.localeCompare(bContent);
                    });
                    
                    targetContent.push(`
                        <div class="target-section">
                            ${Templates.header(config.target[type].taskName || type)}
                            <div class="task-list">
                                ${sortedNodes.map(child => Templates.taskItem(child)).join('')}
                            </div>
                        </div>
                    `);
                }
                
                if (targetContent.length === 0) {
                    container.innerHTML = '<div class="empty-state">暂无数据</div>';
                    return;
                }
                
                container.innerHTML = `
                    <div class="target-tasks">
                        ${targetContent.join('')}
                    </div>
                `;
                
                // 添加事件监听
                this.addTaskEventListeners(container);
                
            } catch (error) {
                console.error('Error rendering target view:', error);
                container.innerHTML = '<div class="error-state">加载��败，请刷新重试</div>';
            }
        },

        // 渲染 Collector 视图
        async renderCollectorView(container, config) {
            if (!config.collector.enabled) {
                container.innerHTML = '<div class="empty-state">请先启用收集器模式</div>';
                return;
            }
            
            container.innerHTML = '<div class="loading">加载中...</div>';
            
            try {
                const node = WF.getItemById(config.collector.nodeId);
                if (!node) {
                    container.innerHTML = '<div class="error-state">节点不存在或无法访问</div>';
                    return;
                }

                // 使用递归函数获取所有层级的节点
                const allNodes = getAllDescendants(node);
                if (!allNodes || allNodes.length === 0) {
                    container.innerHTML = '<div class="empty-state">暂无收集的内容</div>';
                    return;
                }

                // Filter tags
                const filteredNodes = allNodes.filter(child => {
                    // Global exclude tags
                    if (config.excludeTags) {
                        const excludeTags = config.excludeTags.split(',').map(t => t.trim());
                        const name = child.getNameInPlainText();
                        const note = child.getNoteInPlainText();
                        if (excludeTags.some(tag => {
                            const tagWithoutHash = tag.replace(/^#/, '');
                            return name.includes(`#${tagWithoutHash}`) || 
                                   name.includes(tagWithoutHash) ||
                                   note.includes(`#${tagWithoutHash}`) ||
                                   note.includes(tagWithoutHash);
                        })) {
                            return false;
                        }
                    }
                    
                    // Collector specific tags
                    if (config.collector.tags) {
                        const tags = config.collector.tags.split(',').map(t => t.trim());
                        const name = child.getNameInPlainText();
                        const note = child.getNoteInPlainText();
                        return tags.some(tag => {
                            const tagWithoutHash = tag.replace(/^#/, '');
                            return name.includes(`#${tagWithoutHash}`) || 
                                   name.includes(tagWithoutHash) ||
                                   note.includes(`#${tagWithoutHash}`) ||
                                   note.includes(tagWithoutHash);
                        });
                    }
                    
                    return true;
                });

                container.innerHTML = `
                    <div class="collector-tasks">
                        ${Templates.header(config.collector.taskName || '收集箱')}
                        <div class="task-list">
                            ${filteredNodes.map(child => Templates.taskItem(child, true)).join('')}
                        </div>
                    </div>
                `;

                // 添加事件监听
                this.addTaskEventListeners(container);
                this.addCollectorEventListeners(container, config);
                
            } catch (error) {
                console.error('Error rendering collector view:', error);
                container.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
            }
        },

        // Collector特有的事件监听器
        addCollectorEventListeners(container, config) {
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

                        if (config.collector.autoComplete) {
                            await WF.completeItem(node);
                            taskItem.classList.add('completed');
                            taskItem.querySelector('input[type="checkbox"]').checked = true;
                        }
                    } catch (error) {
                        console.error('Error copying content:', error);
                        showToast('复制失败：' + error.message);
                    }
                });
            });
        },

        // 通用事件监听器
        addTaskEventListeners(container) {
            container.querySelectorAll('.task-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const taskId = e.target.closest('.task-item')?.dataset.id;
                    if (!taskId) {
                        console.error('Task ID not found');
                        showToast('更新失败：无法获取任务ID');
                        return;
                    }
        
                    try {
                        if (typeof WF === 'undefined') {
                            throw new Error('WorkFlowy API not available');
                        }
        
                        const node = WF.getItemById(taskId);
                        if (!node) {
                            throw new Error('Task node not found');
                        }
        
                        // 使用 completeItem 来切换完成状态
                        await WF.completeItem(node);
                        e.target.closest('.task-item').classList.toggle('completed', node.isCompleted());
                        
                    } catch (error) {
                        console.error('Error updating task status:', error);
                        showToast('更新任务状态失败：' + error.message);
                        // 恢复复选框状态
                        e.target.checked = !e.target.checked;
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
                        console.error('刷新内容时发生错误:', error);
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

        // 配置面板显示/隐藏
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
                        taskName: document.getElementById('task-daily').value.trim()
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

        // 重置按钮事件处理
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
})();
