/**
 * 节点处理模块 - 负责处理节点和边的样式、状态变化等
 */

// 节点颜色常量
const COLORS = {
  SELECTED_NODE: "#FF5733", // 选中节点颜色
  NEARBY_NODE: "#33FF57",   // 附近节点颜色
  ORIGINAL_NODE: "#66ccff", // 原始节点颜色
  NEARBY_EDGE: "#33FF57",   // 附近边颜色
  ORIGINAL_EDGE: "#848484", // 原始边颜色
  DIMMED_NODE: "#cccccc",   // 暗淡节点颜色
  DIMMED_EDGE: "#dddddd"    // 暗淡边颜色
};

// 存储节点和边的状态
let nodeState = {}; 
let edgeState = {}; 

/**
 * 高亮节点和边
 * @param {Object} graph - graphology图实例
 * @param {Array} nodes - 需要高亮的节点数组
 * @param {Array} edges - 需要高亮的边数组
 */
function highlightNearbyNodes(graph, nodes, edges) {
  // 保存所有节点的原始颜色
  graph.forEachNode((nodeId, attributes) => {
    if (!nodeState[nodeId]) {
      nodeState[nodeId] = {
        originalColor: attributes.color,
        originalSize: attributes.size
      };
    }
    
    // 默认所有节点都变暗淡
    graph.setNodeAttribute(nodeId, "color", COLORS.DIMMED_NODE);
    graph.setNodeAttribute(nodeId, "size", attributes.size * 0.8);
  });
  
  // 保存所有边的原始颜色
  graph.forEachEdge((edgeId, attributes) => {
    if (!edgeState[edgeId]) {
      edgeState[edgeId] = {
        originalColor: attributes.color,
        originalSize: attributes.size
      };
    }
    
    // 默认所有边都变暗淡
    graph.setEdgeAttribute(edgeId, "color", COLORS.DIMMED_EDGE);
    graph.setEdgeAttribute(edgeId, "size", attributes.size * 0.5);
  });
  
  // 创建节点ID集合，用于快速查找
  const nodeIdSet = new Set(nodes.map(node => node.id.toString()));
  
  // 高亮传入的节点
  nodes.forEach(node => {
    const nodeId = node.id.toString();
    
    if (graph.hasNode(nodeId)) {
      // 如果已存在于图中，修改颜色
      graph.setNodeAttribute(nodeId, "color", COLORS.NEARBY_NODE);
      graph.setNodeAttribute(nodeId, "size", (nodeState[nodeId]?.originalSize || 5) * 1.2);
    } else {
      // 如果是新节点，添加到图中
      graph.addNode(nodeId, {
        label: node.label || `Node ${nodeId}`,
        x: node.x,
        y: node.y,
        size: 6,
        color: COLORS.NEARBY_NODE
      });
    }
  });
  
  // 高亮传入的边
  edges.forEach(edge => {
    const source = edge.source.toString();
    const target = edge.target.toString();
    
    // 只处理source和target都在图中的边
    if (graph.hasNode(source) && graph.hasNode(target)) {
      const edgeId = graph.edge(source, target) || `${source}-${target}`;
      
      if (graph.hasEdge(edgeId)) {
        // 如果边已存在，修改颜色
        graph.setEdgeAttribute(edgeId, "color", COLORS.NEARBY_EDGE);
        graph.setEdgeAttribute(edgeId, "size", (edgeState[edgeId]?.originalSize || 1) * 1.5);
      } else {
        // 如果是新边，添加到图中
        try {
          graph.addEdge(source, target, {
            size: 1.5,
            color: COLORS.NEARBY_EDGE
          });
        } catch (e) {
          console.warn("添加边时出错:", e, edge);
        }
      }
    }
  });
}

/**
 * 重置节点和边的颜色
 * @param {Object} graph - graphology图实例
 * @param {Object} renderer - sigma渲染器实例
 */
function resetNodeAndEdgeColors(graph, renderer) {
  // 重置节点颜色
  graph.forEachNode((nodeId, attributes) => {
    if (nodeState[nodeId]) {
      graph.setNodeAttribute(nodeId, "color", nodeState[nodeId].originalColor || COLORS.ORIGINAL_NODE);
      graph.setNodeAttribute(nodeId, "size", nodeState[nodeId].originalSize || 5);
    }
  });
  
  // 重置边颜色
  graph.forEachEdge((edgeId, attributes) => {
    if (edgeState[edgeId]) {
      graph.setEdgeAttribute(edgeId, "color", edgeState[edgeId].originalColor || COLORS.ORIGINAL_EDGE);
      graph.setEdgeAttribute(edgeId, "size", edgeState[edgeId].originalSize || 1);
    }
  });
  
  // 清空状态记录
  nodeState = {};
  edgeState = {};
  
  // 刷新渲染
  renderer.refresh();
}

export { COLORS, highlightNearbyNodes, resetNodeAndEdgeColors }; 