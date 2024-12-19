// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.2.6
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

// 更新版本号
const SCRIPT_VERSION = GM_info.script.version;

// 添加节点缓存机制
const NodeCache = {
    cache: new Map(),
    maxAge: 5 * 60 * 1000, // 5分钟缓存

    set(id, node) {
        this.cache.set(id, {
            node,
            timestamp: Date.now()
        });
    },

    get(id) {
        const cached = this.cache.get(id);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(id);
            return null;
        }

        return cached.node;
    },

    clear() {
        this.cache.clear();
    }
};

// 添加全局错误处理
window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', {msg, url, line, col, error});
    showToast('发生错误,请刷新重试', true);
    return false;
};

// 优化showToast函数
function showToast(message, isError = false, duration = 2000) {
    const toast = document.querySelector('.toast') || createToast();
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;

    // 使用RAF优化动画
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 20px)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 0)';
        }, duration);
    });
}

// 添加加载状态组件
const LoadingState = {
    show(container) {
        const loading = document.createElement('div');
        loading.className = 'loading-state';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">加载中...</div>
        `;
        container.appendChild(loading);
    },

    hide(container) {
        const loading = container.querySelector('.loading-state');
        if (loading) {
            loading.remove();
        }
    }
};

// 优化视图渲染,使用DocumentFragment
function renderNodes(nodes, container) {
    const fragment = document.createDocumentFragment();
    nodes.forEach(node => {
        const element = createTaskItem(node);
        fragment.appendChild(element);
    });
    container.appendChild(fragment);
}

// 添加拖拽排序支持
function initDragAndDrop(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', e => {
        draggedItem = e.target;
        e.target.classList.add('dragging');
    });

    container.addEventListener('dragend', e => {
        e.target.classList.remove('dragging');
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement) {
            container.insertBefore(draggable, afterElement);
        } else {
            container.appendChild(draggable);
        }
    });
}

// 添加批量操作支持
function initBatchOperations(container) {
    let selectedItems = new Set();

    container.addEventListener('click', e => {
        if (e.ctrlKey && e.target.closest('.task-item')) {
            const item = e.target.closest('.task-item');
            if (selectedItems.has(item)) {
                selectedItems.delete(item);
                item.classList.remove('selected');
            } else {
                selectedItems.add(item);
                item.classList.add('selected');
            }
            updateBatchActions();
        }
    });
}

// 添加新的样式
GM_addStyle(`
    /* 加载状态样式 */
    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .loading-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid var(--border-color);
        border-top-color: var(--text-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-text {
        margin-top: 10px;
        color: var(--text-secondary);
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* 拖拽样式 */
    .task-item.dragging {
        opacity: 0.5;
        cursor: move;
    }

    /* 选中样式 */
    .task-item.selected {
        background: var(--section-bg);
        border-color: var(--input-focus-border);
    }

    /* 错误提示样式 */
    .toast.error {
        background: #d32f2f;
    }

    .toast.success {
        background: #2e7d32;
    }
`);

(function() {
    'use strict';

    // 提升panel变量到模块作用域
    let panel;

    // 默认配置
    const DEFAULT_CONFIG = {
        version: `v${SCRIPT_VERSION}`, // 使用模板字符串
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
                tag: '' // 修改默认值为空字符串
            },
            personal: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: '' // 修改默认值为空字符串
            },
            temp: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: '' // 修改默认值为空字符串
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
            const validateNodeId = (id, name, required = true) => {
                if (!id) {
                    if (required) {
                        errors.push(`${name}的节点ID不能为空`);
                    }
                    return;
                }
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
                // 日历节点ID可以为空
                validateNodeId(config.dailyPlanner.calendarNodeId, 'DailyPlanner日历', false);
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
        /* 面板基础布局 */
        .wf-panel {
            position: fixed;
            right: -319px;
            top: 46px;
            height: calc(100vh - 46px);
            width: 319px;
            background: var(--panel-bg);
            border-left: 1px solid var(--border-color);
            z-index: 100;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .wf-panel.visible {
            transform: translateX(-319px);
        }


        .mode-btn {
            flex: 1;
            padding: 6px 10px;
            border: none;
            background: none;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            font-size: 14px;
            margin: 2px;
        }




        /* 模式内容区域 */
        .mode-contents {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            padding-bottom: 140px;
        }



        .mode-content.active {
            display: block;
        }


        .panel-btn-group button svg {
            width: 16px;
            height: 16px;
        }

        /* 配置面板 */
        .config-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--panel-bg);
            z-index: 102;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease;
        }

        .config-panel.visible {
            opacity: 1;
            visibility: visible;
        }

        /* Toast提示 */
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

        /* 切换按钮 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: var(--bg-color);
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
            background: var(--button-hover-bg);
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: var(--text-color);
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle:hover .toggle-arrow {
            opacity: 1;
        }

        /* 主题变量 */
        :root[data-theme="dark"] {
            --bg-color: rgba(39, 45, 50, 1);
            --panel-bg: #2B3135;
            --border-color: #5c6062;
            --text-color: #9ea1a2;
            --text-secondary: #9ea1a2;
            --button-active-bg: rgba(56, 70, 81, 1);
            --button-hover-bg: rgba(53, 125, 166, 1);
            --button-hover-text: rgba(185, 207, 221, 1);
            --card-bg: rgba(53, 60, 63, 1);
            --card-border-color: rgba(58, 67, 71, 1);
            --card-hover-bg: rgba(56, 70, 81, 1);
            --card-hover-border-color: rgba(68, 80, 88, 1);
            --input-bg: #383f44;
            --input-border: #5c6062;
            --input-focus-border: #4a9eff;
            --input-focus-bg: #404850;
            --section-bg: rgba(255, 255, 255, 0.03);
            --group-bg: rgba(255, 255, 255, 0.02);
            --divider-color: #3a4347;
        }

        :root[data-theme="light"] {
            --bg-color: #eee;
            --panel-bg: #ffffff;
            --border-color: #e4e6e8;
            --text-color: #333333;  // 更深的文字颜色
            --text-secondary: #666666;  // 更深的次要文字颜色
            --button-active-bg: #f0f2f4;
            --button-hover-bg: #49baf2;
            --button-hover-text: #eee;
            --card-bg: #ffffff;
            --card-border-color: #e4e6e8;
            --card-hover-bg: #f8f9fa;
            --card-hover-border-color: #d1d5d9;
            --input-bg: #ffffff;
            --input-border: #e4e6e8;
            --input-focus-border: #4a9eff;
            --input-focus-bg: #f8f9fa;
            --section-bg: rgba(134, 140, 144, 0.05);
            --group-bg: rgba(134, 140, 144, 0.03);
            --divider-color: #e4e6e8;
            --hover-bg: rgba(134, 140, 144, 0.08);
            --active-bg: rgba(134, 140, 144, 0.12);

            /* 新增侧边栏相关样式 */
            --sidebar-bg: #ffffff;
            --sidebar-border: #e4e6e8;
            --sidebar-hover-bg: #f5f7f9;
            --sidebar-text: #333333;
            --sidebar-icon: #666666;
        }

        /* 设面板内容样式 */
        .config-header {
            padding: 24px 12px 12px;

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
        .config-panel h3{
            margin:0 0 12px;
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
            margin-bottom:110px;
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
            // background: var(--input-bg);
            // border: 1px solid var(--input-border);
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



        .config-save {
            background: var(--input-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
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
            // background: var(--input-bg);
            // border-color: var(--input-border);
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

        .config-item input {
            width: 100%;

        }

        .config-item input:not([type="checkbox"]) {
            flex: 1;
            padding: 8px 12px;
            // background: var(--input-bg);
            // border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .config-item input:focus {
            outline: none;
            // border-color: var(--input-focus-border);
            // background: var(--input-focus-bg);
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

        .task-item {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 8px;
            background: var(--card-bg);
            border: 1px solid var(--card-border-color);
            position: relative;
            transition: all 0.2s ease;
            display: flex;
            align-items: flex-start;
            background: var(--card-bg);
            cursor: pointer;
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
            position: absolute;
            right: 6px;
            top: 19px;
            transform: translateY(-50%);
            display: flex;
            gap: 2px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
        }

        .collector-tasks .task-actions {

            top: 16px;

        }


        /* 操作按钮样式 */
        .task-action-btn {
            width: 14px;
            height: 14px;
            padding: 0px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .task-action-btn:hover {
            background: var(--section-bg);
            color: var(--text-color);

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
            background: var(--bg-color);
            border-radius: 6px;
            padding: 6px;
            gap: 6px;
            margin: 0px 4px;
        }

        .planner-links{
            display: flex;
            justify-content: flex-end;
            color: var(--text-secondary);
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

        .planner-links:hover{
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M4.4632 3.60609L5.0693 3L8.06933 6.00003L5.0693 9.00006L4.4632 8.39397L6.85714 6.00003L4.4632 3.60609Z' fill='%23357DA6'/%3E%3Cpath d='M6 12C2.68629 12 -4.07115e-07 9.31371 -2.62268e-07 6C-1.17422e-07 2.68629 2.68629 -4.07115e-07 6 -2.62268e-07C9.31371 -1.17422e-07 12 2.68629 12 6C12 9.31371 9.31371 12 6 12ZM6 11.1429C8.84032 11.1429 11.1429 8.84032 11.1429 6C11.1429 3.15968 8.84032 0.857143 6 0.857143C3.15968 0.857142 0.857142 3.15968 0.857142 6C0.857142 8.84032 3.15968 11.1429 6 11.1429Z' fill='%23357DA6'/%3E%3C/svg%3E");
            color: var(--text-color);
            text-decoration: none;
        }

        .today-link::before{
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

        .planner-links-row{
            position:relative;
        }

        .planner-links-row .today-link{
            position:absolute;
            right:0;
            top:0;
        }

        .mode-btn.active {
            background: var(--button-active-bg);
            color: var(--text-color);
        }

        .mode-btn:hover {
            background: var(--button-hover-bg);
            color: var(--button-hover-text);
        }



        /* Task list styles */
        .task-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .collector-tasks .children-content{
            white-space: pre-wrap;
            color: var(--text-color);
            font-size: 14px;
            line-height: 1.2;
            margin-left: 22px;
        }

        .children-content{
            white-space: pre-wrap;
            color: var(--text-color);
            font-size: 14px;
            line-height: 1.2;
        }

        .children-content-item {
            margin-top: 4px;
        }

        .single-content {
            white-space: pre-wrap;
            padding: 4px 0;
        }

        .name-content{
            margin-bottom: 2px;
            padding-bottom: 4px;
            color: rgba(144, 147, 149, 0.5);
            font-size: 10px;

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

        /* 自义复选框样式 */
        .checkbox-wrapper {
            position: relative;
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 8px;
            margin-top: 2px;
        }

        .collector-tasks .checkbox-wrapper {
            position: absolute;
            display: inline-block;
            width: 16px;
            height: 16px;
            top: 27px;
            left: 10px;
            margin-top: 0px;
        }


        .task-action-btn.link, .task-action-btn.copy, .task-action-btn.remove{
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

        .task-action-btn.link {
             background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234C5861'/%3E%3Cpath d='M4 3.01014L5.00844 2L10 7L5.00844 12L4 10.9899L7.98312 7L4 3.01014Z' fill='%239EA1A2'/%3E%3C/svg%3E");
        }

        .task-action-btn.link:hover {
             background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%2346A753'/%3E%3Cpath d='M4 3.01014L5.00844 2L10 7L5.00844 12L4 10.9899L7.98312 7L4 3.01014Z' fill='white'/%3E%3C/svg%3E");
        }

        .task-action-btn.remove{
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect opacity='0.2' width='14' height='14' rx='2' fill='%239EA1A2'/%3E%3Cpath d='M7.00001 7.92035L10.0796 11L11 10.0796L7.92037 7L11 3.92038L10.0796 3.00003L7.00001 6.07965L3.92035 3L3 3.92035L6.07966 7L3 10.0796L3.92035 11L7.00001 7.92035Z' fill='%239EA1A2'/%3E%3C/svg%3E");
        }

        .task-action-btn.remove:hover {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%23B04042'/%3E%3Cpath d='M7.00001 7.92035L10.0796 11L11 10.0796L7.92037 7L11 3.92038L10.0796 3.00003L7.00001 6.07965L3.92035 3L3 3.92035L6.07966 7L3 10.0796L3.92035 11L7.00001 7.92035Z' fill='white'/%3E%3C/svg%3E");
        }

        .task-action-btn.copy {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234C5861'/%3E%3Cpath d='M5.34119 10.6494L7.33176 8.65881L7.99529 9.32233L6.00472 11.3129C5.08858 12.229 3.60323 12.229 2.6871 11.3129C1.77097 10.3968 1.77097 8.91142 2.6871 7.99528L4.67767 6.00472L5.34119 6.66824L3.35062 8.65881C2.80094 9.20849 2.80094 10.0997 3.35062 10.6494C3.9003 11.1991 4.79151 11.1991 5.34119 10.6494Z' fill='%239EA1A2'/%3E%3Cpath d='M9.32233 7.99528L8.65881 7.33176L10.6494 5.34119C11.1991 4.79151 11.1991 3.9003 10.6494 3.35062C10.0997 2.80094 9.20849 2.80094 8.65881 3.35062L6.66824 5.34119L6.00472 4.67767L7.99528 2.6871C8.91142 1.77097 10.3968 1.77097 11.3129 2.6871C12.229 3.60323 12.229 5.08858 11.3129 6.00472L9.32233 7.99528Z' fill='%239EA1A2'/%3E%3Cpath d='M7.99543 5.34121L8.65895 6.00473L6.00486 8.65883L5.34133 7.9953L7.99543 5.34121Z' fill='%239EA1A2'/%3E%3C/svg%3E");
        }

        .task-action-btn.copy:hover {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Crect width='14' height='14' rx='2' fill='%234988B1'/%3E%3Cpath d='M5.34119 10.6494L7.33176 8.65881L7.99529 9.32233L6.00472 11.3129C5.08858 12.229 3.60323 12.229 2.6871 11.3129C1.77097 10.3968 1.77097 8.91142 2.6871 7.99528L4.67767 6.00472L5.34119 6.66824L3.35062 8.65881C2.80094 9.20849 2.80094 10.0997 3.35062 10.6494C3.9003 11.1991 4.79151 11.1991 5.34119 10.6494Z' fill='white'/%3E%3Cpath d='M9.32233 7.99528L8.65881 7.33176L10.6494 5.34119C11.1991 4.79151 11.1991 3.9003 10.6494 3.35062C10.0997 2.80094 9.20849 2.80094 8.65881 3.35062L6.66824 5.34119L6.00472 4.67767L7.99528 2.6871C8.91142 1.77097 10.3968 1.77097 11.3129 2.6871C12.229 3.60323 12.229 5.08858 11.3129 6.00472L9.32233 7.99528Z' fill='white'/%3E%3Cpath d='M7.99543 5.34121L8.65895 6.00473L6.00486 8.65883L5.34133 7.9953L7.99543 5.34121Z' fill='white'/%3E%3C/svg%3E");
        }


        .checkbox-wrapper input[type="checkbox"] {
            opacity: 0;
            position: absolute;
        }

        .checkbox-custom {
            position: absolute;
            top: 0;
            left: 0;
            width: 12px;
            height: 12px;
            border: 1px solid var(--text-color);
            border-radius: 2px;
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



        .task-content {
            flex: 1;
            display: flex;
            align-items: flex-start;

        }

        .task-text {
            flex: 1;
            display: flex;
            flex-direction: column;
            word-break: break-word;
        }

        .task-name {
            font-size: 14px;
            line-height: 1.4;
            color: #9ea1a2;  // 修改为统一的颜色
        }

        .task-note {
            font-size: 12px;
            color: var(--secondary-text-color);
            margin-top: 4px;
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


        .task-item:hover {
            background: var(--card-hover-bg);
            border-color: var(--card-hover-border-color);
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

        .task-item:hover .task-actions {
            opacity: 1;
            visibility: visible;
        }

        .task-item .reminder-actions button:hover {
            transform: scale(1.1);
        }




        .wf-panel.visible ~ #content {
            padding-right: 319px;
        }

        #content {
            transition: padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }



       /* 清除按钮样式 */
        .config-btn {
            width: 100%;
            padding: 10px;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .config-btn:hover{
            background: var(--card-hover-bg);
            border-color: var(--card-hover-border-color);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
            color: #9ea1a2;  // 修改为统一的颜色
            font-size: 14px;
            margin-bottom: 4px;
            padding: 4px;
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

        .mode-contents #work-content .node-title:first-of-type,.mode-contents #personal-content .node-title:first-of-type,.mode-contents #temp-content .node-title:first-of-type {
            margin: 0 0 6px;
        }

        .node-title {
            font-family: "Aclonica", sans-serif;
            font-weight: 400;
            font-style: italic;
            color: #9ea1a2;  // 修改为统一的颜色
            font-size: 14px;
            margin: 18px 0 6px;
            padding: 4px;
        }

        .node-content {
            margin-left: 12px;
        }

        .node-content div:first-child {
            margin: 0 0 6px;
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

        /* 完成状态样式 */
        .task-item.completed {
            opacity: 0.6;
            transition: opacity 0.3s ease;
        }

        .task-item.completed .task-name,
        .task-item.completed .task-text,
        .task-item.completed .children-content,
        .task-item.completed .single-content {
            text-decoration: line-through;
            color: var(--text-secondary);
        }

        /* 确保所有模式下的样式一致性 */
        .task-item.completed.colored,
        .task-item.completed.highlighted {
            opacity: 0.6;
        }

        .task-item.completed.colored .task-name,
        .task-item.completed.highlighted .task-name {
            text-decoration: line-through;
            color: var(--text-color);
            opacity: 0.8;
        }



        /* 确保内容区域不被按钮组遮挡 */
        .mode-contents {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 120px;  // 改用margin-bottom
        }




        /* 模式内容区域 */
        .mode-contents {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            padding-bottom: 140px; /* 为底部按钮组留出空间 */
        }

        /* 按钮组容器 */
        .panel-btn-group,.config-buttons {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-color);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            border-top: 1px solid var(--border-color);
            z-index: 101; /* 确保在内容之上 */
        }




        /* 确保配置面板正确显示 */
        .config-panel {
            z-index: 102; /* 确保在按钮组之上 */
        }


        /* 状态样式 */
        .error-state {
            color: var(--text-color);
            background: var(--section-bg);
            padding: 16px;
            border-radius: 4px;
            text-align: center;
            font-size: 14px;
        }

        .empty-state {
            color: var(--text-secondary);
            padding: 24px;
            text-align: center;
            font-size: 14px;
        }

        /* 输入框样式优化 */
        .config-group input:not([type="checkbox"]),
        .config-group select,
        .config-group textarea {
            color: var(--text-color);
            // background: var(--input-bg);
            // border: 1px solid var(--input-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .config-group input:not([type="checkbox"]):hover,
        .config-group select:hover,
        .config-group textarea:hover {
            // border-color: var(--input-focus-border);
            // background: var(--input-focus-bg);
        }

        .config-group input:not([type="checkbox"]):focus,
        .config-group select:focus,
        .config-group textarea:focus {
            color: var(--input-focus-border);
            background: var(--wf-gray-500);
            outline: none;

        }

        /* 按钮样式优化 */
        button {
            color: var(--text-color);
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        button:hover {
            background: var(--hover-bg);
            border-color: var(--input-focus-border);
        }

        button:active {
            background: var(--active-bg);
        }

        /* 链接样式优化 */
        a {
            color: var(--text-color);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        a:hover {
            color: var(--input-focus-border);
        }

        .collector-content{

        }
    `);

    // 添加收集模式的卡片样式
    GM_addStyle(`
        /* 收集模式卡片样式优化 */
        .task-item.collect-mode {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .task-item.collect-mode .task-header {
            padding: 4px 8px;
            border-bottom: none;
        }

        .task-item.collect-mode .task-title {
            font-size: 12px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: calc(100% - 80px);
        }

        .task-item.collect-mode .task-content {
            position: relative;
            padding: 4px 8px;
            padding-left: 32px; /* 为复选框留出空间 */
        }

        .task-item.collect-mode .checkbox-wrapper {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
        }

        .task-item.collect-mode .task-text {
            flex: 1;
            min-height: 20px;
        }

        .task-item.collect-mode .single-content {
            white-space: pre-wrap;
            line-height: 1.4;
            color: var(--text-color);
        }

        .task-item.collect-mode .children-content {
            white-space: pre-wrap;
            line-height: 1.4;
            color: var(--text-color);
        }

        .task-item.collect-mode .task-actions {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 4px;
        }
    `);

    // 面板切换函数
    function togglePanel() {
        if (!panel) return;

        const toggleBtn = document.querySelector('.wf-toggle');
        panel.classList.toggle('visible');
        toggleBtn?.classList.toggle('active');

        // 更新内容区域padding
        const content = document.getElementById('content');
        if (content) {
            content.style.paddingRight = panel.classList.contains('visible') ? '319px' : '0';
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

    // 添加快捷键处理函数
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
            showToast('最多只能启用3个模式');
            return false;
        }

        // 更新相关输入框的状态
        const group = checkbox.closest('.config-group');
        if (group) {
            const inputs = group.querySelectorAll('input:not([type="checkbox"]), select');
            inputs.forEach(input => {
                input.disabled = !checkbox.checked;
                // 移除清空输入框的代码
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
    function showToast(message, isError = false) {
        const toast = document.querySelector('.toast') || createToast();
        toast.textContent = message;
        toast.className = 'toast' + (isError ? ' error' : ' success');
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }

    // 修改updateModeButtons数
    function updateModeButtons() {
        if (!panel) return;
        const config = ConfigManager.getConfig();

        // 获取所有模式按钮
        const modeButtons = {
            daily: document.getElementById('mode-daily'),
            work: document.getElementById('mode-work'),
            personal: document.getElementById('mode-personal'),
            temp: document.getElementById('mode-temp'),
            collector: document.getElementById('mode-collector')
        };

        // 更新Daily按钮
        if (modeButtons.daily) {
            modeButtons.daily.textContent = config.dailyPlanner.taskName || 'Daily';
            modeButtons.daily.style.display = config.dailyPlanner.enabled ? 'block' : 'none';
        }

        // 更新Work按钮
        if (modeButtons.work) {
            modeButtons.work.textContent = config.target.work.taskName || 'Work';
            modeButtons.work.style.display = config.target.work.enabled ? 'block' : 'none';
        }

        // 更新Personal按钮
        if (modeButtons.personal) {
            modeButtons.personal.textContent = config.target.personal.taskName || 'Personal';
            modeButtons.personal.style.display = config.target.personal.enabled ? 'block' : 'none';
        }

        // 更新Temp按钮
        if (modeButtons.temp) {
            modeButtons.temp.textContent = config.target.temp.taskName || 'Temp';
            modeButtons.temp.style.display = config.target.temp.enabled ? 'block' : 'none';
        }

        // 更新Collector按钮
        if (modeButtons.collector) {
            modeButtons.collector.textContent = config.collector.taskName || 'Collector';
            modeButtons.collector.style.display = config.collector.enabled ? 'block' : 'none';
        }

        // 重新排列可见按钮
        const modeSwitch = document.querySelector('.mode-switch');
        if (modeSwitch) {
            const visibleButtons = Array.from(modeSwitch.children)
                .filter(btn => btn.style.display !== 'none');

            // 更新按钮样式以保持均匀分布
            visibleButtons.forEach(btn => {
                btn.style.flex = `1 1 ${100 / visibleButtons.length}%`;
            });
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
                    // 不清空禁用的输入框
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
            'copy-tags-collector': config.collector.copyTags,
            'refresh-interval': config.refreshInterval,
            'exclude-tags': config.excludeTags
        }).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value || ''; // 使用空字符串代替 null/undefined
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
                    <span class="version-tag">v${SCRIPT_VERSION}</span>
                </h2>
            </div>

            <!-- Mode switching buttons -->
            <div class="mode-switch">
                <button id="mode-daily" class="mode-btn">Daily</button>
                <button id="mode-work" class="mode-btn">Work</button>
                <button id="mode-personal" class="mode-btn">Personal</button>
                <button id="mode-temp" class="mode-btn">Temp</button>
                <button id="mode-collector" class="mode-btn">Collector</button>
            </div>

            <!-- Mode-specific link containers -->
            <div class="mode-links">
                <!-- Daily mode links -->
                <div class="daily-links" style="display: none;">
                    <div class="planner-links">
                        <div class="planner-links-row">
                            <a href="#" class="planner-link today-link" id="goto-today">
                                Today's Plan
                            </a>
                            <a href="#" class="planner-link scan-link">
                                DailyPlanner
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Work mode links -->
                <div class="work-links" style="display: none;">
                    <div class="planner-links">
                        <a href="#" class="planner-link work-link">Work</a>
                    </div>
                </div>

                <!-- Personal mode links -->
                <div class="personal-links" style="display: none;">
                    <div class="planner-links">
                        <a href="#" class="planner-link personal-link">Personal</a>
                    </div>
                </div>

                <!-- Temp mode links -->
                <div class="temp-links" style="display: none;">
                    <div class="planner-links">
                        <a href="#" class="planner-link temp-link">Temp</a>
                    </div>
                </div>

                <!-- Collector mode links -->
                <div class="collector-links" style="display: none;">
                    <div class="planner-links">
                        <a href="#" class="planner-link collect-link">Collector</a>
                    </div>
                </div>
            </div>

            <!-- Mode contents -->
            <div class="mode-contents">
                <!-- Daily mode content -->
                <div id="daily-content" class="mode-content"></div>

                <!-- Work mode content -->
                <div id="work-content" class="mode-content"></div>

                <!-- Personal mode content -->
                <div id="personal-content" class="mode-content"></div>

                <!-- Temp mode content -->
                <div id="temp-content" class="mode-content"></div>

                <!-- Collector mode content -->
                <div id="collector-content" class="mode-content"></div>
            </div>
            <div class="panel-btn-group">
                <!-- 添加清除按钮容器 -->

                    <button id="clear-all" class="config-btn clear-all-btn">
                        清除当前模式所有卡片
                    </button>

                    <button class="config-btn config-trigger-btn">
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
                                <div class="config-item">
                                    <label>日历节点</label>

                                    <input type="text" id="calendar-node-daily"
                                               placeholder="输入日历节点ID"
                                               title="留空则不显示Today's Plan链接">


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
                                        placeholder="输入标签，如: #�������������要 (支持数字、中文、英文，多个用号分隔)">
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
                                    <input type="text" id="tag-personal" placeholder="输入标签，如: #重要 (支持数字、中文、英文)">
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
                                    <input type="text" id="tag-temp" placeholder="输入标签，如: #重要 (支持数字、中文、英文)">
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
                                    <label>节ID</label>
                                    <input type="text" id="node-collector" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-collector" placeholder="输入标签，多个用逗号分隔">
                                </div>
                                <div class="config-item">
                                    <label>自动完成</label>
                                    <input type="checkbox" id="auto-complete-collector">
                                    <span class="checkbox-label">复制内容后标记完成</span>
                                </div>
                                <div class="config-item">
                                    <label>复制标签</label>
                                    <input type="checkbox" id="copy-tags-collector">
                                    <span class="checkbox-label">复制内容时包含标签</span>
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

        // 初始化清除按钮事件
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            clearAllBtn.onclick = () => {
                const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                clearAllReminders(currentMode);
            };
        }

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

        // 初始化配置面板
        initConfigPanel();

        // 初始��模式处理
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

        // 添加快捷键监听
        document.addEventListener('keydown', handleKeyPress);

        // 初始化主题
        initTheme();

        // Initialize Today's Plan functionality
        initTodayPlan();

        // 添加定期同步检查
        setInterval(synchronizeWorkflowyStates, 5000); // 每5秒检查一次
    }



    // 将 switchMode 函数移到模块作用域
    function switchMode(mode) {
        console.log('Switching to mode:', mode);

        // 隐藏所有内容和链接
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.mode-links > div').forEach(links => {
            links.style.display = 'none';
        });

        // 获取目标内容和链接元素
        const contentEl = document.getElementById(`${mode}-content`);
        const linksEl = document.querySelector(`.${mode}-links`);

        if (!contentEl) {
            console.error(`Content element not found for mode: ${mode}`);
            return;
        }

        // 显示当前模式的内容和链接
        contentEl.classList.add('active');
        if (linksEl) {
            linksEl.style.display = 'block';
        }

        // 渲染内容
        const config = ConfigManager.getConfig();
        try {
            switch (mode) {
                case 'daily':
                    ViewRenderer.renderDailyView(contentEl, config);
                    break;
                case 'work':
                case 'personal':
                case 'temp':
                    ViewRenderer.renderTargetView(contentEl, config, mode);
                    break;
                case 'collector':
                    ViewRenderer.renderCollectorView(contentEl, config);
                    break;
            }
        } catch (error) {
            console.error('Error rendering mode content:', error);
            contentEl.innerHTML = '<div class="error-state">加载失败，请刷新重试</div>';
        }

        // Save current mode
        localStorage.setItem('wf_current_mode', mode);

        // Update links for current mode
        updateLinks(mode);
    }

    function updateLinks(mode) {
        const config = ConfigManager.getConfig();
        const links = {
            daily: [
                {
                    selector: '.today-link',
                    display: config.dailyPlanner.enabled && !!config.dailyPlanner.calendarNodeId,
                    href: '#',
                    text: "Today's Plan"
                },
                {
                    selector: '.scan-link',
                    display: config.dailyPlanner.enabled,
                    href: WF.getItemById(config.dailyPlanner.nodeId)?.getUrl() || '#',
                    text: config.dailyPlanner.taskName || 'Daily'
                }
            ],
            target: [
                {
                    selector: '.follow-link:nth-child(1)',
                    display: config.target.work.enabled,
                    href: WF.getItemById(config.target.work.nodeId)?.getUrl() || '#',
                    text: config.target.work.taskName || 'Target'
                },
                {
                    selector: '.follow-link:nth-child(2)',
                    display: config.target.personal.enabled,
                    href: WF.getItemById(config.target.personal.nodeId)?.getUrl() || '#',
                    text: config.target.personal.taskName || 'Target'
                }
            ],
            collector: [
                {
                    selector: '.collect-link',
                    display: config.collector.enabled,
                    href: WF.getItemById(config.collector.nodeId)?.getUrl() || '#',
                    text: config.collector.taskName || 'Collector'
                }
            ]
        };

        // Only update links for current mode
        const currentModeLinks = links[mode];
        if (currentModeLinks) {
            currentModeLinks.forEach(link => {
                const element = document.querySelector(link.selector);
                if (element) {
                    element.style.display = link.display ? 'flex' : 'none';
                    element.href = link.href;
                    element.textContent = link.text;
                }
            });
        }
    }


    // 添加checkMirrorNodes函数定义
    function checkMirrorNodes(node) {
        try {
            if (!node) return false;

            // 获取节点的DOM元素
            const element = node.getElement();
            if (!element) return false;

            // 检查父级项目是否有 hasMirrors 类
            const projectElement = element.closest('.project');
            return projectElement ? projectElement.classList.contains('hasMirrors') : false;

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
                    text: '#9ea1a2',
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
            background: linear-gradient(to left,
                var(--node-bg-color) 70%,
                transparent
            );
        }

        .task-item.colored .task-action-btn {
            color: var(--node-text-color);
        }

    `);

    // 添加复制格���处理函数
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
        taskItem: (child, mode = '') => {
            const hasMirrors = checkMirrorNodes(child);
            const colors = getNodeColor(child);

            // Build color style
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

            // Get node URL
            const nodeUrl = child.getUrl();
            const fullUrl = nodeUrl.startsWith('http') ? nodeUrl : `https://workflowy.com${nodeUrl}`;

            return `
                <div class="task-item ${child.isCompleted() ? 'completed' : ''}
                    ${hasMirrors ? 'has-mirrors' : ''} ${colors ? 'colored' : ''}"
                    data-id="${child.getId()}"
                    data-mode="${mode}"
                    ${colorStyle}>
                <div class="task-content">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${child.isCompleted() ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                    </label>
                    <div class="task-text">
                        <span class="task-name">${child.getNameInPlainText()}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn copy" title="复制链接">

                    </button>
                    <button class="task-action-btn remove" title="移除">

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

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
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

    // 加ViewRenderer对象
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
                            // 只收集时间点的子节点，并验证节点有效性
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
        async renderTargetView(container, config, mode) {
            // 检查参数
            if (!mode || !config.target[mode]) {
                console.error('Invalid mode:', mode);
                container.innerHTML = '<div class="error-state">无效的模式</div>';
                return;
            }

            if (!config.target[mode].enabled || !config.target[mode].nodeId) {
                container.innerHTML = '<div class="error-state">请先配置并启用该模式</div>';
                return;
            }

            try {
                const targetNodes = new Map();
                const contentMap = new Map();
                const processedIds = new Set();
                const tagGroups = new Map(); // 用于存储不同标签的节点

                // Process node function with duplicate handling
                // 修改 renderTargetView 函数中的 processNode 函数
                function processNode(node, config, currentDepth = 0, maxDepth = 10) {
                    if (currentDepth >= maxDepth) return;

                    const id = node.getId();
                    if (processedIds.has(id)) return;
                    processedIds.add(id);

                    const name = node.getNameInPlainText();
                    const note = node.getNoteInPlainText();

                    // 处理多标签
                    const configTags = config.tag
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag)
                        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

                    // 检查是否包含任意配置的标签
                    const hasConfiguredTag = configTags.length === 0 || configTags.some(tag =>
                        name.includes(tag) || note.includes(tag)
                    );

                    if (!name.includes('#index') && !note.includes('#index') && hasConfiguredTag) {
                        // 安全地检查镜像状态
                        let hasMirrors = false;
                        try {
                            hasMirrors = checkMirrorNodes(node);
                        } catch (error) {
                            console.error('检查镜像状态失败:', error);
                        }

                        const nodeData = {
                            id,
                            name: name,
                            displayName: name,
                            time: node.getLastModifiedDate().getTime(),
                            completed: node.isCompleted(),
                            hasMirrors,
                            url: node.getUrl()
                        };

                        // 将节点按标签分组
                        configTags.forEach(tag => {
                            if (name.includes(tag) || note.includes(tag)) {
                                if (!tagGroups.has(tag)) {
                                    tagGroups.set(tag, []);
                                }
                                tagGroups.get(tag).push(nodeData);
                            }
                        });

                        // 如果没有配置标签或节点不属于任何标签组,放入默认组
                        if (configTags.length === 0 ||
                            !configTags.some(tag => name.includes(tag) || note.includes(tag))) {
                            if (!tagGroups.has('default')) {
                                tagGroups.set('default', []);
                            }
                            tagGroups.get('default').push(nodeData);
                        }

                        // 存储节点数据
                        targetNodes.set(id, nodeData);
                    }

                    // 递归处理子节点
                    node.getChildren().forEach(child =>
                        processNode(child, config, currentDepth + 1, maxDepth)
                    );
                }

                // Process each enabled target node
                if (config.target[mode].enabled) {
                    const targetNode = WF.getItemById(config.target[mode].nodeId);
                    if (targetNode) processNode(targetNode, config.target[mode], 0, 10);
                }

                // 渲染分组内容
                let content = '';
                tagGroups.forEach((nodes, tag) => {
                    if (nodes.length > 0) {
                        // 添加标签组标题
                        const tagTitle = tag === 'default' ? '未标记' : tag;
                        content += `<div class="node-title">${tagTitle}</div>`;

                        // 渲染该标签组的节点
                        content += nodes
                            .sort((a, b) => b.time - a.time)
                            .map(nodeData => {
                                const node = WF.getItemById(nodeData.id);
                                return node ? Templates.taskItem(node, true, mode) : '';
                            })
                            .join('');
                    }
                });

                container.innerHTML = content || '<div class="empty-state">暂无目标内容</div>';
                this.addTaskEventListeners(container);

            } catch (error) {
                console.error(`渲染${mode}视图失败:`, error);
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

                        </button>
                        <button class="task-action-btn remove" title="移除">

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
                                            ${node.childrenContent ? `
                                                <div class="name-content">${truncateText(node.name, 35)}</div>
                                                <div class="children-content">${node.childrenContent}</div>
                                            ` : `
                                                <div class="name-content">${truncateText(node.name, 35)}</div>
                                                <div class="children-content">${node.name}</div>
                                            `}
                                        </div>
                                    </div>
                                </div>
                                <div class="task-actions">
                                    <button class="task-action-btn link" title="跳转到节点">

                                    </button>
                                    <button class="task-action-btn remove" title="移除">

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
            // Content click handler for copying
            container.querySelectorAll('.task-content .task-text').forEach(content => {
                content.addEventListener('click', async (e) => {
                    // 忽略复选框区域的点击
                    if (e.target.closest('.checkbox-wrapper')) return;

                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) return;

                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) throw new Error('Task node not found');

                        // 无论任务是否完成都执行复制操作
                        const content = processCollectorContent(node);
                        await navigator.clipboard.writeText(content);
                        showToast('已复制');

                        // 仅在任务未完成且启用了自动完成时才标记完成
                        if (!node.isCompleted() && config.collector.autoComplete) {
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

            // Checkbox click handler
            container.querySelectorAll('.checkbox-wrapper input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    e.stopPropagation(); // ���止事件冒泡

                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) return;

                    try {
                        const node = WF.getItemById(taskId);
                        if (!node) throw new Error('Task node not found');

                        const isCompleted = e.target.checked;

                        // 更新UI
                        taskItem.classList.toggle('completed', isCompleted);

                        // 同步到WorkFlowy
                        await syncWorkflowyState(taskId, isCompleted);

                        // 显示反馈
                        showFeedback(taskItem, isCompleted ? '已完成' : '已取消完成');

                    } catch (error) {
                        console.error('更新状态失败:', error);
                        // 恢复复选框状态
                        e.target.checked = !e.target.checked;
                        taskItem.classList.toggle('completed');
                        showFeedback(taskItem, '更新失败', true);
                    }
                });
            });

            // Link button handler
            container.querySelectorAll('.task-action-btn.link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = e.target.closest('.task-item')?.dataset.id;
                    if (!taskId) return;

                    const node = WF.getItemById(taskId);
                    if (node) {
                        window.location.href = node.getUrl();
                    }
                });
            });

            // Remove button handler
            container.querySelectorAll('.task-action-btn.remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskItem = e.target.closest('.task-item');
                    const taskId = taskItem?.dataset.id;
                    if (!taskId) return;

                    try {
                        const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');

                        if (!removedItems.includes(taskId)) {
                            removedItems.push(taskId);
                            localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(removedItems));
                        }

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

                        const isCompleted = e.target.checked;

                        // 更新 UI
                        taskItem.classList.toggle('completed', isCompleted);

                        // 同步到 WorkFlowy
                        await syncWorkflowyState(taskId, isCompleted);

                        // 显示反馈
                        showFeedback(taskItem, isCompleted ? '已完成' : '已取消完成');

                    } catch (error) {
                        console.error('更新状态失败:', error);
                        // 恢复复选框状态
                        e.target.checked = !e.target.checked;
                        taskItem.classList.toggle('completed');
                        showFeedback(taskItem, '更新失', true);
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

            // 添加卡片点击事件
            container.querySelectorAll('.task-item').forEach(taskItem => {
                taskItem.addEventListener('click', (e) => {
                    // 如果点击的是复选框、按钮或其他控件,不处理跳转
                    if (e.target.closest('.checkbox-wrapper') ||
                        e.target.closest('.task-actions') ||
                        e.target.closest('button')) {
                        return;
                    }

                    const taskId = taskItem.dataset.id;
                    if (!taskId) return;

                    try {
                        const node = WF.getItemById(taskId);
                        if (node) {
                            // 使用 WF.zoomTo 进行跳转
                            WF.zoomTo(node);
                        }
                    } catch (error) {
                        console.error('跳转失败:', error);
                        showFeedback(taskItem, '跳转失败');
                    }
                });
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
                // 获取当前配置用于保持未修改���值
                const currentConfig = ConfigManager.getConfig();

                // 安全获取DOM元素值的辅助函数
                const getValue = (id, defaultValue = '') => {
                    const element = document.getElementById(id);
                    return element ? (
                        element.type === 'checkbox' ? element.checked : element.value.trim()
                    ) : defaultValue;
                };

                const formData = {
                    version: `v${SCRIPT_VERSION}`,
                    theme: currentConfig.theme,
                    refreshInterval: parseInt(getValue('refresh-interval', 60000)),
                    excludeTags: getValue('exclude-tags'),

                    dailyPlanner: {
                        enabled: getValue('enable-daily', false),
                        nodeId: getValue('node-daily'),
                        taskName: getValue('task-daily'),
                        calendarNodeId: getValue('calendar-node-daily')
                    },

                    target: {
                        work: {
                            enabled: getValue('enable-work', false),
                            nodeId: getValue('node-work'),
                            taskName: getValue('task-work'),
                            tag: getValue('tag-work')
                        },
                        personal: {
                            enabled: getValue('enable-personal', false),
                            nodeId: getValue('node-personal'),
                            taskName: getValue('task-personal'),
                            tag: getValue('tag-personal')
                        },
                        temp: {
                            enabled: getValue('enable-temp', false),
                            nodeId: getValue('node-temp'),
                            taskName: getValue('task-temp'),
                            tag: getValue('tag-temp')
                        }
                    },

                    collector: {
                        enabled: getValue('enable-collector', false),
                        nodeId: getValue('node-collector'),
                        taskName: getValue('task-collector'),
                        tags: getValue('tag-collector'),
                        autoComplete: getValue('auto-complete-collector', true),
                        copyTags: getValue('copy-tags-collector', false), // Add new option
                        copyFormat: getValue('copy-format-collector', 'plain')
                    }
                };

                // 验证配置
                const errors = ConfigManager.validateConfig(formData);
                if (errors.length > 0) {
                    showToast('配置错误: ' + errors[0], true);
                    return;
                }

                // 保存配置
                if (ConfigManager.saveConfig(formData)) {
                    showToast('配置已保存');
                    // 更新界面
                    loadConfig();
                    // 刷新当前视图
                    const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                    switchMode(currentMode);
                    updateLinks(currentMode);
                    // 关闭配置面板
                    panel.querySelector('.config-panel').classList.remove('visible');
                } else {
                    showToast('保存失败，请重试', true);
                }
            } catch (error) {
                console.error('保存配置失败:', error);
                showToast('保存失败: ' + error.message, true);
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
        try {
            const config = ConfigManager.getConfig();
            const calendarNodeId = config.dailyPlanner.calendarNodeId;

            if (!calendarNodeId) {
                console.log('Calendar node ID not configured');
                return null;
            }

            const parser = new DOMParser();

            // Get calendar root node
            const calendarNode = WF.getItemById(calendarNodeId);
            if (!calendarNode) {
                console.log('Calendar node not found:', calendarNodeId);
                return null;
            }

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

            const todayTimestamp = targetDate.setHours(0,0,0,0);
            const found = findFirstMatchingItem(todayTimestamp, calendarNode);

            if (found) {
                sessionStorage.setItem(todayKey, found.getId());
                return found;
            }

            console.log('Date node not found for:', targetDate);
            return null;
        } catch (error) {
            console.error('Error in findDateNode:', error);
            return null;
        }
    }

    // Update Today's Plan initialization
    function initTodayPlan() {
        const todayLink = document.querySelector('.today-link');
        if (!todayLink) return;

        todayLink.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                const config = ConfigManager.getConfig();
                if (!config.dailyPlanner.enabled || !config.dailyPlanner.calendarNodeId) {
                    showToast('请先配置日历节点ID', true);
                    return;
                }

                showToast('正在查找今天的日期节点...');
                const today = new Date();
                const node = findDateNode(today);

                if (node) {
                    WF.zoomTo(node);
                    showToast('已找到今天的日期节点');
                } else {
                    showToast('未找到今天的日期节点', true);
                }
            } catch (error) {
                console.error('导航到今天失败:', error);
                showToast('导航失败: ' + error.message, true);
            }
        });
    }

    // 添加clearAllReminders函数
    function clearAllReminders(mode) {
        try {
            // 获取当前模式
            const currentMode = mode || localStorage.getItem('wf_current_mode') || 'daily';

            // 清除指定模式的所有移除记录
            localStorage.removeItem(`workflowy_removed_${currentMode}`);

            // 获取当前模式的内容容器
            const contentEl = document.getElementById(`${currentMode}-content`);
            if (!contentEl) {
                throw new Error('Content element not found');
            }

            // 直接清除所有卡片
            const cards = contentEl.querySelectorAll('.task-item');
            cards.forEach(card => {
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            });

            // 显示成功提示
            showToast('已清除所有节点');

        } catch (error) {
            console.error('清除失败:', error);
            showToast('清除失败: ' + error.message);
        }
    }

    // 添加内容处理函数
    function processCollectorContent(node) {
        try {
            const config = ConfigManager.getConfig();
            const keepTags = config.collector.copyTags;

            // 处理标签的辅助函数
            function processText(text) {
                if (!text) return '';

                // 移除时间戳
                text = text.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/, '');

                // 根据配置决定是否保留标签
                if (!keepTags) {
                    // 移除所有标签,但保留#稍后处理
                    text = text.replace(/#[^\s#]+/g, match => {
                        return match.includes('') ? match : '';
                    });
                }
                // 如果 keepTags 为 true,保留所有标签

                return text.trim();
            }

            const name = node.getName();
            const plainName = node.getNameInPlainText();
            const children = node.getChildren();

            // 单节点处理
            if (children.length === 0) {
                // 检查是否包含URL
                const urlMatch = plainName.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    const url = urlMatch[1];
                    const title = processText(plainName.replace(url, '')).trim();
                    return title ? `${title}\n${url}` : url;
                }

                return processText(plainName);
            }

            // 多节点处理
            let formattedContent = '';

            // 查找标题和链接节点
            const titleNode = children.find(child =>
                child.getNameInPlainText().startsWith('标题:') ||
                child.getNameInPlainText().startsWith('标题：')
            );

            const linkNode = children.find(child =>
                child.getNameInPlainText().startsWith('链接:') ||
                child.getNameInPlainText().startsWith('链接：')
            );

            // 如果找到标题和链接节点,创建OPML格式
            if (titleNode && linkNode) {
                const title = processText(titleNode.getNameInPlainText().replace(/^标题[：:]\s*/, ''));
                const url = linkNode.getNameInPlainText().replace(/^链接[：:]\s*/, '').trim();
                return createOPML(title, url);
            }

            // 获取相关子节点
            const relevantChildren = children.filter(child => {
                const childName = child.getNameInPlainText();
                return childName &&
                       !childName.includes('#已处理') &&
                       !childName.includes('#忽略');
            });

            // 处理子节点内容
            const processChildren = (nodes, level = 1) => {
                return nodes.map(child => {
                    const content = processText(child.getNameInPlainText());
                    if (!content) return '';

                    const indent = '  '.repeat(level);
                    const childContent = `${indent}- ${content}`;

                    // 处理子节点的注释
                    const note = child.getNoteInPlainText();
                    if (note) {
                        const processedNote = processText(note);
                        if (processedNote) {
                            childContent += `\n${indent}  ${processedNote}`;
                        }
                    }

                    // 递归处理孙节点
                    const grandChildren = child.getChildren();
                    if (grandChildren.length > 0) {
                        const nestedContent = processChildren(grandChildren, level + 1);
                        return nestedContent ? `${childContent}\n${nestedContent}` : childContent;
                    }

                    return childContent;
                }).filter(line => line.trim()).join('\n');
            };

            // 添加子节点内容
            const childrenContent = processChildren(relevantChildren);
            if (childrenContent) {
                formattedContent += childrenContent;
            }

            // 移除多余的空行并规范化空格
            return formattedContent
                .replace(/\n{3,}/g, '\n\n')  // 将3个以上的换行符替换为2个
                .replace(/[ \t]+/g, ' ')      // 规范化空格
                .trim();                      // 移除首尾空白

        } catch (error) {
            console.error('处理收集器内容失败:', error);
            return node.getNameInPlainText();
        }
    }

    // 创建OPML格式内容
    function createOPML(title, url) {
        // 转义特殊字符
        const escapeXml = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        // 转义标题和URL
        const safeTitle = escapeXml(title);
        const safeUrl = escapeXml(url);

        // 创建OPML格式,将URL作为节点的note属性
        return `<?xml version="1.0"?>
<opml version="2.0">
    <head>
        <title>${safeTitle}</title>
    </head>
    <body>
        <outline text="${safeTitle}" _note="&lt;a href=&quot;${safeUrl}&quot;&gt;${safeUrl}&lt;/a&gt;"/>
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
            const nameWithoutDateTime = name.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/, '');
            const nameWithoutTags = nameWithoutDateTime.replace(/#[^\s#]+/g, '');
            return nameWithoutTags.trim() === '' && node.getChildren().length === 0;
        }

        // 处理标签的辅助函数
        function processConfigTags(tags) {
            return tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag)
                .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
        }

        // 检查节点是否包含任意配置的标签
        function hasAnyConfiguredTag(text, configTags) {
            return configTags.some(tag => text.includes(tag));
        }

        // 移除配置的标签
        function removeConfigTags(text, configTags) {
            let result = text;
            configTags.forEach(tag => {
                result = result.replace(new RegExp(tag, 'g'), '');
            });
            return result.trim();
        }

        // 递归搜索节点
        function searchNodes(node) {
            if (!node || processedNodes.has(node.getId())) return;

            const nodeId = node.getId();
            const nodeName = node.getNameInPlainText();
            const nodeNote = node.getNoteInPlainText();

            // 处理多标签
            const configTags = processConfigTags(config.collector.tags);

            // 检查节点是否包含任意配置的标签
            const hasConfiguredTag = hasAnyConfiguredTag(nodeName, configTags) ||
                                   hasAnyConfiguredTag(nodeNote, configTags);

            // 检查标签
            if (hasConfiguredTag && !isEmptyNode(node)) {
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
                        const childName = child.getNameInPlainText();
                        const childNote = child.getNoteInPlainText();

                        // 移除所有配置的标签
                        const processedName = removeConfigTags(childName, configTags);

                        if (processedName) {
                            childrenContent += `- ${processedName}\n`;
                            if (childNote) {
                                childrenContent += `  ${childNote}\n`;
                            }
                        }
                    });
                }

                // 处理节点名称 - 移除所有配置的标签
                const processedName = removeConfigTags(nodeName, configTags);

                // 保存节点信息
                collectedNodes.set(nodeId, {
                    id: nodeId,
                    name: processedName,
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

    // 添加创卡片项函数
    function createTaskItem(node, mode) {
        try {
            if (!node) return '';

            const isCompleted = node.isCompleted();
            const hasMirrors = checkMirrorNodes(node);
            const colors = getNodeColor(node);
            const name = node.getNameInPlainText().replace(/#稍后处理/g, '').trim();
            const children = node.getChildren();

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
                        <div class="task-header">
                            <div class="task-title" title="${name}">${name}</div>
                        </div>
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
                            <button class="task-action-btn link" title="跳转到节点"></button>
                            <button class="task-action-btn remove" title="移除"></button>
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

        @import url('https://fonts.googleapis.com/css2?family=Aclonica&display=swap');

        .right-bar > div:first-child {
            width: 300px !important;
        }

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

    // 在文件顶部添加状态同步相关函数

    // 同步到 WorkFlowy 的状态
    function syncWorkflowyState(itemId, completed) {
        try {
            const item = WF.getItemById(itemId);
            if (item) {
                WF.editGroup(() => {
                    if (item.isCompleted() !== completed) {
                        WF.completeItem(item);
                    }
                });
            }
        } catch (error) {
            console.error('同步 WorkFlowy 状态失败:', error);
        }
    }

    // 定期检查并同步状态
    function synchronizeWorkflowyStates() {
        try {
            const config = ConfigManager.getConfig();
            const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
            const contentEl = document.getElementById(`${currentMode}-content`);

            if (!contentEl) return;

            // 获取当前显示的所有卡片
            const cards = contentEl.querySelectorAll('.task-item');
            cards.forEach(card => {
                const id = card.dataset.id;
                if (!id) return;

                const item = WF.getItemById(id);
                if (!item) return;

                const isCompleted = item.isCompleted();
                const checkbox = card.querySelector('input[type="checkbox"]');

                if (checkbox && checkbox.checked !== isCompleted) {
                    checkbox.checked = isCompleted;
                    card.classList.toggle('completed', isCompleted);
                }
            });
        } catch (error) {
            console.error('同步状态检查失败:', error);
        }
    }

    // 在销毁时清理事件监听
    function cleanup() {
        document.removeEventListener('keydown', handleKeyPress);
    }

    // 在页面卸载时清理
    window.addEventListener('unload', cleanup);

    // 优化节点获取
    function getNodeById(id) {
        // 先从缓存获取
        const cached = NodeCache.get(id);
        if (cached) return cached;

        // 缓存未命中则从WF获取
        const node = WF.getItemById(id);
        if (node) {
            NodeCache.set(id, node);
        }
        return node;
    }

    // 优化批量节点获取
    function getNodesByIds(ids) {
        return ids.map(id => getNodeById(id)).filter(Boolean);
    }
})();
