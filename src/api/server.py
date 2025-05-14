"""
Flask服务器
提供获取地图数据的API
"""
from flask import Flask, jsonify, send_from_directory
import json
import os
import time

# 创建Flask应用
app = Flask(__name__, static_folder='../frontend')

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
    
@app.route('/api/map-data/overview')
def get_map_overview():
    """
    提供地图概览数据的API端点
    基于距离阈值计算超节点和对应边，返回简化的地图数据
    """
    print("开始处理地图概览请求...")
    try:
        # 从本地文件加载原始地图数据
        data_file = 'D:\\SourcesForCode\\CodeForPython\\navigation\\data\\map_data.json'
        print(f"准备加载数据文件: {data_file}")
        with open(data_file, 'r', encoding='utf-8') as f:
            original_map_data = json.load(f)
        
        # 距离阈值参数 - 可以根据需要调整
        distance_threshold = 50
        
        # 从原始数据中提取顶点和边
        vertices = original_map_data.get('nodes', [])
        edges = original_map_data.get('edges', [])
        print(f"数据加载完成。顶点数量: {len(vertices)}, 边数量: {len(edges)}")
        
        # 实现基于距离的聚类算法
        print("开始聚类算法...")
        clusters = {}  # 存储聚类结果
        processed = set()  # 记录已处理的顶点ID
        
        # 为每个未处理的顶点创建聚类
        vertex_count = len(vertices)
        for idx, vertex in enumerate(vertices):
            if idx % 50 == 0:  # 每处理50个顶点打印一次进度
                print(f"正在处理顶点 {idx}/{vertex_count}...")
                
            vertex_id = vertex['id']
            if vertex_id in processed:
                continue
                
            # 创建新的聚类
            cluster_id = f"cluster_{len(clusters)}"
            clusters[cluster_id] = {
                "center_x": float(vertex['x']),
                "center_y": float(vertex['y']),
                "vertices": [vertex_id],
                "weight": 1  # 初始权重为1
            }
            processed.add(vertex_id)
            
            # 查找距离当前中心点小于阈值的所有顶点
            nearby_count = 0
            for other in vertices:
                other_id = other['id']
                if other_id in processed:
                    continue
                    
                # 计算距离
                dx = float(vertex['x']) - float(other['x'])
                dy = float(vertex['y']) - float(other['y'])
                distance = (dx**2 + dy**2)**0.5
                
                # 如果距离小于阈值，将此顶点加入聚类
                if distance < distance_threshold:
                    clusters[cluster_id]["vertices"].append(other_id)
                    clusters[cluster_id]["weight"] += 1
                    processed.add(other_id)
                    nearby_count += 1
                    
                    # 更新聚类中心点（加权平均）
                    w = clusters[cluster_id]["weight"]
                    clusters[cluster_id]["center_x"] = (clusters[cluster_id]["center_x"] * (w-1) + float(other['x'])) / w
                    clusters[cluster_id]["center_y"] = (clusters[cluster_id]["center_y"] * (w-1) + float(other['y'])) / w
            
            if idx % 50 == 0:
                print(f"聚类 {cluster_id} 包含 {nearby_count+1} 个顶点")
        
        print(f"聚类完成，共生成 {len(clusters)} 个聚类")
        
        # 生成超节点列表
        print("生成超节点...")
        nodes = []
        for cluster_id, cluster in clusters.items():
            nodes.append({
                "id": cluster_id,
                "label": cluster_id,
                "x": cluster["center_x"],
                "y": cluster["center_y"],
                "size": 0.1 * cluster["weight"],  # 添加size属性，根据权重计算
                "weight": cluster["weight"],
                "fixed": True
            })
        
        # 生成超边
        print("开始生成超边...")
        super_edges = []
        edge_id = 0
        
        # 使用更高效的方法构建顶点邻接表
        print("构建邻接表...")
        adjacency = {}
        for edge in edges:
            source = edge.get("source", None)
            target = edge.get("target", None)
            
            if source is not None and target is not None:
                if source not in adjacency:
                    adjacency[source] = set()
                if target not in adjacency:
                    adjacency[target] = set()
                
                adjacency[source].add(target)
                adjacency[target].add(source)
        
        # 生成超边
        print("开始生成超边...")
        for c1_id, c1 in clusters.items():
            for c2_id, c2 in clusters.items():
                if c1_id >= c2_id:  # 只处理上三角矩阵
                    continue
                    
                # 检查两个超节点之间是否有边，使用邻接表
                has_connection = False
                
                # 只需检查第一个聚类中的顶点是否与第二个聚类的顶点相连
                for v1 in c1["vertices"]:
                    if v1 not in adjacency:
                        continue
                        
                    # 检查v1的邻接点是否有任何一个在c2中
                    v1_neighbors = adjacency[v1]
                    for v2 in c2["vertices"]:
                        if v2 in v1_neighbors:
                            has_connection = True
                            break
                    
                    if has_connection:
                        break
                
                # 如果有连接，创建超边
                if has_connection:
                    super_edge_id = f"super_edge_{edge_id}"
                    edge_id += 1
                    super_edges.append({
                        "id": super_edge_id,
                        "source": c1_id,
                        "target": c2_id
                    })
        
        # 组装最终返回的数据
        overview_data = {
            "nodes": nodes,
            "edges": super_edges
        }
        
        print(f"概览数据生成完成。生成了 {len(nodes)} 个超节点和 {len(super_edges)} 条超边")
        return jsonify(overview_data)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"处理发生错误: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

@app.route('/')
def index():
    """提供前端页面"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """提供其他静态文件"""
    return send_from_directory(app.static_folder, path)

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
    
    # 启动服务器
    print(f"启动Flask服务器: http://{host}:{port}")
    app.run(host=host, port=port, debug=debug) 