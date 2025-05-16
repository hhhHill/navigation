/**
 * 主模块 - 应用程序入口点
 */
import { fetchMapData } from '../api/apiService.js';
import { initMapRender } from '../renderers/mapRenderer.js';
import { initEventListeners } from '../utils/eventHandlers.js';
import { createScaleInfo } from '../utils/uiUtils.js';

/**
 * 初始化应用程序
 */
async function initApp() {
  try {
    // 获取地图数据
    const data = await fetchMapData();
    
    // 初始化地图渲染
    const mapData = initMapRender(data);
    
    // 创建缩放信息提示
    mapData.scaleInfo = createScaleInfo(mapData.container);
    
    // 初始化事件监听器
    initEventListeners(mapData);
    
    // 移除加载提示
    const loadingElement = document.querySelector(".loading");
    if (loadingElement) {
      loadingElement.remove();
    }
    
    console.log("应用程序初始化完成");
  } catch (error) {
    console.error("应用程序初始化失败:", error);
    document.querySelector(".loading").textContent = "应用程序初始化失败，请刷新重试";
  }
}

// 页面加载后初始化应用程序
document.addEventListener('DOMContentLoaded', initApp); 