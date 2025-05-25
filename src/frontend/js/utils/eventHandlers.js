/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors } from './nodeHandler.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo, addConsoleMessage } from './uiUtils.js';
import { switchToZoomLevel} from '../renderers/mapRenderer.js';

// 全局调整Sigma.js渲染器尺寸的函数，便于多处共享
function resizeSigmaRenderers() {
  if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
    const clusterRenderer = window.mapData.clusterRenderer;
    const originalRenderer = window.mapData.originalRenderer;
    const mapContainer = document.getElementById('map-container');
    
    // 确保容器存在
    if (!mapContainer) return;
    
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
    
    console.log(`渲染器大小已调整为 ${mapWidth}x${mapHeight}`);
  }
}

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
  // 初始化当前图层类型，支持三种模式：'mixed'(混合), 'original'(原始), 'cluster'(集群)
  state.currentLayer = 'original';
  state.lastOriginalCameraState = originalRenderer.getCamera().getState();
  state.lastClusterCameraState = clusterRenderer.getCamera().getState();
  
  // 设置初始原始图层主题色
  const root = document.documentElement;
  root.style.setProperty('--theme-color', getComputedStyle(root).getPropertyValue('--original-theme').trim());
  
  
  
  // 初始化可调整分隔条
  initResizers();
  
  // 初始化侧边栏切换功能
  initSidebarToggle();
  
  // 绑定查看地图实况按钮事件
  const mapLiveBtn = document.getElementById("mapLive");
  if (mapLiveBtn) {
    // 设置初始状态
    mapLiveBtn.textContent = '切换图层: 原始';
    mapLiveBtn.classList.add('active');
    
    mapLiveBtn.addEventListener('click', function() {
      // 三种图层类型切换：mixed -> original -> cluster -> mixed
      switch(state.currentLayer) {
        case 'mixed':
          state.currentLayer = 'original';
          switchLayer('original', mapData);
          mapLiveBtn.textContent = '切换图层: 原始';
          break;
        case 'original':
          state.currentLayer = 'cluster';
          switchLayer('cluster', mapData);
          mapLiveBtn.textContent = '切换图层: 集群';
          break;
        case 'cluster':
        default:
          state.currentLayer = 'mixed';
          switchLayer('mixed', mapData);
          mapLiveBtn.textContent = '切换图层: 混合';
          break;
      }
      
      // 添加到控制台
      addConsoleMessage(`已切换到${state.currentLayer === 'mixed' ? '混合' : (state.currentLayer === 'original' ? '原始' : '集群')}图层`);
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
  // 保存边的原始颜色
  state.originalEdgeColors = {};
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
        console.log("混合图层模式: 相机同步已执行");

        // 更新缩放比例显示
        if (mapData.scaleInfo) {
          updateScaleInfo(mapData.scaleInfo, currentOriginalCamera.ratio);
        }

        // 找到最接近的预定义缩放等级并切换
        const closestZoomLevel = findClosestZoomLevel(currentOriginalCamera.ratio, state.zoomThresholds);
        if (state.currentZoomLevel !== closestZoomLevel) {
          console.log(`缩放等级变化 (mixed): ${state.currentZoomLevel} -> ${closestZoomLevel}`);
          switchToZoomLevel(closestZoomLevel, mapData);
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
          console.log(`缩放等级变化 (cluster): ${state.currentZoomLevel} -> ${closestZoomLevel}`);
          switchToZoomLevel(closestZoomLevel, mapData);
        }
      }
    }
  });

  console.log("相机状态监听已设置为 afterRender 事件机制"+"当前模式为"+state.currentLayer);

  // 根据用户需求，初始化后立即切换到 'original' 图层模式
  const closestZoomLevel = findClosestZoomLevel(0.1, state.zoomThresholds);
  switchToZoomLevel(closestZoomLevel, mapData);
  switchLayer('original', mapData);
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
    const data = await fetchNearbyNod
    esData(x, y, count);
    console.log(`获取到${data.nodes.length}个附近节点和${data.edges.length}条边`);
    
    // 清除之前的高亮状态
    // resetNodeAndEdgeColors(clusterGraph, clusterRenderer);
    // 同时清除原始图层的高亮状态
    resetNodeAndEdgeColors(originalGraph, originalRenderer);
    
    // 在两个图层上都高亮显示双击的节点和附近节点及边
    // highlightNearbyNodes(clusterGraph, data.nodes, data.edges);
    highlightNearbyNodes(originalGraph, data.nodes, data.edges);
    
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
  
  // 注意：resizeSigmaRenderers已经被移到全局作用域
  
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
    resizeSigmaRenderers(); // 使用全局函数
    
    // 手动触发渲染器刷新以确保图谱正确显示
    if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
      window.mapData.clusterRenderer.refresh();
      window.mapData.originalRenderer.refresh();
      console.log("Sigma.js 渲染器已刷新 (拖动结束)");
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
    resizeSigmaRenderers(); // 使用全局函数
    
    // 记录到控制台
    addConsoleMessage('区域大小已重置为默认比例 60:40');
  });
}

