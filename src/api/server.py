"""
Flask服务器
提供获取地图数据的API
"""
from flask import Flask, jsonify, send_from_directory, request
import json
import os
import time
import sys
import math

# 确保可以导入src模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 创建Flask应用
app = Flask(__name__, static_folder='../frontend')

# 全局变量，在启动服务器时加载
# 加载的Graph对象，用于空间查询
GRAPH = None

# 缓存不同缩放等级的DBSCAN聚类结果
ZOOM_LEVEL_CLUSTERS = {}

# 导入DBSCAN
from src.algorithms.DBSCAN import DBSCAN, apply_dbscan
# 导入KMeans和Mini-Batch KMeans
from src.algorithms.KMeans import apply_kmeans, apply_mini_batch_kmeans

@app.route('/api/map-data')
def get_map_data():
    """
    提供地图数据的API端点
    从JSON文件中读取数据并返回  
    """
    try:
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'map_data.json')
        with open(data_file, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        return jsonify(map_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/map-data/detail')
def get_map_data_detail():
    """
    提供详细地图数据的API端点
    从JSON文件中读取数据并返回  
    """
    try:
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'map_data.json')
        with open(data_file, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        return jsonify(map_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/nearby_nodes')
def get_nearby_nodes():
    """
    提供获取附近节点的API端点
    根据给定的x和y坐标，返回附近的n个顶点
    """
    try:
        # 解析请求参数
        x = float(request.args.get('x', 0))
        y = float(request.args.get('y', 0))
        count = int(request.args.get('count', 100))
        
        print(f"收到附近节点查询请求: x={x}, y={y}, count={count}")
        
        # 确保全局图对象已初始化
        global GRAPH
        if GRAPH is None:
            return jsonify({"error": "图数据尚未加载完成，请稍后再试"}), 500
        
        # 查询附近的顶点
        print(f"正在查询附近的 {count} 个顶点...")
        start_time = time.time()
        nearby_vertices = GRAPH.get_nearby_vertices(x, y, n=count)
        query_time = time.time() - start_time
        print(f"查询完成，耗时 {query_time:.4f} 秒，找到 {len(nearby_vertices)} 个顶点")
        
        # 转换为JSON格式
        result_nodes = []
        result_edges = []
        
        # 收集顶点ID，用于后续查找边
        vertex_ids = set()
        
        # 处理顶点
        for vertex in nearby_vertices:
            vertex_ids.add(vertex.id)
            result_nodes.append({
                "id": vertex.id,
                "label": f"Node {vertex.id}",
                "x": vertex.x,
                "y": vertex.y
            })
        
        # 查找这些顶点之间的边
        for vertex in nearby_vertices:
            for edge in vertex.edges:
                # 只添加两端都在结果集中的边
                if edge.vertex1.id in vertex_ids and edge.vertex2.id in vertex_ids:
                    # 避免重复添加边
                    edge_id = f"{min(edge.vertex1.id, edge.vertex2.id)}_{max(edge.vertex1.id, edge.vertex2.id)}"
                    if not any(e.get('id') == edge_id for e in result_edges):
                        result_edges.append({
                            "id": edge_id,
                            "source": edge.vertex1.id,
                            "target": edge.vertex2.id
                        })
        
        # 构建返回结果
        result = {
            "nodes": result_nodes,
            "edges": result_edges
        }
        
        print(f"返回 {len(result_nodes)} 个节点和 {len(result_edges)} 条边")
        return jsonify(result)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"处理附近节点请求时出错: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

@app.route('/api/quadtree')
def get_quadtree_data():
    """
    提供四叉树结构数据的API端点
    递归提取四叉树的所有边界矩形，返回给前端用于可视化
    """
    try:
        print("收到四叉树数据请求...")
        
        # 确保全局图对象已初始化
        global GRAPH
        if GRAPH is None:
            return jsonify({"error": "图数据尚未加载完成，请稍后再试"}), 500
        
        # 确保空间索引已构建
        if GRAPH.spatial_index is None:
            GRAPH.build_spatial_index()
            
        # 递归提取四叉树中的所有边界矩形
        boundaries = []
        
        def extract_boundaries(quadtree, level=0):
            """递归提取四叉树的所有边界矩形"""
            if quadtree is None:
                return
                
            # 添加当前节点的边界
            x_min, y_min, x_max, y_max = quadtree.boundary
            boundaries.append({
                "x_min": x_min,
                "y_min": y_min,
                "x_max": x_max,
                "y_max": y_max,
                "level": level,
                "points_count": len(quadtree.points)
            })
            
            # 递归处理子节点
            if quadtree.divided:
                extract_boundaries(quadtree.northwest, level + 1)
                extract_boundaries(quadtree.northeast, level + 1)
                extract_boundaries(quadtree.southwest, level + 1)
                extract_boundaries(quadtree.southeast, level + 1)
        
        # 开始递归提取边界
        start_time = time.time()
        extract_boundaries(GRAPH.spatial_index)
        process_time = time.time() - start_time
        
        print(f"四叉树数据处理完成，耗时 {process_time:.4f} 秒，共 {len(boundaries)} 个边界矩形")
        
        # 构建返回结果
        result = {
            "boundaries": boundaries,
            "total_count": len(boundaries)
        }
        
        return jsonify(result)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"处理四叉树数据请求时出错: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

@app.route('/quadtree-viz')
def quadtree_viz_page():
    """提供四叉树可视化页面"""
    return send_from_directory(os.path.join(app.static_folder, 'html'), 'quadtree.html')

@app.route('/')
def index_page():
    """提供index页面"""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'home', 'html'), 'index.html')

@app.route('/map')
def index():
    """提供前端页面"""
    return send_from_directory(os.path.join(app.static_folder, 'html'), 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """提供其他静态文件"""
    return send_from_directory(app.static_folder, path)

@app.route('/api/zoom_clusters')
def get_zoom_clusters():
    """
    提供按缩放等级预计算的DBSCAN聚类数据
    
    请求参数:
        zoom_level: 缩放等级，浮点数，范围从0.1（最近）到5.0（最远）
    """
    try:
        global ZOOM_LEVEL_CLUSTERS
        global GRAPH
        
        # 从请求参数中获取缩放等级
        zoom_level = request.args.get('zoom_level', type=float)
        
        # 检查是否提供了缩放等级参数
        if zoom_level is None:
            return jsonify({"error": "缺少必要的zoom_level参数"}), 400
            
        print(f"收到缩放等级 {zoom_level} 的聚类数据请求")
        
        # 特殊处理：当缩放比例等于0.1时，返回原始图数据
        if zoom_level == 0.1:
            print("缩放比例为0.1，返回原始图数据")
            
            # 确保图对象已初始化
            if GRAPH is None:
                return jsonify({"error": "图数据尚未加载完成，请稍后再试"}), 500
                
            start_time = time.time()
            result_nodes = []
            result_edges = []
            
            # 处理所有顶点
            for vertex_id, vertex in GRAPH.vertices.items():
                result_nodes.append({
                    "id": vertex_id,
                    "label": f"Node {vertex_id}",
                    "x": vertex.x,
                    "y": vertex.y,
                    "size": 3,  # 使用固定大小
                    "zoom_level": 0.1
                })
            
            # 处理所有边
            edge_set = set()
            for edge_id, edge in GRAPH.edges.items():
                source_id = edge.vertex1.id
                target_id = edge.vertex2.id
                
                # 确保边的唯一性
                if source_id > target_id:
                    source_id, target_id = target_id, source_id
                
                edge_key = f"{source_id}_{target_id}"
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    result_edges.append({
                        "id": f"{edge_key}_z0.1",
                        "source": source_id,
                        "target": target_id,
                        "zoom_level": 0.1
                    })
            
            # 构建返回结果
            original_data = {
                "nodes": result_nodes,
                "edges": result_edges,
                "params": {
                    "zoom_level": 0.1,
                    "node_count": len(result_nodes),
                    "edge_count": len(result_edges),
                    "is_original": True
                }
            }
            
            process_time = time.time() - start_time
            print(f"原始图数据处理完成，耗时 {process_time:.2f} 秒，包含 {len(result_nodes)} 个节点和 {len(result_edges)} 条边")
            
            return jsonify(original_data)
        
        # 检查是否有预计算的数据
        if ZOOM_LEVEL_CLUSTERS is None or zoom_level not in ZOOM_LEVEL_CLUSTERS:
            # 尝试找到最接近的缩放等级
            zoom_levels = list(ZOOM_LEVEL_CLUSTERS.keys()) if ZOOM_LEVEL_CLUSTERS else [0.3, 0.5, 1.0]
            
            # 处理特殊情况：如果缩放等级小于等于0.2，使用0.3的聚类数据
            if zoom_level <= 0.2 and 0.3 in ZOOM_LEVEL_CLUSTERS:
                print(f"缩放等级 {zoom_level} 小于等于0.2，使用0.3的聚类数据")
                return jsonify(ZOOM_LEVEL_CLUSTERS[0.3])
            
            closest_level = min(zoom_levels, key=lambda x: abs(x - zoom_level))
            
            if closest_level in ZOOM_LEVEL_CLUSTERS:
                print(f"找到最接近的缩放等级: {closest_level}")
                return jsonify(ZOOM_LEVEL_CLUSTERS[closest_level])
            else:
                return jsonify({"error": f"缩放等级 {zoom_level} 的聚类数据未找到"}), 404
            
        # 返回预计算的数据
        return jsonify(ZOOM_LEVEL_CLUSTERS[zoom_level])
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"处理缩放等级聚类请求时出错: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

# 定义缩放等级参数映射函数
def get_dbscan_params_for_zoom_and_size(zoom_level, node_count):
    """
    根据缩放等级和节点数量返回合适的DBSCAN参数
    
    参数:
        zoom_level: 缩放等级，范围从0.1（最近）到5（最远）
        node_count: 节点总数
        
    返回:
        (eps, min_samples): DBSCAN参数元组
    """
    # 基于节点数量调整基础参数
    if node_count < 100:
        base_min_samples = 3
        size_factor = 0.01
    elif node_count < 500:
        base_min_samples = 4
        size_factor = 0.1
    elif node_count < 1000:
        base_min_samples = 5
        size_factor = 0.5
    elif node_count < 5000:
        base_min_samples = 6
        size_factor = 2
    else:
        base_min_samples = 8
        size_factor = 2.5
    
    # 根据缩放等级映射eps值
    # 注意: sigmajs中缩放等级越小表示放大越大，所以逻辑和之前相反
    # 范围在0.1-5之间，分成五个区间
    if zoom_level <= 0.2:  # 最近距离(街道级别)
        eps = 10 * size_factor
    elif zoom_level <= 0.3:
        eps = 15 * size_factor
    elif zoom_level <= 0.5:  # 近距离(社区级别)
        eps = 20 * size_factor
    elif zoom_level <= 1.0:  # 中等距离(城市级别)
        eps = 50 * size_factor

    
    return eps, base_min_samples

# 预计算所有缩放等级的聚类结果
def precompute_zoom_level_clusters_DBSCAN(graph):
    """
    为所有预定义的缩放等级预计算DBSCAN聚类结果
    
    参数:
        graph: 图对象
    """
    global ZOOM_LEVEL_CLUSTERS
    ZOOM_LEVEL_CLUSTERS = {}
    
    # 获取节点总数
    node_count = len(graph.vertices)
    print(f"开始为 {node_count} 个节点预计算不同缩放等级的聚类...")
    
    # 定义要处理的缩放等级
    # 适应sigmajs的缩放等级范围(0.1-5)
    zoom_levels = [0.3,0.5,1.0]
    
    for zoom_level in zoom_levels:
        print(f"预计算缩放等级 {zoom_level} 的聚类...")
        start_time = time.time()
        
        # 获取该缩放等级对应的DBSCAN参数
        eps, min_samples = get_dbscan_params_for_zoom_and_size(zoom_level, node_count)
        
        print(f"缩放等级 {zoom_level} 使用参数: eps={eps}, min_samples={min_samples}")
        
        # 应用DBSCAN算法
        try:
            cluster_labels, clusters = apply_dbscan(graph, eps=eps, min_samples=min_samples)
            
            # 创建DBSCAN实例以获取噪声点
            dbscan = DBSCAN(eps=eps, min_samples=min_samples)
            dbscan.fit(graph)
            noise_points = dbscan.get_noise_points(graph)
            
            # 生成相同格式的结果数据
            result_nodes = []
            result_edges = []
            
            # 为每个聚类选择代表节点
            cluster_representatives = {}
            vertex_to_cluster = {}
            
            for i, cluster in enumerate(clusters):
                if cluster:
                    # 选择第一个节点作为代表（也可以选择质心或其他策略）
                    representative = cluster[0]
                    cluster_representatives[i] = representative
                    
                    # 为该聚类的所有顶点建立映射
                    for vertex in cluster:
                        vertex_to_cluster[vertex.id] = i
                    
                    # 添加代表节点到结果中
                    result_nodes.append({
                        "id": representative.id,
                        "label": f"Cluster {i} (z{zoom_level})",
                        "x": representative.x,
                        "y": representative.y,
                        "size": len(cluster),
                        "cluster_id": i,
                        "cluster_size": len(cluster),
                        "eps": eps,
                        "zoom_level": zoom_level
                    })
            
            # 添加噪声点
            for noise_point in noise_points:
                result_nodes.append({
                    "id": noise_point.id,
                    "label": f"Noise {noise_point.id} (z{zoom_level})",
                    "x": noise_point.x,
                    "y": noise_point.y,
                    "size": 1,
                    "is_noise": True,
                    "zoom_level": zoom_level
                })
            
            # 生成边
            edge_set = set()
            for edge_id, edge in graph.edges.items():
                v1_id = edge.vertex1.id
                v2_id = edge.vertex2.id
                
                # 确定这两个顶点是属于聚类还是噪声点
                v1_is_noise = v1_id not in vertex_to_cluster
                v2_is_noise = v2_id not in vertex_to_cluster
                
                # 确定源节点和目标节点
                if v1_is_noise:
                    source_id = v1_id
                else:
                    cluster_id = vertex_to_cluster[v1_id]
                    source_id = cluster_representatives[cluster_id].id
                
                if v2_is_noise:
                    target_id = v2_id
                else:
                    cluster_id = vertex_to_cluster[v2_id]
                    target_id = cluster_representatives[cluster_id].id
                
                # 如果源节点和目标节点相同，跳过
                if source_id == target_id:
                    continue
                
                # 对源节点和目标节点排序，确保无向边的唯一性
                if source_id > target_id:
                    source_id, target_id = target_id, source_id
                
                # 添加到集合中进行去重
                edge_key = f"{source_id}_{target_id}"
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    result_edges.append({
                        "id": f"{edge_key}_z{zoom_level}",
                        "source": source_id,
                        "target": target_id,
                        "zoom_level": zoom_level
                    })
            
            # 存储结果
            ZOOM_LEVEL_CLUSTERS[zoom_level] = {
                "nodes": result_nodes,
                "edges": result_edges,
                "params": {
                    "eps": eps,
                    "min_samples": min_samples,
                    "node_count": node_count,
                    "zoom_level": zoom_level,
                    "cluster_count": len(clusters),
                    "noise_count": len(noise_points)
                }
            }
            
            process_time = time.time() - start_time
            print(f"缩放等级 {zoom_level} 聚类完成，耗时 {process_time:.2f} 秒，生成了 {len(result_nodes)} 个节点和 {len(result_edges)} 条边")
            
        except Exception as e:
            print(f"预计算缩放等级 {zoom_level} 的聚类时出错: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    print("所有缩放等级的聚类预计算完成")

@app.route('/api/kmeans_clusters')
def get_kmeans_clusters():
    """
    提供基于KMeans聚类的API端点
    使用KMeans算法对图中的节点进行聚类，返回每个聚类的质心节点
    """
    try:
        # 获取请求参数
        zoom_level = request.args.get('zoom_level', type=float)
        if zoom_level is None:
            return jsonify({"error": "缺少必要的zoom_level参数"}), 400
        
        print(f"收到KMeans聚类请求: zoom_level={zoom_level}")
        
        # 确保全局图对象已初始化
        global GRAPH
        if GRAPH is None:
            return jsonify({"error": "图数据尚未加载完成，请稍后再试"}), 500
        
        # 根据zoom_level设置K值
        if zoom_level <= 0.3:
            n_clusters = 1200
        elif zoom_level <= 0.5:
            n_clusters = 600
        else:
            n_clusters = 300
        
        print(f"KMeans聚类参数: n_clusters={n_clusters}")
        
        # 应用KMeans算法
        import time
        start_time = time.time()
        # cluster_labels, centroids = apply_kmeans(GRAPH, n_clusters=n_clusters)
        # 改为应用 Mini-Batch K-Means 算法
        batch_size = 256 # Mini-Batch 大小，可以根据需要调整
        print(f"Mini-Batch KMeans聚类参数: n_clusters={n_clusters}, batch_size={batch_size}")
        cluster_labels, centroids = apply_mini_batch_kmeans(
            GRAPH,
            n_clusters=n_clusters,
            batch_size=batch_size,
            max_iter=100, # Mini-batch 通常需要较少的迭代
            tol=1e-3,      # 收敛容忍度
            max_no_improvement=10 # 提前停止参数
        )

        clustering_time = time.time() - start_time
        print(f"Mini-Batch KMeans聚类完成，耗时 {clustering_time:.4f} 秒，共形成 {len(centroids)} 个聚类")
        
        # 构建聚类代表点（质心）节点
        result_nodes = []
        for i, centroid in enumerate(centroids):
            if centroid is not None and not (isinstance(centroid, float) and math.isnan(centroid)):
                result_nodes.append({
                    "id": f"centroid_{i}",
                    "label": f"Cluster {i}",
                    "x": float(centroid[0]),
                    "y": float(centroid[1]),
                    "size": 3,  # 可根据簇大小调整
                    "cluster_id": i,
                    "zoom_level": zoom_level
                })
        
        # 构建质心之间的边（如果原图中有边连接两个不同簇的点，则在对应质心之间连边，去重）
        result_edges = []
        edge_set = set()
        # 反向映射：顶点ID -> 簇ID
        vertex_to_cluster = cluster_labels
        for edge_id, edge in GRAPH.edges.items():
            v1_id = edge.vertex1.id
            v2_id = edge.vertex2.id
            c1 = vertex_to_cluster.get(v1_id)
            c2 = vertex_to_cluster.get(v2_id)
            if c1 is None or c2 is None or c1 == c2:
                continue
            # 质心节点ID
            source_id = f"centroid_{min(c1, c2)}"
            target_id = f"centroid_{max(c1, c2)}"
            edge_key = f"{source_id}_{target_id}"
            if edge_key not in edge_set:
                edge_set.add(edge_key)
                result_edges.append({
                    "id": f"{edge_key}_z{zoom_level}",
                    "source": source_id,
                    "target": target_id,
                    "zoom_level": zoom_level
                })
        
        # 构建返回结果
        result = {
            "nodes": result_nodes,
            "edges": result_edges,
            "params": {
                "n_clusters": n_clusters,
                "zoom_level": zoom_level,
                "node_count": len(result_nodes),
                "edge_count": len(result_edges)
            }
        }
        print(f"返回 {len(result_nodes)} 个质心节点和 {len(result_edges)} 条边")
        return jsonify(result)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"处理KMeans聚类请求时出错: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

# 预计算所有缩放等级的KMeans聚类结果

def precompute_zoom_level_clusters_KMeans(graph):
    """
    为所有预定义的缩放等级预计算Mini-Batch KMeans聚类结果
    参数:
        graph: 图对象
    """
    global ZOOM_LEVEL_CLUSTERS
    ZOOM_LEVEL_CLUSTERS = {}
    
    node_count = len(graph.vertices)
    print(f"开始为 {node_count} 个节点预计算不同缩放等级的KMeans聚类...")
    
    # 定义要处理的缩放等级
    zoom_levels = [0.3, 0.5, 1.0]
    for zoom_level in zoom_levels:
        print(f"预计算缩放等级 {zoom_level} 的KMeans聚类...")
        start_time = time.time()
        # 根据缩放等级设置K值
        if zoom_level <= 0.3:
            n_clusters = 1200
        elif zoom_level <= 0.5:
            n_clusters = 600
        else:
            n_clusters = 300
        batch_size = 256
        print(f"Mini-Batch KMeans参数: n_clusters={n_clusters}, batch_size={batch_size}")
        # 聚类
        cluster_labels, centroids = apply_mini_batch_kmeans(
            graph,
            n_clusters=n_clusters,
            batch_size=batch_size,
            max_iter=100,
            tol=1e-3,
            max_no_improvement=10
        )
        # 构建聚类代表点（质心）节点
        result_nodes = []
        for i, centroid in enumerate(centroids):
            if centroid is not None and not (isinstance(centroid, float) and math.isnan(centroid)):
                result_nodes.append({
                    "id": f"centroid_{i}",
                    "label": f"Cluster {i} (z{zoom_level})",
                    "x": float(centroid[0]),
                    "y": float(centroid[1]),
                    "size": 3,
                    "cluster_id": i,
                    "zoom_level": zoom_level
                })
        # 构建质心之间的边（如果原图中有边连接两个不同簇的点，则在对应质心之间连边，去重）
        result_edges = []
        edge_set = set()
        vertex_to_cluster = cluster_labels
        for edge_id, edge in graph.edges.items():
            v1_id = edge.vertex1.id
            v2_id = edge.vertex2.id
            c1 = vertex_to_cluster.get(v1_id)
            c2 = vertex_to_cluster.get(v2_id)
            if c1 is None or c2 is None or c1 == c2:
                continue
            source_id = f"centroid_{min(c1, c2)}"
            target_id = f"centroid_{max(c1, c2)}"
            edge_key = f"{source_id}_{target_id}"
            if edge_key not in edge_set:
                edge_set.add(edge_key)
                result_edges.append({
                    "id": f"{edge_key}_z{zoom_level}",
                    "source": source_id,
                    "target": target_id,
                    "zoom_level": zoom_level
                })
        # 存储结果
        ZOOM_LEVEL_CLUSTERS[zoom_level] = {
            "nodes": result_nodes,
            "edges": result_edges,
            "params": {
                "n_clusters": n_clusters,
                "zoom_level": zoom_level,
                "node_count": len(result_nodes),
                "edge_count": len(result_edges)
            }
        }
        process_time = time.time() - start_time
        print(f"缩放等级 {zoom_level} KMeans聚类完成，耗时 {process_time:.2f} 秒，生成了 {len(result_nodes)} 个节点和 {len(result_edges)} 条边")
    print("所有缩放等级的KMeans聚类预计算完成")

def run_server(host='127.0.0.1', port=5000, debug=True):
    """
    运行Flask服务器
    
    参数:
        host: 服务器主机地址，默认为本地
        port: 服务器端口，默认为5000
        debug: 是否开启调试模式
    """
    # 确保数据目录存在
    os.makedirs(os.path.join(os.path.dirname(__file__), '..', '..', 'data'), exist_ok=True)
    
    # 初始化全局图对象
    global GRAPH
    try:
        from src.models.graph import Graph
        from src.models.vertex import Vertex
        from src.models.edge import Edge
        
        print("服务器启动: 正在加载地图数据...")
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'map_data.json')
        with open(data_file, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        
        # 构建图对象
        start_time = time.time()
        GRAPH = Graph()
        
        # 添加顶点
        vertex_map = {}
        for node in map_data.get('nodes', []):
            vertex = GRAPH.create_vertex(float(node['x']), float(node['y']))
            vertex_map[node['id']] = vertex
        
        # 添加边
        for edge in map_data.get('edges', []):
            source_id = edge.get('source')
            target_id = edge.get('target')
            if source_id in vertex_map and target_id in vertex_map:
                GRAPH.create_edge(vertex_map[source_id], vertex_map[target_id])
        
        # 构建空间索引
        GRAPH.build_spatial_index()
        load_time = time.time() - start_time
        print(f"地图数据加载完成，耗时 {load_time:.2f} 秒，共 {len(GRAPH.vertices)} 个顶点和 {len(GRAPH.edges)} 条边")
        
        # 预计算不同缩放等级的聚类结果
        # 如需切换为DBSCAN预计算，请改为 precompute_zoom_level_clusters_DBSCAN(GRAPH)
        precompute_zoom_level_clusters_KMeans(GRAPH)
        
    except Exception as e:
        import traceback
        print(f"图数据加载失败: {str(e)}")
        print(traceback.format_exc())
        print("服务器将继续启动，但空间查询功能可能不可用")
    
    # 启动服务器
    print(f"启动Flask服务器: http://{host}:{port}")
    app.run(host=host, port=port, debug=debug) 