import { addConsoleMessage } from '../uiUtils.js';
import { switchToZoomLevel } from '../../renderers/mapRenderer.js';
import { findClosestZoomLevel } from './sigmaEvents.js';

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

      // 从 originalRenderer 同步镜头状态到 clusterRenderer
      const currentOriginalCameraState = originalRenderer.getCamera().getState();
      const clusterCamera = clusterRenderer.getCamera();

      clusterCamera.x = currentOriginalCameraState.x;
      clusterCamera.y = currentOriginalCameraState.y;
      clusterCamera.ratio = currentOriginalCameraState.ratio;

      state.lastClusterCameraState = clusterCamera.getState(); // 更新存储的集群图层最后镜头状态
      switchToZoomLevel(findClosestZoomLevel(clusterCamera.ratio, state.zoomThresholds), mapData);
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

      // 从 clusterRenderer 同步镜头状态到 originalRenderer
      const currentClusterCameraState = clusterRenderer.getCamera().getState();
      const originalCamera = originalRenderer.getCamera();

      originalCamera.x = currentClusterCameraState.x;
      originalCamera.y = currentClusterCameraState.y;
      originalCamera.ratio = currentClusterCameraState.ratio;

      state.lastOriginalCameraState = originalCamera.getState();
      const activeMaskStyle = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 100%)`;
      originalLayer.style.webkitMask = activeMaskStyle;
      originalLayer.style.mask = activeMaskStyle;
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

/**
 * 初始化图层切换相关的事件监听器
 * @param {Object} mapData - 地图数据对象
 */
function initLayerSwitchEvents(mapData) {
  const { state } = mapData;
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
}

export { switchLayer, initLayerSwitchEvents };
