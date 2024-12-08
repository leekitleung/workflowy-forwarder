// 面板HTML结构
const PANEL_HTML = `
  <div id="workflowy-panel">
    <button id="panel-toggle">⋮</button>
    <div class="panel-content">
      <div class="panel-header">
        <h2>WorkFlowy Panel</h2>
        <button id="refresh-btn">刷新</button>
      </div>
      <div class="panel-body">
        <div class="loading">加载中...</div>
      </div>
    </div>
  </div>
`;

// 面板样式
const PANEL_STYLES = `
  #workflowy-panel {
    position: fixed !important;
    top: 50% !important;
    right: 0 !important;
    transform: translateY(-50%) !important;
    width: 300px !important;
    height: 400px !important;
    background: white !important;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1) !important;
    border-radius: 8px 0 0 8px !important;
    z-index: 99999 !important;
    transition: transform 0.3s ease !important;
  }

  #workflowy-panel.open {
    transform: translate(-300px, -50%) !important;
  }

  #panel-toggle {
    position: fixed !important;
    top: 50% !important;
    right: 0 !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 60px !important;
    background: white !important;
    border: 1px solid #ddd !important;
    border-right: none !important;
    border-radius: 4px 0 0 4px !important;
    cursor: pointer !important;
    z-index: 100000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 16px !important;
  }

  .panel-content {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  .panel-header {
    padding: 15px !important;
    border-bottom: 1px solid #eee !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }

  .panel-header h2 {
    margin: 0 !important;
    font-size: 16px !important;
  }

  #refresh-btn {
    padding: 5px 10px !important;
    background: #4CAF50 !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
  }

  .panel-body {
    flex: 1 !important;
    overflow-y: auto !important;
    padding: 15px !important;
  }

  .loading {
    text-align: center !important;
    color: #666 !important;
    padding: 20px !important;
  }

  .node-item {
    padding: 10px !important;
    border-bottom: 1px solid #eee !important;
    cursor: pointer !important;
  }

  .node-item:hover {
    background: #f5f5f5 !important;
  }
`;

// 等待WorkFlowy API就绪
function waitForWorkflowy() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.WF && window.WF.rootItem) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// 修改获取节点数据的方法，不使用注入脚本
function getFirstNodeData() {
  try {
    // 直接在content script中访问数据
    const data = {
      type: 'GET_FIRST_NODE'
    };
    // 使用自定义事件而不是postMessage
    const event = new CustomEvent('WORKFLOWY_REQUEST', { detail: data });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error getting node data:', error);
  }
}

// 创建一个独立的脚本文件来处理WorkFlowy API
const apiScript = `
  document.addEventListener('WORKFLOWY_REQUEST', function(e) {
    if (e.detail.type === 'GET_FIRST_NODE') {
      try {
        const rootItem = WF.rootItem();
        const firstNode = rootItem.getChildren()[0];
        if (firstNode) {
          document.dispatchEvent(new CustomEvent('WORKFLOWY_RESPONSE', {
            detail: {
              type: 'NODE_DATA',
              data: {
                text: firstNode.getNameInPlainText(),
                note: firstNode.getNoteInPlainText(),
                id: firstNode.getId()
              }
            }
          }));
        } else {
          document.dispatchEvent(new CustomEvent('WORKFLOWY_RESPONSE', {
            detail: {
              type: 'NODE_DATA',
              data: null
            }
          }));
        }
      } catch (error) {
        console.error('Error in API script:', error);
      }
    }
  });
`;

// 修改消息处理函数
function handleMessage(event) {
  if (event.detail.type === 'NODE_DATA') {
    const panelBody = document.querySelector('.panel-body');
    if (!panelBody) return;

    const data = event.detail.data;
    if (!data) {
      panelBody.innerHTML = '<div class="empty">没有找到节点</div>';
      return;
    }

    panelBody.innerHTML = `
      <div class="node-item" data-id="${data.id}">
        <div class="node-text">${data.text}</div>
        ${data.note ? `<div class="node-note">${data.note}</div>` : ''}
      </div>
    `;

    // 添加点击事件
    const nodeItem = panelBody.querySelector('.node-item');
    if (nodeItem) {
      nodeItem.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('WORKFLOWY_REQUEST', {
          detail: {
            type: 'ZOOM_TO_NODE',
            id: data.id
          }
        }));
      });
    }
  }
}

// 初始化面板
async function initPanel() {
  try {
    // 1. 注入样式
    const style = document.createElement('style');
    style.textContent = PANEL_STYLES;
    document.head.appendChild(style);

    // 2. 创建面板
    const panel = document.createElement('div');
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);

    // 3. 添加事件监听
    const toggleBtn = document.getElementById('panel-toggle');
    const refreshBtn = document.getElementById('refresh-btn');
    const workflowyPanel = document.getElementById('workflowy-panel');

    toggleBtn.addEventListener('click', () => {
      workflowyPanel.classList.toggle('open');
    });

    refreshBtn.addEventListener('click', getFirstNodeData);

    // 4. 注入API处理脚本
    const scriptElement = document.createElement('script');
    scriptElement.src = chrome.runtime.getURL('api.js');
    document.head.appendChild(scriptElement);

    // 5. 监听自定义事件
    document.addEventListener('WORKFLOWY_RESPONSE', handleMessage);

    // 6. 等待API就绪后获取初始数据
    await waitForWorkflowy();
    console.log('WorkFlowy API ready');
    getFirstNodeData();

  } catch (error) {
    console.error('Panel initialization failed:', error);
  }
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPanel);
} else {
  initPanel();
}
