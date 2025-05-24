/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo, addConsoleMessage } from './uiUtils.js';
import { switchToZoomLevel} from '../renderers/mapRenderer.js';

/**
 * 初始化事件监听器
 * @param {Object} mapData - 包含clusterGraph、originalGraph、clusterRenderer、originalRenderer、container和state的对象
 */
function initEventListeners(mapData) {
  const { clusterGraph, originalGraph, clusterRenderer, originalRenderer, container, state } = mapData;
  
  // 保存地图数据的全局引用
  window.mapData = mapData;
  
  // 初始化地图实况查看开关状态
  state.mapLiveActive = false;
  
  // 添加初始全屏遮罩
  const originalLayer = document.getElementById("original-layer");
  if (originalLayer) {
    // 初始时完全遮蔽原始图层(完全透明)
    const initialMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 100%)`;
    originalLayer.style.webkitMask = initialMaskStyle;
    originalLayer.style.mask = initialMaskStyle;
    console.log("初始化遮罩已应用，完全透明");
  }
  
  // 初始化可调整分隔条
  initResizers();
  

  // 绑定查看地图实况按钮事件
  const mapLiveBtn = document.getElementById("mapLive");
  if (mapLiveBtn) {
    mapLiveBtn.addEventListener('click', function() {
      state.mapLiveActive = !state.mapLiveActive;
      
      if (state.mapLiveActive) {
        // 激活状态：原始图层部分可见
        const activeMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 100%)`;
        originalLayer.style.webkitMask = activeMaskStyle;
        originalLayer.style.mask = activeMaskStyle;
        mapLiveBtn.classList.add('active');
        mapLiveBtn.textContent = '关闭地图实况';
        console.log("地图实况查看已启用");
        
        // 添加到控制台
        addConsoleMessage("地图实况查看已启用");
      } else {
        // 关闭状态：原始图层完全透明
        const inactiveMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 100%)`;
        originalLayer.style.webkitMask = inactiveMaskStyle;
        originalLayer.style.mask = inactiveMaskStyle;
        mapLiveBtn.classList.remove('active');
        mapLiveBtn.textContent = '查看地图实况';
        console.log("地图实况查看已禁用");
        
        // 添加到控制台
        addConsoleMessage("地图实况查看已禁用");
      }
    });
  }
  
  // 绑定控制台清空按钮事件
  const clearConsoleBtn = document.getElementById("clearConsole");
  if (clearConsoleBtn) {
    clearConsoleBtn.addEventListener('click', function() {
      const consoleOutput = document.getElementById("consoleOutput");
      if (consoleOutput) {
        consoleOutput.innerHTML = '';
        addConsoleMessage("控制台已清空");
      }
    });
  }
  
  // 保存鼠标移动事件处理函数引用，便于后期解绑或重绑定
  const mouseMoveHandler = function(e) {
    // console.log("mouseMoveHandler 触发"); // 添加日志
    // 只有在地图实况激活时才响应鼠标移动事件
    if (state.mapLiveActive) {
      const rect = this.getBoundingClientRect();
      state.currentMousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // 在鼠标移动时更新遮罩
      const centerX = state.currentMousePosition.x;
      const centerY = state.currentMousePosition.y;
      const maskRadius = 30/(originalRenderer.getCamera().getState().ratio); // 使用固定值
      
      // 应用径向渐变遮罩
      const maskStyle = 
        `radial-gradient(circle at ${centerX}px ${centerY}px, 
         rgba(0,0,0,1) 0px, rgba(0,0,0,1) ${maskRadius}px,
         rgba(0,0,0,0.2) ${maskRadius + 1}px, rgba(0,0,0,0.2) 100%)`;
      
      this.style.webkitMask = maskStyle;
      this.style.mask = maskStyle;
    }
  };
  
  // 保存鼠标离开事件处理函数引用
  const mouseLeaveHandler = function() {
    // 只有在地图实况激活时才响应鼠标离开事件
    if (state.mapLiveActive) {
      // 恢复全屏遮蔽，但保留0.2可见度
      const fullMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 100%)`;
      this.style.webkitMask = fullMaskStyle;
      this.style.mask = fullMaskStyle;
      console.log("鼠标离开图层，恢复遮蔽状态");
    }
  };
  
  // 添加鼠标移动和离开事件监听
  state.currentMousePosition = { x: 0, y: 0 };
  document.getElementById("original-layer").addEventListener('mousemove', mouseMoveHandler);
  document.getElementById("original-layer").addEventListener('mouseleave', mouseLeaveHandler);
  
  // 初始化双击处理相关变量
  let lastClickTime = 0;
  const doubleClickDelay = 1000; // 毫秒

  // 点击节点事件（用于双击检测）
  clusterRenderer.on("clickNode", function(event) {
    const nodeId = event.node;
    const currentTime = new Date().getTime();
    
    // 双击检测
    if (currentTime - lastClickTime < doubleClickDelay) {
      console.log("节点双击事件:", nodeId);
      
      // 获取节点的坐标信息
      const nodeAttributes = clusterGraph.getNodeAttributes(nodeId);
      const x = nodeAttributes.x;
      const y = nodeAttributes.y;
      
      // 获取附近节点
      handleNearbyNodesRequest(x, y, 100, mapData);
    }
    
    lastClickTime = currentTime;
  });

  // 保存边的原始颜色
  state.originalEdgeColors = {};

  // // 边事件处理
  // originalRenderer.on("enterEdge", ({ edge }) => {
  //   // console.log("进入边事件触发:", edge);
    
  //   // 存储原始颜色（如果尚未存储）
  //   if (!state.originalEdgeColors[edge]) {
  //     state.originalEdgeColors[edge] = originalGraph.getEdgeAttribute(edge, "color") || COLORS.ORIGINAL_EDGE;
  //   }
    
  //   // 改变边的颜色为高亮色并完全不透明
  //   originalGraph.setEdgeAttribute(edge, "color", "rgb(0, 72, 255)"); // 纯红色，完全不透明
  //   originalGraph.setEdgeAttribute(edge, "size", 12); // 增加边的大小使其更明显
  //   originalGraph.setEdgeAttribute(edge, "zIndex", 20); // 设置非常高的z-index确保在最上层
  //   originalRenderer.refresh();
  // });

  // originalRenderer.on("leaveEdge", ({ edge }) => {
  //   // console.log("离开边事件触发:", edge);
    
  //   // 恢复边的原始颜色
  //   if (state.originalEdgeColors[edge]) {
  //     originalGraph.setEdgeAttribute(edge, "color", state.originalEdgeColors[edge]);
  //     originalGraph.setEdgeAttribute(edge, "size", 3);
  //     originalGraph.setEdgeAttribute(edge, "zIndex", 0); // 恢复默认zIndex
  //     originalRenderer.refresh();
  //   }
  // });

  // 添加边点击事件
  originalRenderer.on("clickEdge", ({ edge }) => {
    console.log("边被点击:", edge);
    
    // 闪烁效果显示边被点击
    const originalColor = originalGraph.getEdgeAttribute(edge, "color");
    originalGraph.setEdgeAttribute(edge, "color", "#00ff00");
    originalRenderer.refresh();
    
    setTimeout(() => {
      originalGraph.setEdgeAttribute(edge, "color", originalColor);
      originalRenderer.refresh();
    }, 500);
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

  // 修改双击舞台事件，确保先重置原始图层相机，然后相机同步会自动处理集群图层的重置
  originalRenderer.on("doubleClickStage", function(event) {
    console.log("双击舞台事件触发");
    // 首先重置原始图层相机
    originalRenderer.getCamera().animatedReset();
    // 不再需要单独重置集群图层，因为相机同步逻辑会自动处理
    console.log("重置成功");
    // 尝试阻止默认缩放行为
    event.preventDefault();
    event.stopPropagation();
  });
  
  // 初始化相机状态，保存引用
  state.lastCameraState = originalRenderer.getCamera().getState();
  
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
  
  // 移除现有轮询间隔（如果有）
  if (state.cameraPollingInterval) {
    clearInterval(state.cameraPollingInterval);
    state.cameraPollingInterval = null;
  }
  
  // 替代轮询的相机状态监视函数
  function handleCameraStateChange(newState) {
    // 验证相机状态有效性
    if (!newState || typeof newState !== 'object') {
      console.warn("收到无效的相机状态", newState);
      return;
    }
    
    try {
      // 处理缩放比例变化，判断是否需要限制平移
      if (newState.ratio < 1) {
        if (state.hasPanLimitation) {
          console.log("重新启用平移功能");
          
          const originalDomElement = originalRenderer.getContainer();
          // 移除之前添加的事件监听器
          originalDomElement.removeEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
          originalDomElement.removeEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
          originalDomElement.removeEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
          originalDomElement.removeEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
          
          state.hasPanLimitation = false;
        }
      }
      if (newState.ratio >= 1 && !state.hasPanLimitation) {
        // 阻止鼠标和触摸事件导致的平移
        console.log("阻止鼠标和触摸事件导致的平移");
        
        const originalDomElement = originalRenderer.getContainer();
        originalDomElement.addEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
        originalDomElement.addEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
        originalDomElement.addEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
        originalDomElement.addEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
        
        state.hasPanLimitation = true;
      }
      
      // 从原始图层同步到集群图层
      const clusterCamera = clusterRenderer.getCamera();
      if (typeof newState.x === 'number' && !isNaN(newState.x)) {
        clusterCamera.x = newState.x;
      }
      if (typeof newState.y === 'number' && !isNaN(newState.y)) {
        clusterCamera.y = newState.y;
      }
      if (typeof newState.ratio === 'number' && !isNaN(newState.ratio)) {
        clusterCamera.ratio = newState.ratio;
      }
      clusterRenderer.refresh(); // 刷新集群图层
      console.log("clusterRenderer.refresh() 已调用"); // 添加日志
      
      // 更新缩放比例显示
      if (mapData.scaleInfo && typeof newState.ratio === 'number' && !isNaN(newState.ratio)) {
        updateScaleInfo(mapData.scaleInfo, newState.ratio);
      }
      
      // 找到最接近的预定义缩放等级
      if (typeof newState.ratio === 'number' && !isNaN(newState.ratio)) {
        const closestZoomLevel = findClosestZoomLevel(newState.ratio, state.zoomThresholds);
        // 如果缩放等级发生变化，切换到相应的聚类视图
        if (state.currentZoomLevel !== closestZoomLevel) {
          console.log(`缩放等级变化: ${state.currentZoomLevel} -> ${closestZoomLevel}`);
          switchToZoomLevel(closestZoomLevel, mapData);
        }
      }
      
      // 更新保存的相机状态（深拷贝以避免引用问题）
      state.lastCameraState = {...newState};
    } catch (error) {
      console.error("处理相机状态变化时出错:", error);
    }
  }

  // 使用 afterRender 事件替代轮询机制来监听相机状态变化
  originalRenderer.on("afterRender", function() {
    const currentState = originalRenderer.getCamera().getState();
    const lastState = state.lastCameraState || {};

    // 验证相机状态有效性
    if (!currentState || typeof currentState !== 'object') {
      return;
    }

    // 检查相机状态是否发生变化
    if (currentState.ratio !== lastState.ratio ||
        currentState.x !== lastState.x ||
        currentState.y !== lastState.y) {
      handleCameraStateChange(currentState);
    }
  });

  console.log("相机状态监听已设置为 afterRender 事件机制");
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
    // resetNodeAndEdgeColors(clusterGraph, clusterRenderer);
    // 同时清除原始图层的高亮状态
    resetNodeAndEdgeColors(originalGraph, originalRenderer);
    
    // 在两个图层上都高亮显示双击的节点和附近节点及边
    // highlightNearbyNodes(clusterGraph, data.nodes, data.edges);
    highlightNearbyNodes(originalGraph, data.nodes, data.edges);
    
    clusterRenderer.refresh();
    originalRenderer.refresh();
    console.log("handleNearbyNodesRequest: clusterRenderer.refresh() and originalRenderer.refresh() called"); // 添加日志
    
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
 * 初始化分隔条调整功能
 */
function initResizers() {
  const mainResizer = document.getElementById('main-resizer');
  const mapContainer = document.getElementById('map-container');
  const bottomSection = document.querySelector('.bottom-section');
  
  if (!mainResizer || !mapContainer || !bottomSection) {
    console.error('找不到必要的DOM元素，无法初始化分隔条');
    return;
  }
  
  let startY = 0;
  let startHeight = 0;
  let startBottomHeight = 0;
  
  // 创建Sigma.js渲染器尺寸调整函数
  const resizeSigmaRenderers = function() {
    if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
      const clusterRenderer = window.mapData.clusterRenderer;
      const originalRenderer = window.mapData.originalRenderer;
      
      // 获取容器和画布
      const clusterDom = clusterRenderer.getContainer();
      const originalDom = originalRenderer.getContainer();
      const mapWidth = mapContainer.offsetWidth;
      const mapHeight = mapContainer.offsetHeight;
      
      // 触发全局尺寸调整事件
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      // 调整集群图层的尺寸
      if (clusterDom) {
        const canvas = clusterDom.querySelector('canvas');
        if (canvas) {
          canvas.width = mapWidth;
          canvas.height = mapHeight;
        }
      }
      
      // 调整原始图层的尺寸
      if (originalDom) {
        const canvas = originalDom.querySelector('canvas');
        if (canvas) {
          canvas.width = mapWidth;
          canvas.height = mapHeight;
        }
      }
      
    }
  };
  
  const onMouseDown = function(e) {
    // 记录初始位置和高度
    startY = e.clientY;
    startHeight = mapContainer.offsetHeight;
    startBottomHeight = bottomSection.offsetHeight;
    
    // 添加事件监听
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 添加拖动时的样式
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    mainResizer.classList.add('active');
    
    // 阻止默认事件和冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 记录到控制台
    addConsoleMessage('开始调整区域大小');
  };
  
  const onMouseMove = function(e) {
    // 计算移动的距离
    const deltaY = e.clientY - startY;
    const containerHeight = mapContainer.parentElement.offsetHeight;
    
    // 计算新的高度（确保最小高度）
    const newMapHeight = Math.max(100, Math.min(containerHeight - 100, startHeight + deltaY));
    const newBottomHeight = containerHeight - newMapHeight;
    
    // 计算百分比
    const mapPercent = (newMapHeight / containerHeight) * 100;
    const bottomPercent = 100 - mapPercent;
    
    // 应用新的高度 - 只更新CSS样式，保持流畅拖动
    mapContainer.style.height = `${mapPercent}%`;
    bottomSection.style.top = `${mapPercent}%`;
    bottomSection.style.height = `${bottomPercent}%`;
    mainResizer.style.top = `${mapPercent}%`;
    
    // 移除频繁的渲染器尺寸更新调用以避免卡顿
    // console.log("更新渲染器大小");
    // resizeSigmaRenderers();
    
    e.preventDefault();
  };
  
  const onMouseUp = function() {
    // 移除事件监听
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // 移除拖动时的样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    mainResizer.classList.remove('active');
    
    // 拖动结束后更新渲染器尺寸
    console.log("拖动结束，更新渲染器大小");
    resizeSigmaRenderers();
    
    // 手动触发渲染器刷新以确保图谱正确显示
    if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
      window.mapData.clusterRenderer.refresh();
      window.mapData.originalRenderer.refresh();
      console.log("Sigma.js 渲染器已刷新 (拖动结束)"); // 添加日志
    }
    
    // 记录到控制台
    const mapPercent = Math.round((mapContainer.offsetHeight / mapContainer.parentElement.offsetHeight) * 100);
    addConsoleMessage(`区域大小已调整为 ${mapPercent}:${100-mapPercent}`);
  };
  
  // 绑定鼠标按下事件
  mainResizer.addEventListener('mousedown', onMouseDown);
  
  // 双击重置为默认比例
  mainResizer.addEventListener('dblclick', function() {
    mapContainer.style.height = '60%';
    bottomSection.style.top = '60%';
    bottomSection.style.height = '40%';
    mainResizer.style.top = '60%';
    
    // 更新渲染器大小
    resizeSigmaRenderers();
    
    // 记录到控制台
    addConsoleMessage('区域大小已重置为默认比例 60:40');
  });
}

export { initEventListeners, handleNearbyNodesRequest }; 