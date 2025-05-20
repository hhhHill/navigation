/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo } from './uiUtils.js';
import { switchToZoomLevel} from '../renderers/mapRenderer.js';

/**
 * 初始化事件监听器
 * @param {Object} mapData - 包含clusterGraph、originalGraph、clusterRenderer、originalRenderer、container和state的对象
 */
function initEventListeners(mapData) {
  const { clusterGraph, originalGraph, clusterRenderer, originalRenderer, container, state } = mapData;
  
  // 初始化双击处理相关变量
  let lastClickTime = 0;
  const doubleClickDelay = 1000; // 毫秒

  // 点击节点事件（用于双击检测）
  clusterRenderer.on("clickNode", function(event) {
    const nodeId = event.node;
    const currentTime = new Date().getTime();
    
    // 双击检测
    if (currentTime - lastClickTime < doubleClickDelay) {
      console.log("集群图层节点双击事件:", nodeId);
      
      // 获取节点的坐标信息
      const nodeAttributes = clusterGraph.getNodeAttributes(nodeId);
      const x = nodeAttributes.x;
      const y = nodeAttributes.y;
      
      // 获取附近节点
      handleNearbyNodesRequest(x, y, 100, mapData);
    }
    
    lastClickTime = currentTime;
  });

  originalRenderer.on("clickNode", function(event) {
    const nodeId = event.node;
    const currentTime = new Date().getTime();
    
    // 双击检测
    if (currentTime - lastClickTime < doubleClickDelay) {
      console.log("原始图层节点双击事件:", nodeId);
      
      // 获取节点的坐标信息
      const nodeAttributes = originalGraph.getNodeAttributes(nodeId);
      const x = nodeAttributes.x;
      const y = nodeAttributes.y;
      
      // 获取附近节点
      handleNearbyNodesRequest(x, y, 100, mapData);
    }
    
    lastClickTime = currentTime;
  });

  clusterRenderer.on("doubleClickStage", function(event) {
    console.log("双击舞台事件触发");
    clusterRenderer.getCamera().animatedReset();
    // 原始数据图层也需要重置
    originalRenderer.getCamera().animatedReset();
    console.log("重置成功");
    // 尝试阻止默认缩放行为，但这可能不一定有效，取决于Sigma.js的内部实现
    event.preventDefault();
    event.stopPropagation();
  });
  
  // 保存最后一次相机状态（用于轮询检测）
  state.lastPolledCameraState = clusterRenderer.getCamera().getState();
  
  // 标记是否已添加平移限制
  state.hasPanLimitation = false;
  
  // 创建命名的事件处理函数，以便之后可以移除
  const mousedownHandler = function(e) {
    if (e.button === 0) { // 确保只阻止左键拖动
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  const touchstartHandler = function(e) {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const mousemoveHandler = function(e) {
    if (e.buttons === 1) { // 如果左键按下并移动
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  const touchmoveHandler = function(e) {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // 保存事件处理函数引用
  state.panLimitHandlers = {
    mousedownHandler,
    touchstartHandler,
    mousemoveHandler,
    touchmoveHandler
  };
  
  // 设置定时器，定期检查相机状态（替代wheelStage和wheelNode事件）
  if (state.cameraPollingInterval) {
    clearInterval(state.cameraPollingInterval);
  }
  
  state.cameraPollingInterval = setInterval(function() {
    const currentState = clusterRenderer.getCamera().getState();
    const lastState = state.lastPolledCameraState;
    
    // 检查缩放比例，判断是否需要限制平移
    if (currentState.ratio < 1) {
      if (state.hasPanLimitation) {
        console.log("重新启用平移功能");
        const clusterDomElement = clusterRenderer.getContainer();
        
        // 移除之前添加的事件监听器
        clusterDomElement.removeEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
        clusterDomElement.removeEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
        clusterDomElement.removeEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
        clusterDomElement.removeEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
        
        state.hasPanLimitation = false;
      }
    }
    if (currentState.ratio >= 1 && !state.hasPanLimitation) {
      // 阻止鼠标和触摸事件导致的平移
      console.log("阻止鼠标和触摸事件导致的平移");
      const clusterDomElement = clusterRenderer.getContainer();
      
      clusterDomElement.addEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
      clusterDomElement.addEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
      clusterDomElement.addEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
      clusterDomElement.addEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
      
      state.hasPanLimitation = true;
    }
    
    // console.log(`轮询检测 - 相机状态变化：ratio: ${currentState.ratio.toFixed(3)}`);
    
    // 同步原始图层相机状态
    const originalCamera = originalRenderer.getCamera();
    originalCamera.x = currentState.x;
    originalCamera.y = currentState.y;
    originalCamera.ratio = currentState.ratio;
    originalRenderer.refresh(); // 刷新原始图层
    // console.log("原始图层刷新成功");
    
    // 更新缩放比例显示
    if (mapData.scaleInfo) {
      updateScaleInfo(mapData.scaleInfo, currentState.ratio);
    }
    
    // 找到最接近的预定义缩放等级
    const closestZoomLevel = findClosestZoomLevel(currentState.ratio, state.zoomThresholds);
    
    // 如果缩放等级发生变化，切换到相应的聚类视图
    if (state.currentZoomLevel !== closestZoomLevel) {
      // console.log(`轮询检测: 缩放等级变化 ${state.currentZoomLevel} -> ${closestZoomLevel}`);
      switchToZoomLevel(closestZoomLevel, mapData);
    }
    
    // 更新最后检测到的相机状态
    state.lastPolledCameraState = {...currentState};
    
  }, 100); // 每100ms检查一次
  
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
  const { clusterGraph, originalGraph, clusterRenderer, originalRenderer, container } = mapData;
  console.log(`获取坐标(${x}, ${y})附近的${count}个节点`);
  
  // 显示加载提示
  showLoadingMessage(container, '加载附近节点...');
  
  try {
    // 获取附近节点数据
    const data = await fetchNearbyNodesData(x, y, count);
    console.log(`获取到${data.nodes.length}个附近节点和${data.edges.length}条边`);
    
    // 清除之前的高亮状态
    resetNodeAndEdgeColors(clusterGraph, clusterRenderer);
    // 同时清除原始图层的高亮状态
    // resetNodeAndEdgeColors(originalGraph, originalRenderer);
    
    // 在两个图层上都高亮显示双击的节点和附近节点及边
    highlightNearbyNodes(clusterGraph, data.nodes, data.edges);
    // highlightNearbyNodes(originalGraph, data.nodes, data.edges);
    
    clusterRenderer.refresh();
    originalRenderer.refresh();
    
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