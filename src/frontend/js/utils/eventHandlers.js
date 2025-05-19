/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo } from './uiUtils.js';
import { switchToZoomLevel} from '../renderers/mapRenderer.js';

/**
 * 初始化事件监听器
 * @param {Object} mapData - 包含graph、renderer、container和state的对象
 */
function initEventListeners(mapData) {
  const { graph, renderer, container, state } = mapData;
  
  // 初始化双击处理相关变量
  let lastClickTime = 0;
  const doubleClickDelay = 1000; // 毫秒
  
  // 禁用相机平移功能
  renderer.getCamera().enabledPanning = false;
  
  // 点击节点事件（用于双击检测）
  renderer.on("clickNode", function(event) {
    const nodeId = event.node;
    const currentTime = new Date().getTime();
    
    // 双击检测
    if (currentTime - lastClickTime < doubleClickDelay) {
      console.log("节点双击事件:", nodeId);
      
      // 获取节点的坐标信息
      const nodeAttributes = graph.getNodeAttributes(nodeId);
      const x = nodeAttributes.x;
      const y = nodeAttributes.y;
      
      // 获取附近节点
      handleNearbyNodesRequest(x, y, 100, mapData);
    }
    
    lastClickTime = currentTime;
  });
  
  // 处理缩放和视图切换的函数
  const handleZoomChange = (ratio) => {
    // 更新缩放比例显示
    if (mapData.scaleInfo) {
      updateScaleInfo(mapData.scaleInfo, ratio);
    }
    
    // 特定缩放比例下的额外处理：当缩放非常远时，重置视图
    if (ratio == 2) {
      renderer.getCamera().animatedReset();
      console.log("重置成功");
      // 在重置视图后，不再执行基于缩放等级的视图切换
      state.currentZoomLevel = null; // 可选：重置当前缩放等级状态，防止后续小的缩放变化再次触发切换
      return; // 直接返回，跳过后续的视图切换逻辑
    }
    
    // 始终使用自动缩放模式，根据缩放比例加载相应的聚类数据
    // 找到最接近的预定义缩放等级
    const closestZoomLevel = findClosestZoomLevel(ratio, state.zoomThresholds);
    
    // 如果缩放等级发生变化，切换视图
    if (state.currentZoomLevel !== closestZoomLevel) {
      console.log(`缩放等级变化: ${state.currentZoomLevel} -> ${closestZoomLevel}`);
      switchToZoomLevel(closestZoomLevel, mapData);
    }
  };
  
  renderer.on("doubleClickStage", function(event) {
    console.log("双击舞台事件触发");
    renderer.getCamera().animatedReset();
    console.log("重置成功");
          // 尝试阻止默认缩放行为，但这可能不一定有效，取决于Sigma.js的内部实现
      event.preventDefault();
      event.stopPropagation();
  });
  // 滚轮事件（用于缩放检测和模式切换）- 在空白区域
  renderer.on("wheelStage", function(event) {
    const camera = renderer.getCamera();
    const ratio = camera.ratio;
    console.log(`Stage wheel event - Camera ratio: ${ratio.toFixed(3)}`);
    
    handleZoomChange(ratio);
  });
  
  // 滚轮事件 - 在节点上
  renderer.on("wheelNode", function(event) {
    const camera = renderer.getCamera();
    const ratio = camera.ratio;
    console.log(`Node wheel event - Camera ratio: ${ratio.toFixed(3)}, node: ${event.node}`);
    
    // 阻止事件冒泡，确保不会同时触发wheelStage
    event.preventSigmaDefault();
    
    handleZoomChange(ratio);
  });
  
  // 其他事件监听器
  renderer.on("clickStage", function() {
    console.log("clickStage event triggered");
    console.log("Current camera ratio:", renderer.getCamera().ratio);
  });
  
  // 添加摄像机更新事件监听（处理拖动等非滚轮引起的缩放变化）
  renderer.on("cameraUpdated", function({ x, y, ratio }) {
    // 由于自动缩放模式始终启用，处理所有相机更新事件
    // 防抖动：当相机位置变化很小时，不触发视图更新
    if (state.lastCameraRatio && Math.abs(state.lastCameraRatio - ratio) < 0.01) {
      return;
    }
    
    // 记录当前相机位置
    state.lastCameraRatio = ratio;
    
    // 找到最接近的预定义缩放等级
    const closestZoomLevel = findClosestZoomLevel(ratio, state.zoomThresholds);
    
    // 如果缩放等级发生变化，切换到相应的聚类视图
    if (state.currentZoomLevel !== closestZoomLevel) {
      console.log(`相机更新事件: 缩放等级变化 ${state.currentZoomLevel} -> ${closestZoomLevel}`);
      switchToZoomLevel(closestZoomLevel, mapData);
    }
  });
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
 * 处理获取附近节点的请求
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @param {number} count - 获取节点数量
 * @param {Object} mapData - 包含图形、渲染器等数据的对象
 */
async function handleNearbyNodesRequest(x, y, count, mapData) {
  const { graph, renderer, container } = mapData;
  console.log(`获取坐标(${x}, ${y})附近的${count}个节点`);
  
  // 显示加载提示
  showLoadingMessage(container, '加载附近节点...');
  
  try {
    // 获取附近节点数据
    const data = await fetchNearbyNodesData(x, y, count);
    console.log(`获取到${data.nodes.length}个附近节点和${data.edges.length}条边`);
    
    // 清除之前的高亮状态
    resetNodeAndEdgeColors(graph, renderer);
    
    // 高亮双击的节点和附近节点及边
    highlightNearbyNodes(graph, data.nodes, data.edges);
    renderer.refresh();
    
    // 移除加载提示
    removeElement('loading-nearby');
    
    // 显示结果提示
    showResultMessage(container, `显示附近${data.nodes.length}个节点和${data.edges.length}条边`);
    
  } catch (error) {
    console.error('获取附近节点失败:', error);
    
    // 移除加载提示
    removeElement('loading-nearby');
    
    // 显示错误提示
    showErrorMessage(container, `获取附近节点失败: ${error.message}`);
  }
}


export { initEventListeners, handleNearbyNodesRequest }; 