/**
 * 初始化侧边栏切换功能
 */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('toggle-sidebar');
  const showBtn = document.getElementById('show-sidebar');
  const sidebar = document.querySelector('.app-sidebar');
  const mainContent = document.querySelector('.app-main');
  
  if (!toggleBtn || !showBtn || !sidebar || !mainContent) {
    console.error('找不到侧边栏切换所需的DOM元素');
    return;
  }
  
  // 点击隐藏侧边栏按钮
  toggleBtn.addEventListener('click', function() {
    sidebar.classList.add('hidden');
    mainContent.classList.add('full-width');
    
    // 显示"显示侧边栏"按钮
    showBtn.style.display = 'flex';
    
    // 添加到控制台
    addConsoleMessage('侧边栏已隐藏');
    
    // 触发窗口调整事件以确保所有元素正确调整大小
    window.dispatchEvent(new Event('resize'));
    
    // 调整渲染器大小
    setTimeout(() => {
      resizeSigmaRenderers(); // 使用全局函数
      
      if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
        // 刷新渲染器
        window.mapData.clusterRenderer.refresh();
        window.mapData.originalRenderer.refresh();
        console.log("隐藏侧边栏后刷新渲染器");
      }
    }, 300); // 等待过渡动画完成
  });
  
  // 点击显示侧边栏按钮
  showBtn.addEventListener('click', function() {
    sidebar.classList.remove('hidden');
    mainContent.classList.remove('full-width');
    
    // 隐藏"显示侧边栏"按钮
    showBtn.style.display = 'none';
    
    // 添加到控制台
    addConsoleMessage('侧边栏已显示');
    
    // 触发窗口调整事件以确保所有元素正确调整大小
    window.dispatchEvent(new Event('resize'));
    
    // 调整渲染器大小
    setTimeout(() => {
      resizeSigmaRenderers(); // 使用全局函数
      
      if (window.mapData && window.mapData.clusterRenderer && window.mapData.originalRenderer) {
        // 刷新渲染器
        window.mapData.clusterRenderer.refresh();
        window.mapData.originalRenderer.refresh();
        console.log("显示侧边栏后刷新渲染器");
      }
    }, 300); // 等待过渡动画完成
  });
}

/**
 * 切换图层显示模式
 * @param {string} layerType - 图层类型，可选值: 'mixed', 'original', 'cluster'
 * @param {Object} mapData - 地图数据对象
 */
