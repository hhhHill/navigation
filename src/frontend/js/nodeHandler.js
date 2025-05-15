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
  
  // 高亮附近节点
  nodes.forEach(node => {
    const nodeId = node.id;
    
    if (graph.hasNode(nodeId)) {
      // 对附近节点应用新颜色和大小
      graph.setNodeAttribute(nodeId, "color", COLORS.NEARBY_NODE);
      graph.setNodeAttribute(nodeId, "size", 5);
      
      // 高亮第一个节点（双击的节点）为特殊颜色
      if (node.id === nodes[0].id) {
        graph.setNodeAttribute(nodeId, "color", COLORS.SELECTED_NODE);
        graph.setNodeAttribute(nodeId, "size", 8);
      }
    }
  });
  
  // 高亮附近边
  edges.forEach(edge => {
    const sourceId = edge.source;
    const targetId = edge.target;
    
    // 尝试查找边
    let graphEdge = null;
    try {
      graphEdge = graph.edge(sourceId, targetId);
    } catch (e) {
      try {
        // 有时边的方向可能反转
        graphEdge = graph.edge(targetId, sourceId);
      } catch (e2) {
        // 边不存在，忽略
        return;
      }
    }
    
    if (graphEdge) {
      // 对附近边应用新颜色和大小
      graph.setEdgeAttribute(graphEdge, "color", COLORS.NEARBY_EDGE);
      graph.setEdgeAttribute(graphEdge, "size", 2);
    }
  });
}

/**
 * 重置节点和边的颜色到原始状态
 * @param {Object} graph - graphology图实例
 * @param {Object} renderer - sigma渲染器实例
 */
function resetNodeAndEdgeColors(graph, renderer) {
  // 重置节点颜色
  graph.forEachNode((nodeId, attributes) => {
    if (nodeState[nodeId]) {
      graph.setNodeAttribute(nodeId, "color", nodeState[nodeId].originalColor || COLORS.ORIGINAL_NODE);
      graph.setNodeAttribute(nodeId, "size", nodeState[nodeId].originalSize || 5);
    } else {
      graph.setNodeAttribute(nodeId, "color", COLORS.ORIGINAL_NODE);
      graph.setNodeAttribute(nodeId, "size", 5);
    }
  });
  
  // 重置边颜色
  graph.forEachEdge((edgeId, attributes) => {
    if (edgeState[edgeId]) {
      graph.setEdgeAttribute(edgeId, "color", edgeState[edgeId].originalColor || COLORS.ORIGINAL_EDGE);
      graph.setEdgeAttribute(edgeId, "size", edgeState[edgeId].originalSize || 1);
    } else {
      graph.setEdgeAttribute(edgeId, "color", COLORS.ORIGINAL_EDGE);
      graph.setEdgeAttribute(edgeId, "size", 1);
    }
  });
  
  renderer.refresh();
}

export { COLORS, highlightNearbyNodes, resetNodeAndEdgeColors }; 