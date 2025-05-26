"""
随机地图生成功能模块
"""
import random
import math
from ..models.graph import Graph
from ..models.vertex import Vertex
from ..models.edge import Edge
from .delaunay import create_delaunay_triangulation

def generate_random_points(n=10000, x_min=0, y_min=0, x_max=1000, y_max=1000, min_distance=1.0):
    """
    生成随机分布的点集
    
    参数:
        n: 要生成的点数量
        x_min: x坐标最小值
        y_min: y坐标最小值
        x_max: x坐标最大值
        y_max: y坐标最大值
        min_distance: 任意两点之间的最小距离
        
    返回:
        生成的顶点列表
    """
    vertices = []
    attempts = 0
    max_attempts = n * 10  # 最大尝试次数，避免无限循环
    
    i = 0
    while i < n and attempts < max_attempts:
        # 生成随机坐标
        x = random.uniform(x_min, x_max)
        y = random.uniform(y_min, y_max)
        
        # 检查与已有点的最小距离
        too_close = False
        for v in vertices:
            dist = ((v.x - x) ** 2 + (v.y - y) ** 2) ** 0.5
            if dist < min_distance:
                too_close = True
                break
        
        attempts += 1
        
        # 如果该点与已有点太近，重新生成
        if too_close:
            continue
        
        # 创建新顶点并添加到列表
        vertex = Vertex(i, x, y)
        vertices.append(vertex)
        i += 1
    
    # 如果尝试次数过多仍未生成足够的点，减少最小距离要求
    if len(vertices) < n:
        remaining = n - len(vertices)
        reduced_min_distance = min_distance * 0.5
        
        i = len(vertices)
        while i < n:
            x = random.uniform(x_min, x_max)
            y = random.uniform(y_min, y_max)
            
            # 使用较小的最小距离检查
            too_close = False
            for v in vertices:
                dist = ((v.x - x) ** 2 + (v.y - y) ** 2) ** 0.5
                if dist < reduced_min_distance:
                    too_close = True
                    break
            
            if not too_close:
                vertex = Vertex(i, x, y)
                vertices.append(vertex)
                i += 1
    
    return vertices

def generate_connected_map(vertices, edge_factor=2.5, capacity_range=(50, 200)):
    """
    生成连通的地图
    
    参数:
        vertices: 顶点列表
        edge_factor: 控制边数量的因子
        capacity_range: 道路容量范围(min, max)
        
    返回:
        包含所有顶点和边的图
    """
    # 创建新图
    graph = Graph()
    
    # 添加所有顶点到图
    vertex_map = {}  # 原始顶点到图顶点的映射
    for i, v in enumerate(vertices):
        graph_vertex = graph.create_vertex(v.x, v.y)
        vertex_map[v] = graph_vertex
    
    # 使用Delaunay三角剖分创建初始连接
    triangulation = create_delaunay_triangulation(vertices)
    
    # 从三角剖分中提取边
    edges = set()
    for triangle in triangulation:
        v1, v2, v3 = triangle
        edges.add(tuple(sorted([v1.id, v2.id])))
        edges.add(tuple(sorted([v2.id, v3.id])))
        edges.add(tuple(sorted([v3.id, v1.id])))
    
    # 添加边到图
    for v1_id, v2_id in edges:
        v1 = graph.get_vertex(v1_id)
        v2 = graph.get_vertex(v2_id)
        graph.create_edge(v1, v2)
    
    print(f"DEBUG: 三角剖分结束")
    # 确保图连通
    ensure_connectivity(graph)
    print(f"DEBUG: 确保图连通结束")
    # 随机添加额外的边以增加道路网络密度
    add_additional_edges(graph, edge_factor)
    print(f"DEBUG: 随机添加额外的边结束")
    print(f"DEBUG: 连通图执行完毕")
    return graph

def ensure_connectivity(graph):
    """
    确保图是连通的
    
    参数:
        graph: 要确保连通的图
    """
    # 检查图是否已经连通
    if graph.is_connected():
        return
    
    # 获取所有顶点
    vertices = list(graph.vertices.values())
    
    # 找到所有连通分量
    components = find_connected_components(graph)
    
    # 连接所有分量
    for i in range(len(components) - 1):
        # 从相邻分量中选择距离最近的顶点对
        min_dist = float('inf')
        closest_pair = None
        
        for v1 in components[i]:
            for v2 in components[i + 1]:
                dist = v1.distance_to(v2)
                if dist < min_dist:
                    min_dist = dist
                    closest_pair = (v1, v2)
        
        # 添加连接边
        if closest_pair:
            v1, v2 = closest_pair
            graph.create_edge(v1, v2)

