/**
 * 事件处理模块 - 负责处理各种用户交互事件
 */
import { fetchNearbyNodesData, listenToSocket, fetchShortestPath } from '../api/apiService.js';
import { highlightNearbyNodes, resetNodeAndEdgeColors, highlightEdges, COLORS } from './rengerHelper.js';
import { showLoadingMessage, showResultMessage, showErrorMessage, removeElement, updateScaleInfo, addConsoleMessage } from './uiUtils.js';
import { switchToZoomLevel, updateTrafficOnEdges } from '../renderers/mapRenderer.js';
import { initSigmaEventHandlers, findClosestZoomLevel } from './map_event_helper/sigmaEvents.js';
import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

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
  // 初始化缩放等级和阈值 (示例，这些值应该在mapData或配置中定义)
  state.zoomThresholds = [ 0.3, 0.5, 1]; 
  state.currentZoomLevel = findClosestZoomLevel(originalRenderer.getCamera().getState().ratio, state.zoomThresholds);
  
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
  
  // 初始化相机状态，保存引用
  state.lastCameraState = originalRenderer.getCamera().getState();
  
  // 标记是否已添加平移限制
  state.hasPanLimitation = false;
  

  // 初始化 Sigma.js 相关事件
  initSigmaEventHandlers(mapData);

  // 定义处理交通更新的函数
  function handleTrafficUpdate(data) {
    // console.log('收到交通更新数据:', data);
    
    if (data && data.edges) {
      // console.log(`收到 ${data.edges.length} 条边的交通更新数据`);
      // addConsoleMessage(`收到${data.edges.length}条边的交通更新数据`);
      
      // 调用渲染函数更新边的颜色
      if (window.mapData) { // 确保 mapData 可用
        updateTrafficOnEdges(window.mapData, data.edges);
      } else {
        console.warn('mapData 不可用，无法更新交通数据视图。');
      }
    }
  }

  // 初始化 WebSocket 连接并监听事件
  const trafficSocket = listenToSocket('traffic_update', handleTrafficUpdate);
  
  // 将socket保存到mapData.state中，以便其他地方使用
  state.trafficSocket = trafficSocket;
  state.isTrafficSimulationRunning = false; // 初始化模拟状态
  
  // 添加交通模拟控制按钮事件
  const trafficSimButton = document.getElementById("trafficSim");
  if (trafficSimButton) {
    // 设置初始按钮文本
    trafficSimButton.textContent = '启动交通模拟';

    trafficSimButton.addEventListener('click', function() {
      if (state.isTrafficSimulationRunning) {
        // 如果正在运行，则停止
        console.log('发送停止交通模拟请求');
        addConsoleMessage('已发送停止交通模拟请求');
        state.trafficSocket.emit('stop_traffic_simulation');
        trafficSimButton.textContent = '启动交通模拟';
      } else {
        // 如果已停止，则启动
        console.log('发送启动交通模拟请求');
        addConsoleMessage('已发送启动交通模拟请求');
        state.trafficSocket.emit('start_traffic_simulation');
        trafficSimButton.textContent = '停止交通模拟';
      }
      // 切换状态
      state.isTrafficSimulationRunning = !state.isTrafficSimulationRunning;
    });
  }

  // 添加计算最短路径按钮事件 (测试用)
  const shortestPathButton = document.getElementById("shortestPath");
  if (shortestPathButton) {
    shortestPathButton.addEventListener('click', async () => {
      // 创建模态框HTML
      const modalHtml = `
        <div id="path-input-modal" class="modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>计算最短路径</h3>
            <div class="form-group">
              <label for="start-node">起始节点:</label>
              <input type="text" id="start-node" class="form-control" value="node1" placeholder="输入起始节点ID">
            </div>
            <div class="form-group">
              <label for="end-node">终止节点:</label>
              <input type="text" id="end-node" class="form-control" value="node999" placeholder="输入终止节点ID">
            </div>
            <div class="button-container">
              <button id="calculate-path-btn" class="btn primary-btn">计算路径</button>
              <button id="cancel-path-btn" class="btn secondary-btn">取消</button>
            </div>
            <div id="path-result-container" class="result-container" style="display: none;"></div>
          </div>
        </div>
      `;
      
      // 添加模态框到DOM
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer.firstElementChild);
      
      // 获取模态框元素
      const modal = document.getElementById('path-input-modal');
      const closeBtn = modal.querySelector('.close-modal');
      const calculateBtn = document.getElementById('calculate-path-btn');
      const cancelBtn = document.getElementById('cancel-path-btn');
      const resultContainer = document.getElementById('path-result-container');
      
      // 显示模态框
      modal.style.display = 'block';
      
      // 关闭模态框的函数
      const closeModal = () => {
        modal.style.display = 'none';
        document.body.removeChild(modal);
      };
      
      // 绑定关闭按钮事件
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      
      // 点击模态框外部关闭
      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal();
        }
      });
      
      // 绑定计算路径按钮事件
      calculateBtn.addEventListener('click', async () => {
        // 获取输入值
        const startId = document.getElementById('start-node').value.trim();
        const endId = document.getElementById('end-node').value.trim();
        
        // 输入验证
        if (!startId || !endId) {
          resultContainer.innerHTML = `<p class="error">请输入有效的起始节点和终止节点ID</p>`;
          resultContainer.style.display = 'block';
          return;
        }
        
        // 显示加载状态
        resultContainer.innerHTML = `<p class="info">正在计算从 ${startId} 到 ${endId} 的路径...</p>`;
        resultContainer.style.display = 'block';
        calculateBtn.disabled = true;
        
        try {
          // 调用封装的API函数
          const responseData = await fetchShortestPath(startId, endId);
          
          // 处理错误
          if (responseData && responseData.error) {
            resultContainer.innerHTML = `<p class="error">路径请求失败: ${responseData.error}</p>`;
            addConsoleMessage(`路径请求失败: ${responseData.error}`, 'error');
            calculateBtn.disabled = false;
            return;
          }
          
          // 检查是否成功获取路径数据
          if (!responseData || !responseData.paths) {
            resultContainer.innerHTML = `<p class="error">路径请求返回意外数据</p>`;
            addConsoleMessage(`路径请求返回意外数据`, 'error');
            calculateBtn.disabled = false;
            return;
          }
          
          // 构建结果HTML
          let resultHtml = `<h4>路径结果:</h4>`;
          
          // 用于高亮路径的变量
          let fastestPathEdges = null;
          let shortestPathEdges = null;
          
          // 添加最快路径信息
          if (responseData.paths.fastest_path) {
            if (responseData.paths.fastest_path.error) {
              resultHtml += `<p class="warning">最快路径: ${responseData.paths.fastest_path.error}</p>`;
              addConsoleMessage(`最快路径: ${responseData.paths.fastest_path.error}`, 'warn');
            } else if (responseData.paths.fastest_path.edges) {
              fastestPathEdges = responseData.paths.fastest_path.edges;
              resultHtml += `<p class="success">最快路径: ${responseData.paths.fastest_path.edges.length} 条边, 总耗时: ${responseData.paths.fastest_path.total_cost.toFixed(2)}</p>`;
              addConsoleMessage(`最快路径: ${responseData.paths.fastest_path.edges.length} 条边, 总耗时: ${responseData.paths.fastest_path.total_cost.toFixed(2)}`);
            }
          }
          
          // 添加最短路径信息
          if (responseData.paths.shortest_path_by_length) {
            if (responseData.paths.shortest_path_by_length.error) {
              resultHtml += `<p class="warning">最短路径(长度): ${responseData.paths.shortest_path_by_length.error}</p>`;
              addConsoleMessage(`最短路径(长度): ${responseData.paths.shortest_path_by_length.error}`, 'warn');
            } else if (responseData.paths.shortest_path_by_length.edges) {
              shortestPathEdges = responseData.paths.shortest_path_by_length.edges;
              resultHtml += `<p class="success">最短路径(长度): ${responseData.paths.shortest_path_by_length.edges.length} 条边, 总距离: ${responseData.paths.shortest_path_by_length.total_cost.toFixed(2)}</p>`;
              addConsoleMessage(`最短路径(长度): ${responseData.paths.shortest_path_by_length.edges.length} 条边, 总距离: ${responseData.paths.shortest_path_by_length.total_cost.toFixed(2)}`);
            }
          }
          
          // 处理起点终点相同的情况
          if (responseData.message) {
            resultHtml += `<p class="info">${responseData.message}</p>`;
            addConsoleMessage(responseData.message, "info");
          }
          
          // 高亮路径 - 首先重置
          if (window.mapData && window.mapData.originalGraph && window.mapData.originalRenderer) {
            // 先重置所有高亮状态
            resetNodeAndEdgeColors(window.mapData.originalGraph, window.mapData.originalRenderer);
            
            // 如果有最快路径，用蓝色高亮
            if (fastestPathEdges && fastestPathEdges.length > 0) {
              highlightEdges(
                window.mapData.originalGraph, 
                fastestPathEdges, 
                COLORS.FASTEST_PATH, 
                true,
                COLORS.PATH_NODE,
                'fastest'
              );
              addConsoleMessage("已高亮显示最快路径", "success");
            }
            
            // 如果有最短路径，用橙色高亮
            if (shortestPathEdges && shortestPathEdges.length > 0) {
              highlightEdges(
                window.mapData.originalGraph, 
                shortestPathEdges, 
                COLORS.SHORTEST_PATH, 
                true,
                COLORS.PATH_NODE,
                'shortest'
              );
              addConsoleMessage("已高亮显示最短路径", "success");
            }
            
            // 刷新渲染器以显示高亮
            window.mapData.originalRenderer.refresh();
          }
          
          // 在结果容器中添加高亮路径的图例
          if (fastestPathEdges || shortestPathEdges) {
            resultHtml += `<div class="path-legend">
              <p><strong>路径图例:</strong></p>
              ${fastestPathEdges ? `<p style="color:${COLORS.FASTEST_PATH}">■ 最快路径</p>` : ''}
              ${shortestPathEdges ? `<p style="color:${COLORS.SHORTEST_PATH}">■ 最短路径</p>` : ''}
              <p style="color:${COLORS.PATH_NODE}">■ 路径节点</p>
            </div>`;
          }
          
          // 更新结果容器
          resultContainer.innerHTML = resultHtml;
          console.log("路径数据:", responseData);
          addConsoleMessage(`成功计算从 ${startId} 到 ${endId} 的路径`);
          
          // 添加重置高亮的按钮
          if (fastestPathEdges || shortestPathEdges) {
            const resetButton = document.createElement('button');
            resetButton.innerHTML = '清除高亮';
            resetButton.className = 'secondary-btn';
            resetButton.style.marginTop = '10px';
            resetButton.onclick = function() {
              if (window.mapData && window.mapData.originalGraph && window.mapData.originalRenderer) {
                resetNodeAndEdgeColors(window.mapData.originalGraph, window.mapData.originalRenderer);
                window.mapData.originalRenderer.refresh();
                addConsoleMessage("已清除路径高亮", "info");
                this.disabled = true;
              }
            };
            resultContainer.appendChild(resetButton);
          }
          
        } catch (error) {
          console.error("请求路径数据时发生错误:", error);
          resultContainer.innerHTML = `<p class="error">请求路径时出错: ${error.message}</p>`;
          addConsoleMessage(`请求路径时出错: ${error.message}`, 'error');
        }
        
        // 重置按钮状态
        calculateBtn.disabled = false;
      });
    });
  }
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
    
    originalRenderer.refresh();
    console.log("handleNearbyNodesRequest: clusterRenderer.refresh() and originalRenderer.refresh() called"); // 添加日志
    
    // 移除加载提示
    removeElement('loading-nearby');
    
    // 显示结果提示
    showResultMessage(container, `显示附近${data.nodes.length}个节点和${data.edges.length}条边`);
    
    return data; // 返回获取到的数据
    
  } catch (error) {
    console.error('获取附近节点失败:', error);
    
    // 移除加载提示
    removeElement('loading-nearby');
    
    // 显示错误提示
    showErrorMessage(container, `获取附近节点失败: ${error.message}`);
    return null; // 发生错误时返回 null
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
      switchToZoomLevel(findClosestZoomLevel(clusterRenderer.getCamera().getState().ratio, state.zoomThresholds), mapData);
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