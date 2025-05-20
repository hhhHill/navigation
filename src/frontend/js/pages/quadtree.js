/**
 * 四叉树可视化页面脚本
 */
import { fetchMapData } from '../api/apiService.js';
import { 
  initQuadtreeMapRender, 
  initQuadtreeCanvas, 
  setQuadtreeSigmaInstance, 
  visualizeQuadtreeStepByStep, 
  handleResize 
} from '../renderers/quadtreeRenderers.js';

// 初始化全局变量
let quadtreeCanvas;

/**
 * 主程序入口
 */
async function main() {
    try {
        // 初始化 Canvas
        quadtreeCanvas = document.getElementById('quadtreeCanvas');
        initQuadtreeCanvas(quadtreeCanvas);
        
        // 获取地图数据
        const mapAPIData = await fetchMapData();
        
        // 初始化地图渲染，使用四叉树专用的渲染函数
        const mapRenderData = initQuadtreeMapRender(mapAPIData);
        
        if (mapRenderData && mapRenderData.renderer) {
            setQuadtreeSigmaInstance(mapRenderData.renderer);
            visualizeQuadtreeStepByStep();
        } else {
            console.error("Failed to initialize map renderer or get Sigma instance.");
            alert("Failed to initialize map renderer.");
            return;
        }
        
        // 移除加载提示
        const loadingElement = document.querySelector(".loading");
        if (loadingElement) {
            loadingElement.remove();
        }
        console.log("Application and Quadtree visualization initialized.");

    } catch (error) {
        console.error("Application initialization failed:", error);
        const loadingElement = document.querySelector(".loading");
        if (loadingElement) {
             loadingElement.textContent = "Application initialization failed, please refresh.";
        }
        alert("Application initialization failed. Check console.");
    }
}

// 初始化事件监听器
window.addEventListener('resize', handleResize);
document.addEventListener('DOMContentLoaded', main); 