function switchLayer(layerType, mapData) {
  const { originalGraph, clusterGraph, originalRenderer, clusterRenderer, state } = mapData;
  const originalLayer = document.getElementById("original-layer");
  const clusterLayer = originalRenderer.getContainer().parentElement.querySelector(':scope > div:not(#original-layer)');
  const root = document.documentElement; // 获取根元素，用于设置CSS变量
  
  if (!originalLayer || !clusterLayer) {
    console.error("找不到图层容器元素");
    return;
  }
  
  state.mapLiveActive = false;
  
  switch(layerType) {
    case 'original':
      originalLayer.style.opacity = "1";
      originalLayer.style.webkitMask = "none";
      originalLayer.style.mask = "none";
      originalLayer.style.zIndex = "10";
      clusterLayer.style.display = "none";
      clusterLayer.style.zIndex = "5";
      state.lastOriginalCameraState = originalRenderer.getCamera().getState();
      originalRenderer.refresh();
      
      // 设置原始图层主题色和背景色
      root.style.setProperty('--theme-color', getComputedStyle(root).getPropertyValue('--original-theme').trim());
      root.style.setProperty('--current-sidebar-bg', getComputedStyle(root).getPropertyValue('--original-sidebar-bg').trim());
      root.style.setProperty('--current-panel-bg', getComputedStyle(root).getPropertyValue('--original-panel-bg').trim());
      root.style.setProperty('--current-console-bg', getComputedStyle(root).getPropertyValue('--original-console-bg').trim());
      root.style.setProperty('--current-console-header-bg', getComputedStyle(root).getPropertyValue('--original-console-header-bg').trim());
      
      // 设置原始图层文本颜色
      root.style.setProperty('--current-sidebar-text', getComputedStyle(root).getPropertyValue('--original-sidebar-text').trim());
      root.style.setProperty('--current-panel-text', getComputedStyle(root).getPropertyValue('--original-panel-text').trim());
      root.style.setProperty('--current-console-text', getComputedStyle(root).getPropertyValue('--original-console-text').trim());
      root.style.setProperty('--current-heading-text', getComputedStyle(root).getPropertyValue('--original-heading-text').trim());
      break;
      
    case 'cluster':
      originalLayer.style.opacity = "0";
      originalLayer.style.zIndex = "5";
      clusterLayer.style.display = "block";
      clusterLayer.style.zIndex = "10";
      state.lastClusterCameraState = clusterRenderer.getCamera().getState();
      clusterRenderer.refresh();
      
      // 设置集群图层主题色和背景色
      root.style.setProperty('--theme-color', getComputedStyle(root).getPropertyValue('--cluster-theme').trim());
      root.style.setProperty('--current-sidebar-bg', getComputedStyle(root).getPropertyValue('--cluster-sidebar-bg').trim());
      root.style.setProperty('--current-panel-bg', getComputedStyle(root).getPropertyValue('--cluster-panel-bg').trim());
      root.style.setProperty('--current-console-bg', getComputedStyle(root).getPropertyValue('--cluster-console-bg').trim());
      root.style.setProperty('--current-console-header-bg', getComputedStyle(root).getPropertyValue('--cluster-console-header-bg').trim());
      
      // 设置集群图层文本颜色
      root.style.setProperty('--current-sidebar-text', getComputedStyle(root).getPropertyValue('--cluster-sidebar-text').trim());
      root.style.setProperty('--current-panel-text', getComputedStyle(root).getPropertyValue('--cluster-panel-text').trim());
      root.style.setProperty('--current-console-text', getComputedStyle(root).getPropertyValue('--cluster-console-text').trim());
      root.style.setProperty('--current-heading-text', getComputedStyle(root).getPropertyValue('--cluster-heading-text').trim());
      break;
      
    case 'mixed':
    default:
      state.mapLiveActive = true;
      originalLayer.style.opacity = "1";
      originalLayer.style.zIndex = "10";
      clusterLayer.style.display = "block";
      clusterLayer.style.zIndex = "5";
      const activeMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 100%)`;
      originalLayer.style.webkitMask = activeMaskStyle;
      originalLayer.style.mask = activeMaskStyle;
      state.lastOriginalCameraState = originalRenderer.getCamera().getState();
      // Ensure cluster camera is initially synced in mixed mode if just switched to it
      const currentOriginalCam = originalRenderer.getCamera().getState();
      const cCam = clusterRenderer.getCamera();
      cCam.x = currentOriginalCam.x;
      cCam.y = currentOriginalCam.y;
      cCam.ratio = currentOriginalCam.ratio;
      originalRenderer.refresh();
      clusterRenderer.refresh();
      
      // 设置混合图层主题色和背景色
      root.style.setProperty('--theme-color', getComputedStyle(root).getPropertyValue('--mixed-theme').trim());
      root.style.setProperty('--current-sidebar-bg', getComputedStyle(root).getPropertyValue('--mixed-sidebar-bg').trim());
      root.style.setProperty('--current-panel-bg', getComputedStyle(root).getPropertyValue('--mixed-panel-bg').trim());
      root.style.setProperty('--current-console-bg', getComputedStyle(root).getPropertyValue('--mixed-console-bg').trim());
      root.style.setProperty('--current-console-header-bg', getComputedStyle(root).getPropertyValue('--mixed-console-header-bg').trim());
      
      // 设置混合图层文本颜色
      root.style.setProperty('--current-sidebar-text', getComputedStyle(root).getPropertyValue('--mixed-sidebar-text').trim());
      root.style.setProperty('--current-panel-text', getComputedStyle(root).getPropertyValue('--mixed-panel-text').trim());
      root.style.setProperty('--current-console-text', getComputedStyle(root).getPropertyValue('--mixed-console-text').trim());
      root.style.setProperty('--current-heading-text', getComputedStyle(root).getPropertyValue('--mixed-heading-text').trim());
      break;
  }
  
  console.log(`已切换到${layerType}图层模式`);
  addConsoleMessage(`已切换到${layerType === 'original' ? '原始' : (layerType === 'cluster' ? '集群' : '混合')}图层模式，主题色已更新`);
}

export { initEventListeners, handleNearbyNodesRequest, switchLayer }; 