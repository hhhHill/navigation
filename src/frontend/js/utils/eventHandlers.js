/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo } from './uiUtils.js';
import { switchToDetailMode, switchToZoomLevel, toggleAutoZoomMode } from '../renderers/mapRenderer.js';

/**
 * 初始化事件监听器
 * @param {Object} mapData - 包含graph、renderer、container和state的对象
 */
function initEventListeners(mapData) {
  const { graph, renderer, container, state } = mapData;
  
  // 初始化双击处理相关变量
  let lastClickTime = 0;
  const doubleClickDelay = 1000; // 毫秒
  
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
  
  // 滚轮事件（用于缩放检测和模式切换）
  renderer.on("wheelStage", function(event) {
    const camera = renderer.getCamera();
    const ratio = camera.ratio;
    // console.log(`Camera ratio after wheel: ${ratio.toFixed(3)}, currentMode = ${state.currentMode}`);
    
    // 更新缩放比例显示
    if (mapData.scaleInfo) {
      updateScaleInfo(mapData.scaleInfo, ratio);
    }
    
    // 如果启用了自动缩放模式，则根据缩放比例加载相应的聚类数据
    if (state.autoZoom) {
      // 找到最接近的预定义缩放等级
      const closestZoomLevel = findClosestZoomLevel(ratio, state.zoomThresholds);
      
      if (ratio <=0.2) {
        switchToDetailMode(mapData);
      }
      // 如果缩放等级发生变化，切换到相应的聚类视图
      else if (state.currentZoomLevel !== closestZoomLevel) {
        console.log(`缩放等级变化: ${state.currentZoomLevel} -> ${closestZoomLevel}`);
        switchToZoomLevel(closestZoomLevel, mapData);
      }
    }
  });

  
  // 其他事件监听器
  renderer.on("clickStage", function() {
    console.log("clickStage event triggered");
    console.log("Current camera ratio:", renderer.getCamera().ratio);
  });
  
  // 添加摄像机更新事件监听（处理拖动等非滚轮引起的缩放变化）
  renderer.on("cameraUpdated", function({ x, y, ratio }) {
    // 只有在自动缩放模式且非滚轮事件引起的变化才处理
    // 由于wheelStage会在cameraUpdated之前触发，所以这里不会重复处理滚轮事件
    if (state.autoZoom) {
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

/**
 * 初始化视图控制按钮
 * @param {Object} mapData - 包含graph、renderer和state的对象
 */
function initViewControlButtons(mapData) {
  // 详细视图按钮
  const detailButton = document.getElementById('detail-view-button');
  if (detailButton) {
    detailButton.addEventListener('click', () => {
      // 禁用自动缩放模式
      toggleAutoZoomMode(mapData, false);
      // 切换到详细视图
      switchToDetailMode(mapData);
    });
  }
  
  // 自动缩放模式按钮
  const autoZoomButton = document.getElementById('auto-zoom-button');
  if (autoZoomButton) {
    autoZoomButton.addEventListener('click', () => {
      // 切换自动缩放模式状态
      const newState = !mapData.state.autoZoom;
      toggleAutoZoomMode(mapData, newState);
      
      // 更新按钮文本
      autoZoomButton.textContent = newState ? '禁用自动缩放' : '启用自动缩放';
      
      // 如果启用了自动缩放，立即应用当前缩放级别
      if (newState) {
        const ratio = mapData.renderer.getCamera().ratio;
        const closestZoomLevel = findClosestZoomLevel(ratio, mapData.state.zoomThresholds);
        switchToZoomLevel(closestZoomLevel, mapData);
      }
    });
  }
}

export { initEventListeners, handleNearbyNodesRequest, initViewControlButtons }; 