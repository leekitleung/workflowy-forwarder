// 等待WorkFlowy API就绪
function waitForWorkFlowy() {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;
    
    const check = () => {
      attempts++;
      if (window.WF && 
          window.WF.rootItem && 
          typeof window.WF.rootItem === 'function' &&
          window.WF.getItemById &&
          typeof window.WF.getItemById === 'function') {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('WorkFlowy API load timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}

// 获取节点数据的辅助函数
function getNodeData(node) {
  if (!node || typeof node.getNameInPlainText !== 'function') return null;
  return {
    text: node.getNameInPlainText(),
    note: node.getNoteInPlainText(),
    id: node.getId()
  };
}

// 获取首页第一个节点
function getFirstNode(rootItem) {
  if (!rootItem || typeof rootItem.getChildren !== 'function') return null;
  const children = rootItem.getChildren();
  if (!Array.isArray(children) || children.length === 0) return null;
  return children[0];
}

// 递归查找带有指定标签的节点
function findNodesWithTag(rootNode, tag) {
  if (!rootNode) return [];

  const nodes = [];
  
  function traverse(node) {
    if (!node) return;

    try {
      if (typeof node.getNameInPlainText === 'function') {
        const name = node.getNameInPlainText();
        if (name && name.includes(tag)) {
          nodes.push(node);
        }
      }

      if (typeof node.getChildren === 'function') {
        const children = node.getChildren();
        if (Array.isArray(children)) {
          children.forEach(child => {
            if (child) traverse(child);
          });
        }
      }
    } catch (error) {
      console.error('Error traversing node:', error);
    }
  }

  traverse(rootNode);
  return nodes;
}

// WorkFlowy API 处理
document.addEventListener('WORKFLOWY_REQUEST', async function(e) {
  try {
    await waitForWorkFlowy();
    
    const detail = e.detail;
    
    switch (detail.type) {
      case 'GET_FIRST_NODE':
        try {
          const rootItem = WF.rootItem();
          if (!rootItem) {
            throw new Error('Root item is null');
          }

          // 获取首页第一个节点
          const firstNode = getFirstNode(rootItem);
          const firstNodeData = firstNode ? getNodeData(firstNode) : null;

          // 获取带标签的节点
          const taggedNodes = findNodesWithTag(rootItem, '#稍后处理');
          const taggedNodesData = taggedNodes.map(node => getNodeData(node)).filter(Boolean);

          // 返回组合的结果
          document.dispatchEvent(new CustomEvent('WORKFLOWY_RESPONSE', {
            detail: {
              type: 'NODE_DATA',
              data: {
                firstNode: firstNodeData,
                taggedNodes: taggedNodesData
              }
            }
          }));
        } catch (error) {
          console.error('Error getting nodes:', error);
          document.dispatchEvent(new CustomEvent('WORKFLOWY_RESPONSE', {
            detail: {
              type: 'NODE_DATA',
              data: {
                firstNode: null,
                taggedNodes: []
              },
              error: error.message
            }
          }));
        }
        break;

      case 'ZOOM_TO_NODE':
        try {
          const node = WF.getItemById(detail.id);
          if (node) WF.zoomTo(node);
        } catch (error) {
          console.error('Error zooming to node:', error);
        }
        break;
    }
  } catch (error) {
    console.error('WorkFlowy API initialization error:', error);
    document.dispatchEvent(new CustomEvent('WORKFLOWY_RESPONSE', {
      detail: {
        type: 'NODE_DATA',
        data: {
          firstNode: null,
          taggedNodes: []
        },
        error: 'WorkFlowy API not ready: ' + error.message
      }
    }));
  }
}); 