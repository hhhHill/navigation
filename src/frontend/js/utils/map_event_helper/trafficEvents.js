import { addConsoleMessage } from '../uiUtils.js';
import { updateTrafficOnEdges } from '../../renderers/mapRenderer.js';
import { listenToSocket } from '../../api/apiService.js';

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

/**
 * 初始化交通事件相关的逻辑
 * @param {Object} mapData - 地图数据对象
 */
function initTrafficEvents(mapData) {
  const { state } = mapData;

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
}

export { initTrafficEvents, handleTrafficUpdate };
