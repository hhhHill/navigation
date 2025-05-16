/**
 * 四叉树可视化页面脚本
 */
import { fetchMapData } from '../api/apiService.js';
import { initMapRender } from '../renderers/mapRenderer.js';
import {fetchQuadtreeData} from '../api/apiService.js'
// 初始化全局变量
let sigmaInstance = null;
let quadtreeCanvas, quadtreeCtx;
let allQuadtreeBoundaries = [];
let currentlyDrawingQuadtree = false;



/**
 * 绘制四叉树边界
 */
function drawQuadtreeBoundaries(boundaries) {
    quadtreeCtx.clearRect(0, 0, quadtreeCanvas.width, quadtreeCanvas.height);
    if (!sigmaInstance || boundaries.length === 0) return;

    boundaries.forEach(boundary => {
        const { x_min, y_min, x_max, y_max, level } = boundary;
        
        const p1 = sigmaInstance.graphToViewport({ x: x_min, y: y_min });
        const p2 = sigmaInstance.graphToViewport({ x: x_max, y: y_max });
        
        const screen_x_min = Math.min(p1.x, p2.x);
        const screen_y_min = Math.min(p1.y, p2.y);
        const screen_x_max = Math.max(p1.x, p2.x);
        const screen_y_max = Math.max(p1.y, p2.y);

        quadtreeCtx.strokeStyle = `rgba(0,0,255,${0.2 + 0.8/(level+1)})`;
        quadtreeCtx.lineWidth = 1;
        quadtreeCtx.strokeRect(screen_x_min, screen_y_min, screen_x_max - screen_x_min, screen_y_max - screen_y_min);
    });
}

/**
 * 逐步可视化四叉树
 */
async function visualizeQuadtreeStepByStep() {
    if (currentlyDrawingQuadtree) return;
    currentlyDrawingQuadtree = true;

    allQuadtreeBoundaries = await fetchQuadtreeData();
    if (!sigmaInstance) {
        console.warn("Sigma instance not ready for quadtree drawing.");
        currentlyDrawingQuadtree = false;
        return;
    }

    const boundariesByLevel = {};
    allQuadtreeBoundaries.forEach(b => {
        if (!boundariesByLevel[b.level]) boundariesByLevel[b.level] = [];
        boundariesByLevel[b.level].push(b);
    });
    const maxLevel = Math.max(...Object.keys(boundariesByLevel).map(Number).filter(k => !isNaN(k)), -1);
    
    let currentLevel = 0;
    const drawnBoundaries = [];

    function drawNextLevel() {
        if (currentLevel <= maxLevel) {
            const boundariesToDraw = boundariesByLevel[currentLevel] || [];
            drawnBoundaries.push(...boundariesToDraw);
            drawQuadtreeBoundaries(drawnBoundaries); // Draw cumulative boundaries
            currentLevel++;
            setTimeout(drawNextLevel, 500);
        } else {
            console.log("Quadtree drawing complete.");
            currentlyDrawingQuadtree = false;
        
            if (sigmaInstance) {
                sigmaInstance.getCamera().on("updated", () => {
                     drawQuadtreeBoundaries(drawnBoundaries); // Redraw all drawn boundaries
                });
            }
        }
    }
    drawNextLevel();
}

/**
 * 主程序入口
 */
async function main() {
    try {
        // 初始化 Canvas
        quadtreeCanvas = document.getElementById('quadtreeCanvas');
        quadtreeCtx = quadtreeCanvas.getContext('2d');
        quadtreeCanvas.width = window.innerWidth;
        quadtreeCanvas.height = window.innerHeight;
        
        // 获取地图数据
        const mapAPIData = await fetchMapData();
        
        // 初始化地图渲染
        const mapRenderData = initMapRender(mapAPIData);
        
        if (mapRenderData && mapRenderData.renderer) {
            sigmaInstance = mapRenderData.renderer;
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

/**
 * 窗口大小调整处理
 */
function handleResize() {
    quadtreeCanvas.width = window.innerWidth;
    quadtreeCanvas.height = window.innerHeight;
    if (sigmaInstance && allQuadtreeBoundaries.length > 0) {
        const boundariesByLevel = {};
        allQuadtreeBoundaries.forEach(b => {
            if (!boundariesByLevel[b.level]) boundariesByLevel[b.level] = [];
            boundariesByLevel[b.level].push(b);
        });
        drawQuadtreeBoundaries(allQuadtreeBoundaries);
    }
}

// 初始化事件监听器
window.addEventListener('resize', handleResize);
document.addEventListener('DOMContentLoaded', main); 