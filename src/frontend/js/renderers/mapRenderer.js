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
  
  // 创建主容器
  const container = document.getElementById("map-container");
  
  // 创建两个嵌套容器用于两个图层
  const clusterContainer = document.createElement("div");
  clusterContainer.id = "cluster-layer";
  clusterContainer.style.position = "absolute";
  clusterContainer.style.width = "100%";
  clusterContainer.style.height = "100%";
  clusterContainer.style.top = "0";
  clusterContainer.style.left = "0";
  clusterContainer.style.zIndex = "1"; // 聚类图层在上方
  clusterContainer.style.pointerEvents = "auto";

  const originalContainer = document.createElement("div");
  originalContainer.id = "original-layer";
  originalContainer.style.position = "absolute";
  originalContainer.style.width = "100%";
  originalContainer.style.height = "100%";
  originalContainer.style.top = "0";
  originalContainer.style.left = "0";
  originalContainer.style.zIndex = "2"; // 原始数据图层在下方
  originalContainer.style.pointerEvents = "auto"

  // 将两个容器添加到主容器中
  container.appendChild(originalContainer);
  container.appendChild(clusterContainer);
  
  // 创建两个graphology图实例
  const clusterGraph = new graphology.Graph();
  const originalGraph = new graphology.Graph();
  
  // 初始化状态
  const state = {
    currentMode: 'zoom',  // 默认为缩放模式，不再使用detail模式
    detailNodes: detailData.nodes,
    detailEdges: detailData.edges,
    // 缩放模式相关状态
    currentZoomLevel: null,
    zoomThresholds: [0.3, 0.5, 1.0],
    zoomData: {}, // 缓存不同缩放等级的数据
  };
  
  // 检查节点数量
  const nodeCount = detailData.nodes.length;
  console.log(`初始化地图，节点数量: ${nodeCount}`);
  
  // 创建聚类图层的Sigma实例
  const clusterRenderer = new Sigma(clusterGraph, clusterContainer, {
    // 渲染设置
    renderEdgeLabels: false,
    minCameraRatio: 0.1,
    maxCameraRatio: 2,
    defaultNodeColor: COLORS.ORIGINAL_NODE,
    defaultEdgeColor: COLORS.ORIGINAL_EDGE,
    // 减小滚轮缩放幅度
    zoomingRatio: 1,
    autoRescale: false, // 默认开启自动调整
  });
  
  // 创建原始数据图层的Sigma实例
  const originalRenderer = new Sigma(originalGraph, originalContainer, {
    // 渲染设置
    renderEdgeLabels: true,
    minCameraRatio: 0.1,
    maxCameraRatio: 2,
    defaultNodeColor: COLORS.ORIGINAL_NODE,
    defaultEdgeColor: COLORS.ORIGINAL_EDGE,
    zoomingRatio: 1,
    autoRescale: false,
    // 边交互设置
    enableEdgeEvents: true,
    enableEdgeClickEvents: true,
    enableEdgeWheelEvents: true,
    enableEdgeHoverEvents: true,
    // 增加边的尺寸，使其更容易被鼠标选中
    edgeMinSize: 5,
    edgeMaxSize: 8,

  });
  
  // 加载原始数据到originalGraph
  console.log("加载原始数据到图层...");
  // 添加节点
  state.detailNodes.forEach(node => {
    originalGraph.addNode(node.id, {
      label: node.label || `Node ${node.id}`,
      x: node.x,
      y: node.y,
      size: 3, // 使用较小的节点大小
      color: node.color || COLORS.ORIGINAL_NODE,
      cluster_id: node.cluster_id,
      original: true
    });
  });
  
  // 添加边
  state.detailEdges.forEach(edge => {
    try {
      
      const source = edge.source !== undefined ? edge.source : edge.from;
      const target = edge.target !== undefined ? edge.target : edge.to;
      
      if (source === undefined || target === undefined) {
        console.warn("跳过边，缺少source或target:", edge);
        return;
      }
      
      originalGraph.addEdge(source, target, {
        size:  3,
        color: edge.color || COLORS.ORIGINAL_EDGE
      });
    } catch (e) {
      console.error("添加边时出错:", e, edge);
    }
  });
  
  console.log(`原始数据图层已加载 ${state.detailNodes.length} 个节点和 ${state.detailEdges.length} 条边`);
  
  // 获取渲染容器并添加事件监听器以阻止平移
  
  

 
  
  // 包装返回对象
  const mapData = {
    clusterGraph,
    originalGraph,
    clusterRenderer,
    originalRenderer,
    container,
    state
  };
  
  // 设置初始缩放比例并立即加载聚类视图
  console.log("初始化自动缩放模式，设置初始缩放比例为0.2并加载聚类视图");
  // 设置相机缩放比例为0.2
  clusterRenderer.getCamera().ratio = 0.2;
  originalRenderer.getCamera().ratio = 0.2;
  
  // 初始化后立即加载聚类视图
  setTimeout(() => {
    const closestZoomLevel = findClosestZoomLevel(0.2, state.zoomThresholds);
    switchToZoomLevel(closestZoomLevel, mapData);
  }, 100);
  
  console.timeEnd('总渲染时间');
  console.log("地图渲染完成");
  
  return mapData;
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
  const { clusterGraph, clusterRenderer, state } = mapData;
  
  // 初始化正在获取数据的标记对象
  if (!state.ongoingFetches) {
    state.ongoingFetches = {};
  }
  
  // 如果已经在获取该缩放等级的数据，直接返回
  if (state.ongoingFetches[zoomLevel]) {
    console.log(`缩放等级 ${zoomLevel} 的数据正在获取中，跳过重复请求。`);
    return;
  }
  
  try {
    console.time(`切换到缩放等级 ${zoomLevel}`);

    
    // 检查缓存中是否已有该等级的数据
    if (!state.zoomData[zoomLevel]) {
      console.log(`缓存中没有缩放等级 ${zoomLevel} 的数据，正在获取...`);
      
      // 显示加载指示器
      document.getElementById("loading-indicator")?.classList.remove("hidden");
      
      // 标记该缩放等级数据正在获取中
      state.ongoingFetches[zoomLevel] = true;
      
      // 获取该缩放等级的聚类数据
      const clusterData = await fetchZoomClusterData(zoomLevel);
      
      // 将数据存入缓存
      state.zoomData[zoomLevel] = clusterData;
      
      // 隐藏加载指示器
      document.getElementById("loading-indicator")?.classList.add("hidden");
    }
    
    // 渲染该缩放等级的视图
    renderZoomView(clusterGraph, state, zoomLevel, state.zoomData[zoomLevel]);
    
    // 刷新视图
    clusterRenderer.refresh();
    
    
    console.log(`已切换到缩放等级 ${zoomLevel}，显示 ${state.zoomData[zoomLevel].nodes.length} 个聚类节点`);
  } catch (error) {
    console.error(`切换到缩放等级 ${zoomLevel} 失败:`, error);
    document.getElementById("loading-indicator")?.classList.add("hidden");
    
    // 出错时尝试切换到不同的缩放级别
    if (state.zoomThresholds.includes(zoomLevel)) {
      const fallbackLevel = state.zoomThresholds.find(level => level !== zoomLevel);
      if (fallbackLevel && state.zoomData[fallbackLevel]) {
        console.log(`尝试切换到备用缩放等级 ${fallbackLevel}`);
        renderZoomView(clusterGraph, state, fallbackLevel, state.zoomData[fallbackLevel]);
        clusterRenderer.refresh();
      }
    }
  }
  finally {
    // 无论成功或失败，都移除正在获取的标记
    if (state.ongoingFetches) {
      delete state.ongoingFetches[zoomLevel];
    }
    console.timeEnd(`切换到缩放等级 ${zoomLevel}`);
  }
}



export { 
  initMapRender,
  switchToZoomLevel,
}; 