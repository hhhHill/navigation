/**
 * Sigma.js 事件处理模块
 */
import { handleNearbyNodesRequest } from '../eventHandlers.js';
import { updateScaleInfo, addConsoleMessage } from '../uiUtils.js';
import { switchToZoomLevel } from '../../renderers/mapRenderer.js';

/**
 * 找到最接近的预定义缩放等级
 * @param {number} currentZoom - 当前缩放值
 * @param {Array} thresholds - 预定义的缩放等级数组
 * @return {number} 最接近的缩放等级
 */
function findClosestZoomLevel(currentZoom, thresholds) {
  if (!thresholds || thresholds.length === 0) {
    // 如果 thresholds 未定义或为空，则返回当前缩放值或一个默认值
    console.warn("Zoom thresholds are not defined or empty. Returning current zoom level.");
    return currentZoom; 
  }
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
 * 初始化 Sigma.js 相关的事件监听器
 * @param {Object} mapData - 包含clusterGraph、originalGraph、clusterRenderer、originalRenderer、container和state的对象
 */
function initSigmaEventHandlers(mapData) {
  const { originalGraph, clusterGraph, originalRenderer, clusterRenderer, state } = mapData;

  let lastClickTime = 0;
  const doubleClickDelay = 1000; // 毫秒

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
    if (event && event.original) { // Sigma typings suggest event.original for raw browser event
        event.original.preventDefault();
        event.original.stopPropagation();
    }
  });
  
  // 初始化相机状态，保存引用
  // state.lastCameraState = originalRenderer.getCamera().getState(); // This was in initEventListeners, but seems more relevant if used by sigma handlers

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

  const mousemoveHandlerSigma = function(e) { // Renamed to avoid conflict if other mousemove handlers exist
    if (e.buttons === 1) { // 如果左键按下并移动
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const touchmoveHandlerSigma = function(e) { // Renamed to avoid conflict
    e.preventDefault();
    e.stopPropagation();
  };

  // 保存事件处理函数引用
  state.panLimitHandlers = {
    mousedownHandler,
    touchstartHandler,
    mousemoveHandler: mousemoveHandlerSigma, // Use renamed handler
    touchmoveHandler: touchmoveHandlerSigma  // Use renamed handler
  };

  originalRenderer.on("afterRender", function() {
    const currentOriginalCamera = originalRenderer.getCamera().getState();

    // --- 平移/缩放限制逻辑 (始终基于originalRenderer) ---
    if (currentOriginalCamera.ratio < 1) {
      if (state.hasPanLimitation) {
        console.log("重新启用平移功能");
        const originalDomElement = originalRenderer.getContainer();
        originalDomElement.removeEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
        originalDomElement.removeEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
        originalDomElement.removeEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
        originalDomElement.removeEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
        state.hasPanLimitation = false;
      }
    }
    if (currentOriginalCamera.ratio >= 1 && !state.hasPanLimitation) {
      console.log("阻止鼠标和触摸事件导致的平移");
      const originalDomElement = originalRenderer.getContainer();
      originalDomElement.addEventListener('mousedown', state.panLimitHandlers.mousedownHandler, false);
      originalDomElement.addEventListener('touchstart', state.panLimitHandlers.touchstartHandler, false);
      originalDomElement.addEventListener('mousemove', state.panLimitHandlers.mousemoveHandler, false);
      originalDomElement.addEventListener('touchmove', state.panLimitHandlers.touchmoveHandler, false);
      state.hasPanLimitation = true;
    }
    // --- 结束 平移/缩放限制逻辑 ---

    if (state.currentLayer === 'mixed') {
      const lastOriginalCamera = state.lastOriginalCameraState || {};
      if (currentOriginalCamera.ratio !== lastOriginalCamera.ratio ||
          currentOriginalCamera.x !== lastOriginalCamera.x ||
          currentOriginalCamera.y !== lastOriginalCamera.y) {

        state.lastOriginalCameraState = {...currentOriginalCamera};

        // 从原始图层同步到集群图层
        const clusterCamera = clusterRenderer.getCamera();
        clusterCamera.x = currentOriginalCamera.x;
        clusterCamera.y = currentOriginalCamera.y;
        clusterCamera.ratio = currentOriginalCamera.ratio;
        clusterRenderer.refresh();
        // console.log("混合图层模式: 相机同步已执行"); // Reduced log verbosity

        // 更新缩放比例显示
        if (mapData.scaleInfo) {
          updateScaleInfo(mapData.scaleInfo, currentOriginalCamera.ratio);
        }

        // 找到最接近的预定义缩放等级并切换
        const closestZoomLevel = findClosestZoomLevel(currentOriginalCamera.ratio, state.zoomThresholds);
        if (state.currentZoomLevel !== closestZoomLevel) {
          // console.log(\`缩放等级变化 (mixed): \${state.currentZoomLevel} -> \${closestZoomLevel}\`);
          switchToZoomLevel(closestZoomLevel, mapData);
        }
      }
    }else if(state.currentLayer === 'original'){
        const currentOriginalCamera = originalRenderer.getCamera().getState();
        const lastOriginalCamera = state.lastOriginalCameraState || {};
  
        if (currentOriginalCamera.ratio !== lastOriginalCamera.ratio ||
            currentOriginalCamera.x !== lastOriginalCamera.x ||
            currentOriginalCamera.y !== lastOriginalCamera.y) {
  
          state.lastOriginalCameraState = {...currentOriginalCamera};
  
          // 更新缩放比例显示
          if (mapData.scaleInfo) {
            updateScaleInfo(mapData.scaleInfo, currentOriginalCamera.ratio);
          }
        }
    }
  });

  clusterRenderer.on("afterRender", function() {
    if (state.currentLayer === 'cluster') {
      const currentClusterCamera = clusterRenderer.getCamera().getState();
      const lastClusterCamera = state.lastClusterCameraState || {};

      if (currentClusterCamera.ratio !== lastClusterCamera.ratio ||
          currentClusterCamera.x !== lastClusterCamera.x ||
          currentClusterCamera.y !== lastClusterCamera.y) {

        state.lastClusterCameraState = {...currentClusterCamera};

        // 更新缩放比例显示
        if (mapData.scaleInfo) {
          updateScaleInfo(mapData.scaleInfo, currentClusterCamera.ratio);
        }

        // 找到最接近的预定义缩放等级并切换
        const closestZoomLevel = findClosestZoomLevel(currentClusterCamera.ratio, state.zoomThresholds);
        if (state.currentZoomLevel !== closestZoomLevel) {
          // console.log(\`缩放等级变化 (cluster): \${state.currentZoomLevel} -> \${closestZoomLevel}\`);
          switchToZoomLevel(closestZoomLevel, mapData);
        }
      }
    }
  });
  
  console.log("Sigma.js 事件处理器已初始化");
}

export { initSigmaEventHandlers, findClosestZoomLevel };
