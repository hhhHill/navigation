/**
 * 地图渲染模块 - 负责处理地图渲染和视图切换
 */
import { COLORS } from '../utils/nodeHandler.js';
import { fetchZoomClusterData } from '../api/apiService.js';

/**
 * 初始化地图渲染
 * @param {Object} data - 包含detailData的对象
 * @returns {Object} - 包含graph、renderer、container等属性的对象
 */
function initMapRender(data) {
  const { detailData } = data;
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
    // 缩放模式相关状态
    currentZoomLevel: null,
    zoomThresholds: [0.3,0.5, 1.0],
    zoomData: {}, // 缓存不同缩放等级的数据
    autoZoom: true // 是否启用自动缩放模式
  };
  
  // 初始渲染详细视图
  renderDetailView(graph, state);
  
  // 创建Sigma实例
  const renderer = new Sigma(graph, container, {
    // 渲染设置
    renderEdgeLabels: false,
    minCameraRatio: 0.1,
    maxCameraRatio: 2,
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
 * 找到最接近的预定义缩放等级
 * @param {number} currentZoom - 当前缩放值
 * @param {Array} thresholds - 预定义的缩放等级数组
 * @return {number} 最接近的缩放等级
 */
function findClosestZoomLevel(currentZoom, thresholds) {
  let closestZoom = thresholds[0];
  let minDiff = Math.abs(currentZoom - thresholds[0]);
  
  for (let i = 1; i < thresholds.length; i++) {
    const diff = Math.abs(currentZoom - thresholds[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestZoom = thresholds[i];
    }
  }
  
  return closestZoom;
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
      size: 2,
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
  state.currentZoomLevel = null; // 重置缩放等级
}

/**
 * 根据缩放等级渲染视图
 * @param {Object} graph - graphology图实例
 * @param {Object} state - 当前状态对象
 * @param {number} zoomLevel - 缩放等级
 * @param {Object} zoomData - 该缩放等级对应的节点和边数据
 */
function renderZoomView(graph, state, zoomLevel, zoomData) {
  console.time(`渲染缩放等级 ${zoomLevel} 视图`);
  
  // 清空图
  graph.clear();
  
  // 根据缩放等级确定节点大小
  // 缩放等级越大（视图越远），节点越大，以保证可见性
  let nodeSize;
  if (zoomLevel <= 0.2) {
    nodeSize = 2;  // 最近距离，使用较小的节点
  } else if (zoomLevel <= 0.5) {
    nodeSize = 5;
  } else if (zoomLevel <= 1.0) {
    nodeSize = 12;
  } else if (zoomLevel <= 2.0) {
    nodeSize = 15;
  } else {
    nodeSize = 20;  // 最远距离，使用较大的节点
  }
  
  // 噪声点的大小稍小于集群点
  const noiseNodeSize = Math.max(3, nodeSize - 2);
  
  // 添加节点
  zoomData.nodes.forEach(node => {
    // 使用固定大小，不再基于集群点数量
    const size = node.is_noise ? noiseNodeSize : nodeSize;
    const label = node.label || (node.is_noise ? `Node ${node.id}` : `Cluster ${node.cluster_id}`);
    
    graph.addNode(node.id, {
      label: label,
      x: node.x,
      y: node.y,
      size: size,
      color: node.is_noise ? COLORS.NOISE_NODE : COLORS.CLUSTER_NODE,
      cluster_id: node.cluster_id,
      is_noise: node.is_noise,
      cluster_size: node.cluster_size
    });
  });
  
  // 添加边
  zoomData.edges.forEach(edge => {
    try {
      const source = edge.source !== undefined ? edge.source : edge.from;
      const target = edge.target !== undefined ? edge.target : edge.to;
      
      if (source === undefined || target === undefined) {
        console.warn("跳过边，缺少source或target:", edge);
        return;
      }
      
      graph.addEdge(source, target, {
        size: edge.size || 0.5,
        color: edge.color || COLORS.CLUSTER_EDGE
      });
    } catch (e) {
      console.error("添加边时出错:", e, edge);
    }
  });
  
  state.currentMode = 'zoom';
  state.currentZoomLevel = zoomLevel;
  
  console.timeEnd(`渲染缩放等级 ${zoomLevel} 视图`);
}

/**
 * 切换到指定缩放等级
 * @param {number} zoomLevel - 要切换到的缩放等级
 * @param {Object} mapData - 包含graph、renderer和state的对象
 */
async function switchToZoomLevel(zoomLevel, mapData) {
  const { graph, renderer, state } = mapData;
  
  try {
    console.time(`切换到缩放等级 ${zoomLevel}`);
    
    // 检查缓存中是否已有该等级的数据
    if (!state.zoomData[zoomLevel]) {
      console.log(`缓存中没有缩放等级 ${zoomLevel} 的数据，正在获取...`);
      
      // 显示加载指示器
      document.getElementById("loading-indicator")?.classList.remove("hidden");
      
      // 获取该缩放等级的聚类数据
      const clusterData = await fetchZoomClusterData(zoomLevel);
      
      // 将数据存入缓存
      state.zoomData[zoomLevel] = clusterData;
      
      // 隐藏加载指示器
      document.getElementById("loading-indicator")?.classList.add("hidden");
    }
    
    // 渲染该缩放等级的视图
    renderZoomView(graph, state, zoomLevel, state.zoomData[zoomLevel]);
    
    // 刷新视图
    renderer.refresh();
    
    console.timeEnd(`切换到缩放等级 ${zoomLevel}`);
    console.log(`已切换到缩放等级 ${zoomLevel}，显示 ${state.zoomData[zoomLevel].nodes.length} 个节点`);
  } catch (error) {
    console.error(`切换到缩放等级 ${zoomLevel} 失败:`, error);
    document.getElementById("loading-indicator")?.classList.add("hidden");
    
    // 出错时回退到详细视图
    if (state.currentMode !== 'detail') {
      renderDetailView(graph, state);
      renderer.refresh();
    }
  }
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

/**
 * 切换自动缩放模式
 * @param {Object} mapData - 包含graph、renderer和state的对象
 * @param {boolean} enable - 是否启用自动缩放模式
 */
function toggleAutoZoomMode(mapData, enable) {
  const { state, renderer } = mapData;
  state.autoZoom = enable;
  
  console.log(`自动缩放模式已${enable ? '启用' : '禁用'}`);
  
  // 如果启用，立即根据当前缩放级别更新视图
  if (enable) {
    const currentZoom = renderer.getCamera().ratio;
    const closestZoomLevel = findClosestZoomLevel(currentZoom, state.zoomThresholds);
    switchToZoomLevel(closestZoomLevel, mapData);
  }
}

export { 
  initMapRender,
  switchToDetailMode,
  switchToZoomLevel,
  toggleAutoZoomMode
}; 