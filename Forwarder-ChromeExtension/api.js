// WorkFlowy API 处理
document.addEventListener('WORKFLOWY_REQUEST', function(e) {
  if (!window.WF || !window.WF.rootItem) return;

  const detail = e.detail;
  
  switch (detail.type) {
    case 'GET_FIRST_NODE':
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
        console.error('Error getting first node:', error);
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
}); 