/**
 * API服务模块 - 负责处理与后端API的通信
 */

/**
 * 获取地图数据
 * @returns {Promise<Object>} 包含节点和边数据的对象
 */
async function fetchMapData() {
    try {
      // 从后端获取详细视图数据
      const detailResponse = await fetch('/api/map-data/detail');
      if (!detailResponse.ok) {
        throw new Error(`HTTP error fetching detail data: ${detailResponse.status}`);
      }
      const detailData = await detailResponse.json();
      
      // 从后端获取概览视图数据
      const overviewResponse = await fetch('/api/dbscan_clusters');
      if (!overviewResponse.ok) {
        throw new Error(`HTTP error fetching overview data: ${overviewResponse.status}`);
      }
      const overviewData = await overviewResponse.json();
      
      return { detailData, overviewData };
    } catch (error) {
      console.error("获取地图数据失败:", error);
      document.querySelector(".loading").textContent = "加载地图数据失败，请刷新重试";
      throw error;
    }
  }

/**
 * 获取指定缩放等级的聚类数据
 * @param {number} zoomLevel - 缩放等级(0.1-5)
 * @returns {Promise<Object>} 包含节点和边的聚类数据
 */
async function fetchZoomClusterData(zoomLevel) {
  try {
    // 将浮点数缩放等级转换为最接近的预计算缩放等级
    const zoomLevels = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0];
    let closestZoomLevel = zoomLevels[0];
    let minDiff = Math.abs(zoomLevel - zoomLevels[0]);
    
    for (let i = 1; i < zoomLevels.length; i++) {
      const diff = Math.abs(zoomLevel - zoomLevels[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestZoomLevel = zoomLevels[i];
      }
    }
    
    console.log(`获取缩放等级 ${zoomLevel} 的聚类数据 (映射到 ${closestZoomLevel})`);
    
    // 使用查询参数获取缩放等级数据
    const response = await fetch(`/api/zoom_clusters?zoom_level=${zoomLevel}`);
    if (!response.ok) {
      throw new Error(`HTTP error fetching zoom cluster data: ${response.status}`);
    }
    const clusterData = await response.json();
    
    return clusterData;
  } catch (error) {
    console.error(`获取缩放等级 ${zoomLevel} 的聚类数据失败:`, error);
    throw error;
  }
}

/**
 * 获取附近节点数据
 * @param {number} x - 中心点x坐标
 * @param {number} y - 中心点y坐标
 * @param {number} count - 获取节点数量
 * @returns {Promise<Object>} 包含节点和边数据的对象
 */
async function fetchNearbyNodesData(x, y, count) {
    try {
      const response = await fetch(`/api/nearby_nodes?x=${x}&y=${y}&count=${count}`);
      if (!response.ok) {
        throw new Error('网络响应错误');
      }
      return await response.json();
    } catch (error) {
      console.error('获取附近节点失败:', error);
      throw error;
    }
  }

  /**
 * 获取四叉树数据
 */
async function fetchQuadtreeData() {
    try {
        const response = await fetch('/api/quadtree');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.boundaries;
    } catch (error) {
        console.error('Failed to fetch quadtree data:', error);
        alert('Failed to fetch quadtree data!');
        return [];
    }
}

export { fetchMapData, fetchNearbyNodesData, fetchQuadtreeData, fetchZoomClusterData }; 