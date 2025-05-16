/**
 * 地图渲染模块 - 负责处理地图渲染和视图切换
 */
import { COLORS } from '../utils/nodeHandler.js';

/**
 * 初始化地图渲染
 * @param {Object} data - 包含detailData和overviewData的对象
 * @returns {Object} - 包含graph、renderer、container等属性的对象
 */
function initMapRender(data) {
  const { detailData, overviewData } = data;
  console.time('总渲染时间');
  
  // 创建一个container容器
  const container = document.getElementById("map-container");
  
  // 创建graphology图实例
  const graph = new graphology.Graph();
  
  // 初始化状态
  const state = {
    currentMode: 'detail',
    detailNodes: detailData.nodes,
    detailEdges: detailData.edges,
    overviewNodes: overviewData.nodes,
    overviewEdges: overviewData.edges
  };
  
  // 初始渲染详细视图
  renderDetailView(graph, state);
  
  // 创建Sigma实例
  const renderer = new Sigma(graph, container, {
    // 渲染设置
    renderEdgeLabels: false,
    minCameraRatio: 0.2,
    maxCameraRatio: 5,
    defaultNodeColor: COLORS.ORIGINAL_NODE,
    defaultEdgeColor: COLORS.ORIGINAL_EDGE
  });
  
  console.timeEnd('总渲染时间');
  console.log("地图渲染完成");
  
  return {
    graph,
    renderer,
    container,
    state
  };
}

/**
 * 渲染详细视图
 * @param {Object} graph - graphology图实例
 * @param {Object} state - 当前状态对象
 */
function renderDetailView(graph, state) {
  // 清空图
  graph.clear();
  
  // 添加详细节点
  state.detailNodes.forEach(node => {
    graph.addNode(node.id, {
      label: node.label || `Node ${node.id}`,
      x: node.x,
      y: node.y,
      size: 5,
      color: COLORS.ORIGINAL_NODE
    });
  });
  
  // 添加详细边
  state.detailEdges.forEach(edge => {
    try {
      const source = edge.source !== undefined ? edge.source : edge.from;
      const target = edge.target !== undefined ? edge.target : edge.to;
      
      if (source === undefined || target === undefined) {
        console.warn("跳过边，缺少source或target:", edge);
        return;
      }
      
      graph.addEdge(source, target, {
        size: 1,
        color: COLORS.ORIGINAL_EDGE
      });
    } catch (e) {
      console.error("添加边时出错:", e, edge);
    }
  });
  
  state.currentMode = 'detail';
}

/**
 * 渲染概览视图
 * @param {Object} graph - graphology图实例
 * @param {Object} state - 当前状态对象
 */
function renderOverviewView(graph, state) {
  // 清空图
  graph.clear();
  
  // 添加概览节点
  state.overviewNodes.forEach(node => {
    graph.addNode(node.id, {
      label: node.label || `Cluster ${node.id}`,
      x: node.x,
      y: node.y,
      size: 5,
      color: COLORS.ORIGINAL_NODE
    });
  });
  
  // 添加概览边
  state.overviewEdges.forEach(edge => {
    try {
      const source = edge.source !== undefined ? edge.source : edge.from;
      const target = edge.target !== undefined ? edge.target : edge.to;
      
      if (source === undefined || target === undefined) {
        console.warn("跳过边，缺少source或target:", edge);
        return;
      }
      
      graph.addEdge(source, target, {
        size: edge.size || 0.1,
        color: edge.color || COLORS.ORIGINAL_EDGE
      });
    } catch (e) {
      console.error("添加边时出错:", e, edge);
    }
  });
  
  state.currentMode = 'overview';
}

/**
 * 切换到概览模式
 * @param {Object} mapData - 包含graph、renderer和state的对象
 */
function switchToOverviewMode(mapData) {
  console.time('切换到概览模式');
  
  const { graph, renderer, state } = mapData;
  renderOverviewView(graph, state);
  
  renderer.refresh();
  console.timeEnd('切换到概览模式');
  console.log('已切换到概览模式，显示集群节点');
}

/**
 * 切换到详细模式
 * @param {Object} mapData - 包含graph、renderer和state的对象
 */
function switchToDetailMode(mapData) {
  console.time('切换到详细模式');
  
  const { graph, renderer, state } = mapData;
  renderDetailView(graph, state);
  
  renderer.refresh();
  console.timeEnd('切换到详细模式');
  console.log('已切换到详细模式，显示所有节点');
}

export { 
  initMapRender,
  switchToOverviewMode,
  switchToDetailMode
}; 