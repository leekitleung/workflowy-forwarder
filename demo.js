// ==UserScript==
// @name         WorkFlowy Search Panel
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Add search panel to WorkFlowy
// @author       You
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Version info
    const VERSION = '0.1.0';

    // Search Panel Component
    const SearchPanel = {
        container: null,
        searchInput: null,
        resultsContainer: null,
        searchTimeout: null,
        isVisible: false,
        searchHistory: [],
        maxHistory: 10,
        maxResults: 50,
        currentSearch: null,
        searchDelay: 500,

        init() {
            this.createPanel();
            this.createToggleButton();
            this.bindEvents();
            this.bindKeyboardShortcuts();
            this.loadSearchHistory();
        },

        createPanel() {
            // Create search panel container
            this.container = document.createElement('div');
            this.container.className = 'wf-search-panel';
            
            // Create header
            const header = document.createElement('div');
            header.className = 'wf-search-header';
            header.innerHTML = `
                <div class="wf-search-title">搜索</div>
                <button class="wf-search-close" title="关闭">×</button>
            `;
            
            // Create search input
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.className = 'wf-search-input';
            this.searchInput.placeholder = '搜索...';
            
            // Create search history
            this.historyContainer = document.createElement('div');
            this.historyContainer.className = 'wf-search-history';
            
            // Create results container
            this.resultsContainer = document.createElement('div');
            this.resultsContainer.className = 'wf-search-results';
            
            // Append elements
            this.container.appendChild(header);
            this.container.appendChild(this.searchInput);
            this.container.appendChild(this.historyContainer);
            this.container.appendChild(this.resultsContainer);
            
            // Add styles
            GM_addStyle(`
                .wf-search-panel {
                    position: fixed;
                    right: -320px;
                    top: 50px;
                    width: 320px;
                    height: calc(100vh - 50px);
                    background: var(--wf-background);
                    border-left: 1px solid var(--wf-border-default);
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .wf-search-panel.visible {
                    transform: translateX(-320px);
                }

                .wf-search-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    border-bottom: 1px solid var(--wf-border-default);
                }

                .wf-search-title {
                    font-size: 16px;
                    font-weight: 500;
                    color: var(--wfp-text-main);
                }

                .wf-search-close {
                    background: none;
                    border: none;
                    color: var(--wfp-text-secondary);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .wf-search-close:hover {
                    background: var(--wfp-button-hover-background);
                    color: var(--wfp-text-main);
                }
                
                .wf-search-input {
                    margin: 12px;
                    padding: 8px 12px;
                    border: 1px solid var(--wf-border-default);
                    border-radius: 4px;
                    font-size: 14px;
                    background: var(--wfp-input-background);
                    color: var(--wfp-text-main);
                }
                
                .wf-search-input:focus {
                    outline: none;
                    border-color: var(--wf-input-active);
                }

                .wf-search-history {
                    padding: 0 12px;
                    margin-bottom: 12px;
                }

                .wf-search-history-item {
                    padding: 6px 12px;
                    margin-bottom: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    color: var(--wfp-text-secondary);
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                }

                .wf-search-history-item:hover {
                    background: var(--wfp-button-hover-background);
                    color: var(--wfp-text-main);
                }

                .wf-search-history-item::before {
                    content: '⌕';
                    margin-right: 8px;
                    opacity: 0.5;
                }
                
                .wf-search-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 12px 12px;
                }
                
                .wf-search-result-item {
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--wfp-text-main);
                    border: 1px solid var(--wfp-card-border);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .wf-search-result-item:hover {
                    background: var(--wfp-card-hover-background);
                    color: var(--wfp-card-hover-text);
                }

                .wf-search-result-title {
                    font-size: 14px;
                    line-height: 1.4;
                }

                .wf-search-result-note {
                    font-size: 12px;
                    color: var(--wfp-text-secondary);
                    white-space: pre-wrap;
                }

                .wf-search-result-children {
                    font-size: 12px;
                    color: var(--wfp-text-secondary);
                    margin-left: 12px;
                    border-left: 2px solid var(--wfp-border);
                    padding-left: 8px;
                }

                .wf-search-no-results {
                    text-align: center;
                    padding: 20px;
                    color: var(--wfp-text-secondary);
                    font-style: italic;
                }

                .wf-search-toggle {
                    position: fixed;
                    right: 20px;
                    top: 60px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--wf-background);
                    border: 1px solid var(--wf-border-default);
                    color: var(--wfp-text-main);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    z-index: 999;
                }

                .wf-search-toggle:hover {
                    background: var(--wfp-button-hover-background);
                    transform: scale(1.1);
                }

                .wf-search-toggle svg {
                    width: 16px;
                    height: 16px;
                    opacity: 0.8;
                }

                .wf-search-toggle:hover svg {
                    opacity: 1;
                }

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
                    border: 3px solid var(--wf-border-default);
                    border-top-color: var(--wfp-text-main);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    margin-top: 10px;
                    color: var(--wfp-text-secondary);
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `);
            
            document.body.appendChild(this.container);
        },

        createToggleButton() {
            const button = document.createElement('button');
            button.className = 'wf-search-toggle';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            `;
            document.body.appendChild(button);
        },

        bindEvents() {
            // Toggle button click
            document.querySelector('.wf-search-toggle').addEventListener('click', () => {
                this.toggle();
            });

            // Close button click
            this.container.querySelector('.wf-search-close').addEventListener('click', () => {
                this.hide();
            });

            // Search input
            this.searchInput.addEventListener('input', () => {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }
                
                this.searchTimeout = setTimeout(() => {
                    this.performSearch();
                }, 300);
            });

            // History item click
            this.historyContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.wf-search-history-item');
                if (item) {
                    this.searchInput.value = item.textContent;
                    this.performSearch();
                }
            });
        },

        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + K to toggle search
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.toggle();
                }

                // Escape to close
                if (e.key === 'Escape' && this.isVisible) {
                    e.preventDefault();
                    this.hide();
                }
            });
        },

        toggle() {
            this.isVisible ? this.hide() : this.show();
        },

        show() {
            this.container.classList.add('visible');
            this.isVisible = true;
            this.searchInput.focus();
        },

        hide() {
            this.container.classList.remove('visible');
            this.isVisible = false;
            this.searchInput.blur();
        },

        loadSearchHistory() {
            try {
                const history = localStorage.getItem('wf_search_history');
                if (history) {
                    this.searchHistory = JSON.parse(history);
                    this.renderSearchHistory();
                }
            } catch (error) {
                console.error('Failed to load search history:', error);
            }
        },

        saveSearchHistory() {
            try {
                localStorage.setItem('wf_search_history', JSON.stringify(this.searchHistory));
            } catch (error) {
                console.error('Failed to save search history:', error);
            }
        },

        addToHistory(query) {
            if (!query || this.searchHistory.includes(query)) return;
            
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > this.maxHistory) {
                this.searchHistory.pop();
            }
            
            this.saveSearchHistory();
            this.renderSearchHistory();
        },

        renderSearchHistory() {
            if (this.searchHistory.length === 0) {
                this.historyContainer.style.display = 'none';
                return;
            }

            this.historyContainer.style.display = 'block';
            this.historyContainer.innerHTML = this.searchHistory
                .map(query => `
                    <div class="wf-search-history-item">${query}</div>
                `)
                .join('');
        },

        async performSearch() {
            const query = this.searchInput.value.trim();
            
            if (!query) {
                this.clearResults();
                return;
            }

            // 取消之前的搜索
            this.currentSearch = Date.now();
            const thisSearch = this.currentSearch;
            
            try {
                LoadingState.show(this.resultsContainer);
                
                // 使用 WorkFlowy 搜索 API
                WF.search(query);
                
                // 延迟一下以确保 WorkFlowy 搜索完成
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 如果已经开始了新的搜索，放弃这次搜索
                if (thisSearch !== this.currentSearch) return;

                // 获取可见结果
                const results = this.getSearchResults();
                
                // 如果已经开始了新的搜索，放弃这次搜索
                if (thisSearch !== this.currentSearch) return;

                this.displayResults(results);
                this.addToHistory(query);
            } catch (error) {
                console.error('Search error:', error);
                showToast('搜索出错，请重试', true);
            } finally {
                if (thisSearch === this.currentSearch) {
                    LoadingState.hide(this.resultsContainer);
                }
            }
        },

        getSearchResults() {
            const results = [];
            const root = WF.rootItem();
            const queue = [root];
            
            // 使用迭代而不是递归
            while (queue.length > 0 && results.length < this.maxResults) {
                const item = queue.shift();
                
                // 跳过根节点
                if (item !== root) {
                    results.push(item);
                }
                
                // 添加可见的子节点到队列
                try {
                    const children = item.getVisibleChildren();
                    if (children && children.length > 0) {
                        queue.push(...children);
                    }
                } catch (error) {
                    console.error('Error getting children:', error);
                }
            }
            
            return results;
        },

        displayResults(results) {
            this.resultsContainer.innerHTML = '';
            
            if (results.length === 0) {
                this.resultsContainer.innerHTML = '<div class="wf-search-no-results">无搜索结果</div>';
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            // 分批处理结果
            const batchSize = 10;
            let currentBatch = 0;

            const processNextBatch = () => {
                const start = currentBatch * batchSize;
                const end = Math.min(start + batchSize, results.length);
                const batch = results.slice(start, end);

                batch.forEach(item => {
                    try {
                        const resultElement = document.createElement('div');
                        resultElement.className = 'wf-search-result-item';
                        
                        // 添加标题
                        const title = document.createElement('div');
                        title.className = 'wf-search-result-title';
                        title.textContent = item.getNameInPlainText() || '';
                        resultElement.appendChild(title);
                        
                        // 添加注释（如果存在）
                        const note = item.getNoteInPlainText();
                        if (note) {
                            const noteElement = document.createElement('div');
                            noteElement.className = 'wf-search-result-note';
                            noteElement.textContent = note;
                            resultElement.appendChild(noteElement);
                        }
                        
                        // 添加子项（如果存在）
                        const children = item.getChildren();
                        if (children && children.length > 0) {
                            const childrenElement = document.createElement('div');
                            childrenElement.className = 'wf-search-result-children';
                            childrenElement.innerHTML = children
                                .slice(0, 3)
                                .map(child => `- ${child.getNameInPlainText() || ''}`)
                                .filter(text => text !== '- ')
                                .join('<br>');
                            if (children.length > 3) {
                                childrenElement.innerHTML += '<br>...';
                            }
                            resultElement.appendChild(childrenElement);
                        }
                        
                        // 点击跳转
                        resultElement.addEventListener('click', () => {
                            WF.zoomTo(item);
                            this.hide();
                        });
                        
                        fragment.appendChild(resultElement);
                    } catch (error) {
                        console.error('Error processing result item:', error);
                    }
                });

                this.resultsContainer.appendChild(fragment);

                currentBatch++;
                if (currentBatch * batchSize < results.length) {
                    requestAnimationFrame(processNextBatch);
                }

                // 添加结果计数
                if (currentBatch === 1) {
                    const countElement = document.createElement('div');
                    countElement.className = 'wf-search-count';
                    countElement.textContent = `找到 ${results.length} 个结果${results.length >= this.maxResults ? '（已限制显示）' : ''}`;
                    this.resultsContainer.insertBefore(countElement, this.resultsContainer.firstChild);
                }
            };

            processNextBatch();
        },

        clearResults() {
            this.resultsContainer.innerHTML = '';
        }
    };

    // Loading state component
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

    // Toast component
    function showToast(message, isError = false, duration = 2000) {
        const toast = document.querySelector('.toast') || createToast();
        toast.textContent = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, 20px)';

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translate(-50%, 0)';
            }, duration);
        });
    }

    function createToast() {
        const toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
        return toast;
    }

    // Add toast styles
    GM_addStyle(`
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
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
        }

        .toast.error {
            background: #d32f2f;
        }

        .toast.success {
            background: #2e7d32;
        }
    `);

    // Add result count styles
    GM_addStyle(`
        .wf-search-count {
            padding: 8px 12px;
            color: var(--wfp-text-secondary);
            font-size: 12px;
            border-bottom: 1px solid var(--wf-border-default);
            margin-bottom: 8px;
        }
    `);

    // Initialize search panel when WorkFlowy is ready
    function waitForWF() {
        if (typeof WF !== 'undefined') {
            SearchPanel.init();
        } else {
            setTimeout(waitForWF, 100);
        }
    }

    // Cleanup on unload
    window.addEventListener('unload', () => {
        const panel = document.querySelector('.wf-search-panel');
        const toggle = document.querySelector('.wf-search-toggle');
        const toast = document.querySelector('.toast');

        if (panel) panel.remove();
        if (toggle) toggle.remove();
        if (toast) toast.remove();
    });

    // Start initialization
    waitForWF();
})();
