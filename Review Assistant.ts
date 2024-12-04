// ==UserScript==
// @name         WorkFlowy Daily Stats with Tabs
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  统计WorkFlowy今日和昨日数据，支持标签页切换
// @author       You
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .stats-panel {
            position: fixed;
            right: 20px;
            top: 60px;
            background: #2B3135;
            padding: 15px;
            border-radius: 8px;
            color: #e7effa;
            z-index: 100;
            width: 400px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-height: 80vh;
            overflow-y: auto;
        }

        .stats-tabs {
            display: flex;
            margin-bottom: 15px;
            border-bottom: 1px solid #3a4145;
        }

        .stats-tab {
            padding: 8px 16px;
            cursor: pointer;
            color: #9EA1A2;
            border-bottom: 2px solid transparent;
            transition: all 0.3s ease;
        }

        .stats-tab:hover {
            color: #e7effa;
        }

        .stats-tab.active {
            color: #4a9eff;
            border-bottom-color: #4a9eff;
        }

        .stats-content {
            display: none;
        }

        .stats-content.active {
            display: block;
        }

        .stats-item {
            margin: 8px 0;
            display: flex;
            justify-content: space-between;
            padding: 8px;
            background: #353c3f;
            border-radius: 6px;
        }

        .stats-label {
            color: #9EA1A2;
        }

        .stats-value {
            font-weight: bold;
            color: #e7effa;
        }

        .completed-tasks {
            margin-top: 20px;
        }

        .completed-task-item {
            background: #353c3f;
            border-radius: 6px;
            padding: 10px;
            margin: 8px 0;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .completed-task-item:hover {
            background: #3a4145;
            transform: translateX(5px);
        }

        .task-time {
            font-size: 12px;
            color: #808589;
            margin-top: 4px;
        }

        .toggle-button {
            position: fixed;
            right: 20px;
            top: 20px;
            background: #2B3135;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            color: #9EA1A2;
            cursor: pointer;
            z-index: 101;
            transition: all 0.3s ease;
        }

        .toggle-button:hover {
            background: #353c3f;
            color: #e7effa;
        }

        .stats-title {
            font-size: 16px;
            margin: 15px 0 10px;
            color: #4a9eff;
        }

        .no-tasks {
            color: #9EA1A2;
            text-align: center;
            padding: 20px;
            font-style: italic;
        }
    `);

    class WorkflowyStats {
        constructor() {
            this.todayStats = {
                nodes: 0,
                characters: 0,
                completed: 0,
                tasks: []
            };
            this.yesterdayStats = {
                nodes: 0,
                characters: 0,
                completed: 0,
                tasks: []
            };
            this.visible = true;
        }

        async init() {
            while (typeof WF === 'undefined' || !WF.rootItem()) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.createToggleButton();
            this.collectStats();
            this.createPanel();
            this.startAutoUpdate();
        }

        createToggleButton() {
            const button = document.createElement('button');
            button.className = 'toggle-button';
            button.textContent = '统计';
            button.onclick = () => this.togglePanel();
            document.body.appendChild(button);
        }

        togglePanel() {
            const panel = document.querySelector('.stats-panel');
            if (panel) {
                this.visible = !this.visible;
                panel.style.display = this.visible ? 'block' : 'none';
            }
        }

        collectStats() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            this.todayStats = { nodes: 0, characters: 0, completed: 0, tasks: [] };
            this.yesterdayStats = { nodes: 0, characters: 0, completed: 0, tasks: [] };

            const processNode = (node) => {
                if (!node) return;

                const modifiedDate = new Date(node.getLastModifiedDate());
                const nodeData = {
                    name: node.getNameInPlainText(),
                    time: modifiedDate,
                    id: node.getId(),
                    completed: node.isCompleted()
                };

                if (modifiedDate >= today && modifiedDate < tomorrow) {
                    this.todayStats.nodes++;
                    this.todayStats.characters += (nodeData.name || '').length;
                    if (nodeData.completed) {
                        this.todayStats.completed++;
                        this.todayStats.tasks.push(nodeData);
                    }
                } else if (modifiedDate >= yesterday && modifiedDate < today) {
                    this.yesterdayStats.nodes++;
                    this.yesterdayStats.characters += (nodeData.name || '').length;
                    if (nodeData.completed) {
                        this.yesterdayStats.completed++;
                        this.yesterdayStats.tasks.push(nodeData);
                    }
                }

                const children = node.getChildren() || [];
                children.forEach(processNode);
            };

            processNode(WF.rootItem());

            this.todayStats.tasks.sort((a, b) => b.time - a.time);
            this.yesterdayStats.tasks.sort((a, b) => b.time - a.time);
        }

        createPanel() {
            const panel = document.createElement('div');
            panel.className = 'stats-panel';
            this.updatePanelContent(panel);
            document.body.appendChild(panel);
        }

        updatePanelContent(panel) {
            panel.innerHTML = `
                <div class="stats-tabs">
                    <div class="stats-tab active" data-tab="today">今日统计</div>
                    <div class="stats-tab" data-tab="yesterday">昨日统计</div>
                </div>

                <div class="stats-content active" id="today-content">
                    <div class="stats-item">
                        <span class="stats-label">新建节点：</span>
                        <span class="stats-value">${this.todayStats.nodes}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">总字数：</span>
                        <span class="stats-value">${this.todayStats.characters}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">完成任务：</span>
                        <span class="stats-value">${this.todayStats.completed}</span>
                    </div>
                    <div class="completed-tasks">
                        <div class="stats-title">已完成任务</div>
                        ${this.renderCompletedTasks(this.todayStats.tasks)}
                    </div>
                </div>

                <div class="stats-content" id="yesterday-content">
                    <div class="stats-item">
                        <span class="stats-label">新建节点：</span>
                        <span class="stats-value">${this.yesterdayStats.nodes}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">总字数：</span>
                        <span class="stats-value">${this.yesterdayStats.characters}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">完成任务：</span>
                        <span class="stats-value">${this.yesterdayStats.completed}</span>
                    </div>
                    <div class="completed-tasks">
                        <div class="stats-title">已完成任务</div>
                        ${this.renderCompletedTasks(this.yesterdayStats.tasks)}
                    </div>
                </div>
            `;

            const tabs = panel.querySelectorAll('.stats-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const tabId = tab.getAttribute('data-tab');
                    panel.querySelectorAll('.stats-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    panel.querySelector(`#${tabId}-content`).classList.add('active');
                });
            });
        }

        renderCompletedTasks(tasks) {
            if (tasks.length === 0) {
                return '<div class="no-tasks">暂无完成的任务</div>';
            }
            return tasks.map(task => `
                <div class="completed-task-item" data-id="${task.id}">
                    <div>${task.name}</div>
                    <div class="task-time">${this.formatTime(task.time)}</div>
                </div>
            `).join('');
        }

        formatTime(date) {
            return date.toLocaleString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        startAutoUpdate() {
            setInterval(() => {
                this.collectStats();
                const panel = document.querySelector('.stats-panel');
                if (panel) {
                    const activeTab = panel.querySelector('.stats-tab.active');
                    const activeTabId = activeTab ? activeTab.getAttribute('data-tab') : 'today';
                    
                    this.updatePanelContent(panel);
                    
                    if (activeTabId !== 'today') {
                        const tab = panel.querySelector(`[data-tab="${activeTabId}"]`);
                        if (tab) tab.click();
                    }
                }
            }, 5 * 60 * 1000); // 每5分钟更新一次
        }
    }

    function initStats() {
        const stats = new WorkflowyStats();
        stats.init();
    }

    if (document.readyState === 'complete') {
        initStats();
    } else {
        window.addEventListener('load', initStats);
    }
})();