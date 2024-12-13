// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.8
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

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

        // 验证配置项
        validateConfig(config) {
            const errors = [];

            // 验证节点ID (支持单个或多个，用逗号分隔)
            const validateNodeId = (id, name) => {
                if (!id) return;
                const ids = id.split(',').map(i => i.trim());
                for (const singleId of ids) {
                    if (singleId && !/^[0-9a-f]{12}$/.test(singleId)) {
                        errors.push(`${name}的节点ID "${singleId}" 格式不正确`);
                    }
                }
            };

            // 验证标签 (支持单个或多个，用逗号分隔)
            const validateTags = (tags, name) => {
                if (!tags) return;
                const tagList = tags.split(',').map(t => t.trim());
                for (const tag of tagList) {
                    // 更新正则表达式以支持中文字符和数字
                    // ^ - 开始
                    // #? - 可选的#号
                    // [0-9\u4e00-\u9fa5a-zA-Z\s_]+ - 支持数字、中文、英文、空格和下划线
                    // $ - 结束
                    if (tag && !/^#?[0-9\u4e00-\u9fa5a-zA-Z\s_]+$/.test(tag)) {
                        errors.push(`${name}的标签 "${tag}" 格式不正确，标签只能包含数字、中文、英文、空格和下划线`);
                    }
                }
            };

            // 验证 DailyPlanner
            if (config.dailyPlanner.enabled) {
                validateNodeId(config.dailyPlanner.nodeId, 'DailyPlanner');
                validateTags(config.dailyPlanner.tag, 'DailyPlanner');
            }

            // 验证 Target
            Object.entries(config.target).forEach(([key, value]) => {
                if (value.enabled) {
                    validateNodeId(value.nodeId, `Target-${key}`);
                    validateTags(value.tag, `Target-${key}`);
                }
            });

            // 验证 Collector
            if (config.collector.enabled) {
                validateNodeId(config.collector.nodeId, 'Collector');
                validateTags(config.collector.tags, 'Collector');
            }

            // 验证排除标签
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
            padding: 20px;
            text-align: center;
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
            border-radius: 4px;
            margin: 12px;
            font-size: 14px;
        }
    `);

    // 面板切换函数
    function togglePanel() {
        const panel = document.querySelector('.wf-panel');
        const toggleBtn = document.querySelector('.wf-toggle');
        
        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
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

    // 创建提示框元素
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

    function initPanel() {
        const panel = document.createElement('div');
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
    
            <!-- Mode content containers -->
            <div class="mode-contents">
                <div class="mode-content" id="daily-content"></div>
                <div class="mode-content" id="target-content"></div>
                <div class="mode-content" id="collector-content"></div>
            </div>

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

            <!-- 配置按钮 -->
            <div class="config-trigger">
                <button class="config-trigger-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.5 1L7.5 0H8.5L9.5 1L10.5 1.5L11.5 1L12.5 1.5L13 2.5L14 3.5L14.5 4.5L15 5.5V6.5L14 7.5V8.5L15 9.5V10.5L14.5 11.5L14 12.5L13 13.5L12.5 14.5L11.5 15L10.5 14.5L9.5 15H8.5L7.5 16H6.5L5.5 15L4.5 14.5L3.5 15L2.5 14.5L2 13.5L1 12.5L0.5 11.5L0 10.5V9.5L1 8.5V7.5L0 6.5V5.5L0.5 4.5L1 3.5L2 2.5L2.5 1.5L3.5 1L4.5 1.5L5.5 1H6.5Z" fill="currentColor"/>
                        <circle cx="8" cy="8" r="2" fill="var(--bg-color)"/>
                    </svg>
                    设置
                </button>
            </div>

            <!-- 配置面板 -->
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
                                    <input type="text" id="node-work" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-work" 
                                        placeholder="输入标签，如: #01每日推进 (支持数字、中文、英文)">
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

        // 统一的模式切换处理
        function initModeSwitching() {
            const modeButtons = panel.querySelectorAll('.mode-btn');
            
            // 只绑定一次事件监听器
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
                });
            });
            
            // 恢复上次选择的模式
            const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
            const savedModeBtn = panel.querySelector(`#mode-${savedMode}`);
            if (savedModeBtn) {
                savedModeBtn.click();
            }
        }
        
        // 在面板初始化完成后调用
        initModeSwitching();

        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'wf-toggle';
        toggleBtn.innerHTML = `
            <svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        `;
        document.body.appendChild(toggleBtn);

        // 添加事件监听
        toggleBtn.onclick = togglePanel;
        document.addEventListener('keydown', handleKeyPress, false);
        
        const themeToggle = panel.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', toggleTheme);

        // 初始化主题
        initTheme();

        // 添加模式切换事件处理
        const modeButtons = panel.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移所有按钮的 active 状态
                modeButtons.forEach(b => b.classList.remove('active'));
                // 添加当前按钮的 active 状态
                btn.classList.add('active');
                // 保存当前模式
                const mode = btn.id.replace('mode-', '');
                localStorage.setItem('wf_current_mode', mode);
                // TODO: 切换模式后的其他处理
                switchMode(mode);
            });
        });

        // 恢复上次选择的模式
        const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
        const savedModeBtn = panel.querySelector(`#mode-${savedMode}`);
        if (savedModeBtn) {
            savedModeBtn.click();
        }

        // 添加配置面板事件处理
        const configTrigger = panel.querySelector('.config-trigger-btn');
        const configPanel = panel.querySelector('.config-panel');
        const configClose = panel.querySelector('.config-panel-close');

        configTrigger.addEventListener('click', () => {
            configPanel.classList.add('visible');
        });

        configClose.addEventListener('click', () => {
            configPanel.classList.remove('visible');
        });

        // 加载配置
        function loadConfig() {
            const config = ConfigManager.getConfig();
            
            // 置主题
            document.documentElement.setAttribute('data-theme', config.theme);
            
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

            // Update mode buttons after loading config
            updateModeButtons();
        
        }

        // 收集表单数据
        function collectFormData() {
            return {
                version: DEFAULT_CONFIG.version,
                theme: document.documentElement.getAttribute('data-theme') || 'dark',
                refreshInterval: Number(document.getElementById('refresh-interval').value) || DEFAULT_CONFIG.refreshInterval,
                excludeTags: document.getElementById('exclude-tags').value,
                dailyPlanner: {
                    enabled: document.getElementById('enable-daily').checked,
                    taskName: document.getElementById('task-daily').value,
                    nodeId: document.getElementById('node-daily').value
                },
                target: {
                    work: {
                        enabled: document.getElementById('enable-work').checked,
                        taskName: document.getElementById('task-work').value,
                        nodeId: document.getElementById('node-work').value,
                        tag: document.getElementById('tag-work').value
                    },
                    personal: {
                        enabled: document.getElementById('enable-personal').checked,
                        taskName: document.getElementById('task-personal').value,
                        nodeId: document.getElementById('node-personal').value,
                        tag: document.getElementById('tag-personal').value
                    },
                    temp: {
                        enabled: document.getElementById('enable-temp').checked,
                        taskName: document.getElementById('task-temp').value,
                        nodeId: document.getElementById('node-temp').value,
                        tag: document.getElementById('tag-temp').value
                    }
                },
                collector: {
                    enabled: document.getElementById('enable-collector').checked,
                    taskName: document.getElementById('task-collector').value,
                    nodeId: document.getElementById('node-collector').value,
                    tags: document.getElementById('tag-collector').value,
                    autoComplete: document.getElementById('auto-complete-collector').checked,
                    copyFormat: document.getElementById('copy-format-collector').value
                }
            };
        }

        // 保存按钮事件处理
        const saveBtn = panel.querySelector('.config-save');
        saveBtn.addEventListener('click', () => {
            const newConfig = collectFormData();
            const errors = ConfigManager.validateConfig(newConfig);
            
            if (errors.length > 0) {
                showToast('配置验证失败: ' + errors[0]); // Show only first error to avoid long toast
                return;
            }
            
            if (ConfigManager.saveConfig(newConfig)) {
                updateModeButtons(); // Update buttons after saving
                showToast('配置已保存');
            } else {
                showToast('保存失败');
            }
        });

        // 重置按钮事件处理
        const resetBtn = panel.querySelector('.config-reset');
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？')) {
                if (ConfigManager.resetConfig()) {
                    loadConfig();
                    showToast('配置已重置');
                } else {
                    showToast('重置失败');
                }
            }
        });

        // 初始加载配置
        loadConfig();

        // 为所有模式的复选框添加事件监听
        const modeCheckboxes = [
            'enable-daily',
            'enable-work',
            'enable-personal',
            'enable-temp',
            'enable-collector'
        ].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    handleModeSelection(this);
                });
            }
        });

        // 初始化时检查已启用的模式数量
        function initModeStatus() {
            const config = ConfigManager.getConfig();
            let enabledCount = 0;

            // 计算已启用的模式数量
            if (config.dailyPlanner.enabled) enabledCount++;
            if (config.target.work.enabled) enabledCount++;
            if (config.target.personal.enabled) enabledCount++;
            if (config.target.temp.enabled) enabledCount++;
            if (config.collector.enabled) enabledCount++;

            // 如果超过限制，重置配置
            if (enabledCount > 3) {
                showToast('已启用的模式超过限制，已重置配置');
                ConfigManager.resetConfig();
                loadConfig();
            }
        }

        // 初始化时调用
        initModeStatus();

        // Add mode switching logic
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
            document.getElementById(`${mode}-content`).classList.add('active');
            document.getElementById(`mode-${mode}`).classList.add('active');
            
            // Save current mode
            localStorage.setItem('wf_current_mode', mode);
        }

        


    }

    // 等待 WorkFlowy 加载完成
    function waitForWF() {
        if(typeof WF !== 'undefined') {
            console.log('WorkFlowy API 加载完成');
            initPanel();
        } else {
            console.log('等待 WorkFlowy API...');
            setTimeout(waitForWF, 100);
        }
    }

    // 启动
    console.log('WorkFlowy Forwarder Plus Framework 启动...');
    waitForWF();

    // Add function to update mode button labels
    function updateModeButtons() {
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
            // Show Target button if any target mode is enabled
            const targetEnabled = config.target.work.enabled || 
                                config.target.personal.enabled || 
                                config.target.temp.enabled;
            targetBtn.style.display = targetEnabled ? 'block' : 'none';
            
            // Use first enabled target's name, or default to "Target"
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

    // Update loadConfig function to call updateModeButtons
    function loadConfig() {
        const config = ConfigManager.getConfig();
        
        // Existing config loading code...
        
        // Update mode buttons after loading config
        updateModeButtons();
    }

    // Update saveConfig to call updateModeButtons
    const saveBtn = panel.querySelector('.config-save');
    saveBtn.addEventListener('click', () => {
        const newConfig = collectFormData();
        const errors = ConfigManager.validateConfig(newConfig);
        
        if (errors.length > 0) {
            alert('配置验证失败:\n' + errors.join('\n'));
            return;
        }
        
        if (ConfigManager.saveConfig(newConfig)) {
            updateModeButtons(); // Update buttons after saving
            alert('配置已保存');
        } else {
            alert('保存失败');
        }
    });

    // Update mode switch styles to handle hidden buttons
    GM_addStyle(`
        .mode-switch {
            display: flex;
            background: var(--section-bg);
            border-radius: 6px;
            padding: 6px;
            margin: 16px 12px;
            gap: 6px;
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: none; /* Hide by default */
        }

        .mode-btn[style*="display: block"] {
            display: block; /* Show only enabled buttons */
        }

        .mode-btn.active {
            background: var(--input-bg);
            color: var(--text-color);
        }
    `);

    // Add data management functions
    const DataManager = {
        async collectNodes(nodeId, tag) {
            console.log('Collecting nodes for:', nodeId, 'with tag:', tag);
            
            if (!nodeId) {
                console.log('No nodeId provided');
                return [];
            }
            
            try {
                const nodes = [];
                const nodeIds = nodeId.split(',').map(id => id.trim());
                
                for (const id of nodeIds) {
                    console.log('Processing node:', id);
                    const node = WF.getItemById(id);
                    if (!node) {
                        console.log('Node not found:', id);
                        continue;
                    }
                    
                    const children = node.getChildren() || [];
                    console.log('Found children:', children.length);
                    
                    children.forEach(child => {
                        const name = child.getNameInPlainText();
                        const note = child.getNoteInPlainText();
                        
                        if (tag && (name.includes(tag) || note.includes(tag))) {
                            nodes.push({
                                id: child.getId(),
                                name,
                                note,
                                completed: child.getCompleted(),
                                hasTag: true
                            });
                        } else if (!tag) {
                            nodes.push({
                                id: child.getId(),
                                name,
                                note,
                                completed: child.getCompleted(),
                                hasTag: false
                            });
                        }
                    });
                }
                
                console.log('Collected nodes:', nodes.length);
                return nodes;
            } catch (error) {
                console.error('Error collecting nodes:', error);
                return [];
            }
        }
    };

    // Add render functions for each mode
    const ViewRenderer = {
        // 渲染 DailyPlanner 视图
        async renderDailyView(container, config) {
            if (!config.dailyPlanner.enabled || !config.dailyPlanner.nodeId) {
                container.innerHTML = '<div class="empty-state">请先配置日常计划节点</div>';
                return;
            }

            container.innerHTML = '<div class="loading">加载中...</div>';
            
            const nodes = await DataManager.collectNodes(
                config.dailyPlanner.nodeId, 
                DataManager.validateTag(config.dailyPlanner.tag)
            );

            if (nodes.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无任务<br>在目标节点添加任务后刷新</div>';
                return;
            }

            container.innerHTML = `
                <div class="daily-tasks">
                    <div class="task-header">
                        <h3>${config.dailyPlanner.taskName || '日常计划'}</h3>
                        <button class="refresh-btn">刷新</button>
                    </div>
                    <div class="task-list">
                        ${nodes.map(node => `
                            <div class="task-item ${node.completed ? 'completed' : ''}" data-id="${node.id}">
                                <div class="task-content">
                                    <input type="checkbox" ${node.completed ? 'checked' : ''}>
                                    <span class="task-name">${node.name}</span>
                                </div>
                                ${node.note ? `<div class="task-note">${node.note}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add event listeners
            container.querySelector('.refresh-btn')?.addEventListener('click', () => {
                this.renderDailyView(container, config);
            });

            // Add checkbox event listeners
            container.querySelectorAll('.task-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const taskId = e.target.closest('.task-item').dataset.id;
                    const node = WF.getItemById(taskId);
                    if (node) {
                        await node.setCompleted(e.target.checked);
                    }
                });
            });
        },

        // 渲染 Target 视图
        async renderTargetView(container, config) {
            const targetTypes = ['work', 'personal', 'temp'];
            const enabledTargets = targetTypes.filter(type => config.target[type].enabled);
            
            if (enabledTargets.length === 0) return;
            
            container.innerHTML = '<div class="loading">加载中...</div>';
            
            const targetContent = [];
            
            for (const type of enabledTargets) {
                const nodes = await DataManager.fetchNodeData(config.target[type].nodeId);
                if (!nodes) continue;
                
                const filteredNodes = DataManager.filterExcludedTags(nodes, config.excludeTags);
                
                targetContent.push(`
                    <div class="target-section">
                        <div class="section-header">
                            <h3>${config.target[type].taskName || type}</h3>
                        </div>
                        <div class="task-list">
                            ${filteredNodes.map(node => `
                                <div class="task-item ${node.completed ? 'completed' : ''}" data-id="${node.id}">
                                    <div class="task-content">
                                        <input type="checkbox" ${node.completed ? 'checked' : ''}>
                                        <span class="task-name">${node.name}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            }
            
            container.innerHTML = targetContent.join('') || '<div class="empty-state">暂无数据</div>';
        },

        // 渲染 Collector 视图
        async renderCollectorView(container, config) {
            if (!config.collector.enabled) return;
            
            container.innerHTML = '<div class="loading">加载中...</div>';
            
            const nodes = await DataManager.fetchNodeData(config.collector.nodeId);
            if (!nodes || nodes.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无数据</div>';
                return;
            }
            
            const filteredNodes = DataManager.filterExcludedTags(nodes, config.excludeTags);
            
            container.innerHTML = `
                <div class="collector-tasks">
                    <div class="task-header">
                        <h3>${config.collector.taskName || 'Collected Items'}</h3>
                    </div>
                    <div class="task-list">
                        ${filteredNodes.map(node => `
                            <div class="task-item ${node.completed ? 'completed' : ''}" data-id="${node.id}">
                                <div class="task-content">
                                    <input type="checkbox" ${node.completed ? 'checked' : ''}>
                                    <span class="task-name">${node.name}</span>
                                </div>
                                <div class="task-actions">
                                    <button class="copy-btn" data-format="${config.collector.copyFormat}">
                                        复制
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    };

    // Add styles for task views
    GM_addStyle(`
        /* Loading and empty states */
        .loading {
            padding: 20px;
            text-align: center;
            color: var(--text-secondary);
        }

        .empty-state {
            padding: 20px;
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
        }

        /* Task list styles */
        .task-header {
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .task-header h3 {
            margin: 0;
            font-size: 16px;
            color: var(--text-color);
        }

        .task-list {
            padding: 8px;
        }

        .task-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--section-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s ease;
        }

        .task-item:hover {
            background: var(--hover-bg);
        }

        .task-item.completed {
            opacity: 0.7;
        }

        .task-item.completed .task-name {
            text-decoration: line-through;
        }

        .task-content {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .task-name {
            color: var(--text-color);
            font-size: 14px;
            word-break: break-word;
        }

        .task-actions {
            display: flex;
            gap: 8px;
        }

        .copy-btn {
            padding: 4px 8px;
            background: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .copy-btn:hover {
            background: var(--hover-bg);
        }

        /* Target mode specific styles */
        .target-section {
            margin-bottom: 20px;
        }

        .section-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .section-header h3 {
            margin: 0;
            font-size: 14px;
            color: var(--text-color);
        }

        .empty-state {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.5;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
        }

        .refresh-btn {
            padding: 4px 8px;
            background: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 12px;
            cursor: pointer;
        }

        .refresh-btn:hover {
            background: var(--hover-bg);
        }

        .task-note {
            margin-left: 24px;
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }
    `);

    // Update switchMode function to render content
    // Move switchMode outside of initPanel
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
            
            // Render content based on mode
            const config = ConfigManager.getConfig();
            console.log('Switching to mode:', mode, 'with config:', config);
            
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
})();