def find_connected_components(graph):
    """
    找到图中的所有连通分量
    
    参数:
        graph: 要分析的图
        
    返回:
        连通分量列表，每个分量是一个顶点集合
    """
    components = []
    unvisited = set(graph.vertices.values())
    
    while unvisited:
        # 从未访问顶点中取一个开始BFS
        start = next(iter(unvisited))
        component = set()
        queue = [start]
        
        while queue:
            vertex = queue.pop(0)
            if vertex in unvisited:
                component.add(vertex)
                unvisited.remove(vertex)
                for neighbor in vertex.get_neighbors():
                    if neighbor in unvisited:
                        queue.append(neighbor)
        
        components.append(component)
    
    return components

def add_additional_edges(graph, edge_factor):
    """
    添加额外的边以增加道路网络密度
    
    参数:
        graph: 要添加边的图
        edge_factor: 控制边数量的因子
    """
    n = len(graph.vertices)
    target_edges = int(n * edge_factor)
    current_edges = len(graph.edges)
    
    # 如果已有足够的边，不添加
    if current_edges >= target_edges:
        return
    
    vertices_list = list(graph.vertices.values())
    
    # 对于每个顶点，找到最近的几个顶点并尝试添加边
    for vertex in vertices_list:
        # 找到最近的顶点
        neighbors = []
        for other in vertices_list:
            if other != vertex:
                dist = vertex.distance_to(other)
                neighbors.append((dist, other))
        
        # 按距离排序
        neighbors.sort(key=lambda x: x[0])
        
        # 尝试连接到最近的几个顶点
        for dist, neighbor in neighbors[:10]:  # 限制只考虑最近的10个点
            # 如果已有边或道路会不合理地交叉，跳过
            if graph.get_edge_between(vertex, neighbor) or would_cross_existing_edges(graph, vertex, neighbor):
                continue
            
            # 添加新边
            graph.create_edge(vertex, neighbor)
            current_edges += 1
            
            # 如果已达到目标边数，结束
            if current_edges >= target_edges:
                return

def would_cross_existing_edges(graph, v1, v2):
    """
    检查添加新边是否会导致不合理的交叉
    
    参数:
        graph: 当前图
        v1: 第一个顶点
        v2: 第二个顶点
        
    返回:
        如果添加会导致不合理交叉则为True，否则为False
    """
    # 检查现有边是否会与新边交叉
    for edge in graph.edges.values():
        v3 = edge.vertex1
        v4 = edge.vertex2
        
        # 如果共享顶点，不会交叉
        if v1 == v3 or v1 == v4 or v2 == v3 or v2 == v4:
            continue
        
        # 检查边是否相交
        if do_segments_intersect(
            (v1.x, v1.y), (v2.x, v2.y),
            (v3.x, v3.y), (v4.x, v4.y)
        ):
            return True
    
    return False

def do_segments_intersect(p1, p2, p3, p4):
    """
    检查两条线段是否相交
    
    参数:
        p1: 第一条线段的起点 (x, y)
        p2: 第一条线段的终点 (x, y)
        p3: 第二条线段的起点 (x, y)
        p4: 第二条线段的终点 (x, y)
        
    返回:
        如果线段相交则为True，否则为False
    """
    # 计算方向
    d1 = direction(p3, p4, p1)
    d2 = direction(p3, p4, p2)
    d3 = direction(p1, p2, p3)
    d4 = direction(p1, p2, p4)
    
    # 如果方向不同，线段相交
    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True
    
    # 检查共线的情况
    if d1 == 0 and on_segment(p3, p4, p1):
        return True
    if d2 == 0 and on_segment(p3, p4, p2):
        return True
    if d3 == 0 and on_segment(p1, p2, p3):
        return True
    if d4 == 0 and on_segment(p1, p2, p4):
        return True
    
    return False

def direction(p1, p2, p3):
    """
    计算三点方向
    
    参数:
        p1: 点1 (x, y)
        p2: 点2 (x, y)
        p3: 点3 (x, y)
        
    返回:
        大于0表示逆时针，小于0表示顺时针，等于0表示共线
    """
    return (p3[1] - p1[1]) * (p2[0] - p1[0]) - (p2[1] - p1[1]) * (p3[0] - p1[0])

def on_segment(p1, p2, p3):
    """
    检查点p3是否在线段p1-p2上
    
    参数:
        p1: 线段起点 (x, y)
        p2: 线段终点 (x, y)
        p3: 检查点 (x, y)
        
    返回:
        如果p3在线段上则为True，否则为False
    """
    return (min(p1[0], p2[0]) <= p3[0] <= max(p1[0], p2[0]) and
            min(p1[1], p2[1]) <= p3[1] <= max(p1[1], p2[1]))

    
