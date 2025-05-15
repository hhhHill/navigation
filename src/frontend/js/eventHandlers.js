/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from './apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo } from './uiUtils.js';
import { switchToOverviewMode, switchToDetailMode } from './mapRenderer.js';

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
    console.log(`Camera ratio after wheel: ${ratio.toFixed(3)}, currentMode = ${state.currentMode}`);
    
    // 更新缩放比例显示
    if (mapData.scaleInfo) {
      updateScaleInfo(mapData.scaleInfo, ratio);
    }
    
    // 根据缩放级别切换显示模式
    const ZOOM_OUT_THRESHOLD_RATIO = 1.6;

    if (ratio >= ZOOM_OUT_THRESHOLD_RATIO && state.currentMode === 'detail') {
      console.log(`切换条件满足: ratio (${ratio.toFixed(3)}) >= ${ZOOM_OUT_THRESHOLD_RATIO} AND currentMode is 'detail'`);
      switchToOverviewMode(mapData);
    } else if (ratio < ZOOM_OUT_THRESHOLD_RATIO && state.currentMode === 'overview') {
      console.log(`切换条件满足: ratio (${ratio.toFixed(3)}) < ${ZOOM_OUT_THRESHOLD_RATIO} AND currentMode is 'overview'`);
      switchToDetailMode(mapData);
    }
  });
  
  // 其他事件监听器
  renderer.on("clickStage", function() {
    console.log("clickStage event triggered");
    console.log("Current camera ratio:", renderer.getCamera().ratio);
  });
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