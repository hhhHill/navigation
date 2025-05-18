"""
图类，表示整个地图及其所有顶点和边
"""
import math
from collections import defaultdict, deque  # 添加deque用于BFS
from .quadtree import QuadTree

class Graph:
    """
    图类，表示整个地图
    
    属性:
        vertices: 图中所有顶点的字典 {id: vertex}
        edges: 图中所有边的字典 {id: edge}
        spatial_index: 空间索引结构
    """
    
    def __init__(self):
        """初始化空图"""
        self.vertices = {}  # id -> vertex
        self.edges = {}     # id -> edge
        self.spatial_index = None  # 空间索引，后续实现
        self.next_vertex_id = 0
        self.next_edge_id = 0
    
    def add_vertex(self, vertex):
        """
        添加顶点到图中
        
        参数:
            vertex: 要添加的顶点
            
        返回:
            添加的顶点
        """
        self.vertices[vertex.id] = vertex
        
        # 如果存在空间索引，则添加到索引中
        if self.spatial_index:
            self.spatial_index.insert(vertex)
            
        return vertex
    
    def create_vertex(self, x, y):
        """
        创建并添加一个新顶点
        
        参数:
            x: x坐标
            y: y坐标
            
        返回:
            创建的顶点
        """
        from .vertex import Vertex
        vertex_id = self.next_vertex_id
        self.next_vertex_id += 1
        vertex = Vertex(vertex_id, x, y)
        return self.add_vertex(vertex)
    
    def add_edge(self, edge):
        """
        添加边到图中
        
        参数:
            edge: 要添加的边
            
        返回:
            添加的边
        """
        self.edges[edge.id] = edge
        return edge
    
    def create_edge(self, vertex1, vertex2, capacity=100):
        """
        创建并添加一个新边
        
        参数:
            vertex1: 第一个顶点
            vertex2: 第二个顶点
            capacity: 道路容量
            
        返回:
            创建的边
        """
        from .edge import Edge
        
        # 检查顶点是否存在于图中
        if vertex1.id not in self.vertices or vertex2.id not in self.vertices:
            raise ValueError("顶点必须已经存在于图中")
        
        # 检查是否已存在连接这两个顶点的边
        for edge in vertex1.edges:
            if (edge.vertex1 == vertex1 and edge.vertex2 == vertex2) or \
               (edge.vertex1 == vertex2 and edge.vertex2 == vertex1):
                return edge
        
        edge_id = self.next_edge_id
        self.next_edge_id += 1
        edge = Edge(edge_id, vertex1, vertex2, capacity)
        return self.add_edge(edge)
    
    def get_vertex(self, vertex_id):
        """
        通过ID获取顶点
        
        参数:
            vertex_id: 顶点ID
            
        返回:
            顶点对象，如果不存在则为None
        """
        return self.vertices.get(vertex_id)
    
    def get_edge(self, edge_id):
        """
        通过ID获取边
        
        参数:
            edge_id: 边ID
            
        返回:
            边对象，如果不存在则为None
        """
        return self.edges.get(edge_id)
    
    def get_edge_between(self, vertex1, vertex2):
        """
        获取连接两个顶点的边
        
        参数:
            vertex1: 第一个顶点
            vertex2: 第二个顶点
            
        返回:
            连接两个顶点的边，如果不存在则为None
        """
        for edge in vertex1.edges:
            if (edge.vertex1 == vertex1 and edge.vertex2 == vertex2) or \
               (edge.vertex1 == vertex2 and edge.vertex2 == vertex1):
                return edge
        return None
    
    def build_spatial_index(self):
        """
        构建空间索引，用于快速查找顶点
        """
        if not self.vertices:
            return
        
        # 确定图的边界
        x_values = [v.x for v in self.vertices.values()]
        y_values = [v.y for v in self.vertices.values()]
        
        x_min, x_max = min(x_values), max(x_values)
        y_min, y_max = min(y_values), max(y_values)
        
        # 为了确保边界包含所有点，增加一点边距
        padding = max((x_max - x_min), (y_max - y_min)) * 0.01
        boundary = (x_min - padding, y_min - padding, x_max + padding, y_max + padding)
        
        # 创建四叉树
        self.spatial_index = QuadTree(boundary)
        
        # 将所有顶点插入四叉树
        for vertex in self.vertices.values():
            self.spatial_index.insert(vertex)
        
        return self.spatial_index
    
    def get_nearby_vertices(self, x, y, n=100):
        """
        获取距离指定坐标最近的n个顶点
        
        参数:
            x: x坐标
            y: y坐标
            n: 返回的顶点数量
            
        返回:
            顶点列表，按距离排序
        """
        # 如果没有空间索引，则构建一个
        if not self.spatial_index:
            self.build_spatial_index()
        
        # 使用空间索引进行快速查询
        if self.spatial_index:
            # 先获取一个合理的查询范围
            # 使用当前的最大边界对角线长度作为初始查询半径
            boundary = self.spatial_index.boundary
            x_min, y_min, x_max, y_max = boundary
            max_dist = math.sqrt((x_max - x_min) ** 2 + (y_max - y_min) ** 2)
            initial_radius = max_dist / 10  # 初始半径设为地图对角线的1/10
            
            # 递增查询半径直到找到足够的顶点
            nearby = []
            radius = initial_radius
            while len(nearby) < n and radius <= max_dist:
                nearby = self.spatial_index.query_nearest(x, y, max_count=n, max_distance=radius)
                radius *= 2  # 每次查询半径翻倍
            
            return nearby
        
        # 如果没有空间索引，则使用暴力方法计算所有顶点到指定坐标的距离
        distances = []
        for vertex in self.vertices.values():
            dist = ((vertex.x - x) ** 2 + (vertex.y - y) ** 2) ** 0.5
            distances.append((dist, vertex))
        
        # 按距离排序并返回前n个
        distances.sort(key=lambda x: x[0])
        return [v for _, v in distances[:n]]
    
    def get_subgraph(self, vertices):
        """
        根据顶点集合获取子图
        
        参数:
            vertices: 顶点集合
            
        返回:
            包含这些顶点及其间边的子图
        """
        subgraph = Graph()
        
        # 添加顶点
        for vertex in vertices:
            new_vertex = subgraph.create_vertex(vertex.x, vertex.y)
            
        # 创建顶点映射
        vertex_map = {v.id: subgraph.vertices[i] for i, v in enumerate(vertices)}
        
        # 添加边
        added_edges = set()
        for vertex in vertices:
            for edge in vertex.edges:
                # 检查该边的两个顶点是否都在子图中
                if edge.vertex1 in vertices and edge.vertex2 in vertices:
                    edge_key = tuple(sorted([edge.vertex1.id, edge.vertex2.id]))
                    if edge_key not in added_edges:
                        v1 = vertex_map[edge.vertex1.id]
                        v2 = vertex_map[edge.vertex2.id]
                        subgraph.create_edge(v1, v2, edge.capacity)
                        added_edges.add(edge_key)
        
        return subgraph
    
    def is_connected(self):
        """
        检查图是否连通
        
        返回:
            如果图连通则为True，否则为False
        """
        # 空图或只有一个顶点的图被认为是连通的
        if len(self.vertices) <= 1:
            print("DEBUG: 图顶点数量小于等于1，视为连通")
            return True
        
        print(f"DEBUG: 图共有顶点 {len(self.vertices)} 个")
        
        # 使用BFS检查连通性
        visited = set()
        start_vertex_id = next(iter(self.vertices.keys()))
        start_vertex = self.vertices[start_vertex_id]
        queue = [start_vertex]
        
        print(f"DEBUG: 从顶点 {start_vertex.id} 开始BFS遍历")
        
        while queue:
            vertex = queue.pop(0)
            if vertex.id not in visited:
                visited.add(vertex.id)
                # 获取所有邻居顶点
                neighbors = vertex.get_neighbors()
                # print(f"DEBUG: 顶点 {vertex.id} 的邻居: {[n.id for n in neighbors]}")
                
                for neighbor in neighbors:
                    if neighbor.id not in visited:
                        queue.append(neighbor)
        
        # print(f"DEBUG: 已访问顶点数: {len(visited)}, 总顶点数: {len(self.vertices)}")
        # print(f"DEBUG: 已访问顶点ID: {visited}")
        # print(f"DEBUG: 图中所有顶点ID: {list(self.vertices.keys())}")
        
        # 检查是否所有顶点都被访问
        return len(visited) == len(self.vertices)
    
    def get_all_paths(self, start, end, max_depth=10):
        """
        获取从起点到终点的所有路径
        
        参数:
            start: 起点
            end: 终点
            max_depth: 最大搜索深度
            
        返回:
            路径列表，每个路径是顶点列表
        """
        def dfs(current, path, depth):
            if depth > max_depth:
                return []
            
            if current == end:
                return [path.copy()]
            
            results = []
            for neighbor in current.get_neighbors():
                if neighbor not in path:
                    path.append(neighbor)
                    results.extend(dfs(neighbor, path, depth + 1))
                    path.pop()
            
            return results
        
        return dfs(start, [start], 0)
    
    def __str__(self):
        """返回图的字符串表示"""
        return f"Graph(vertices={len(self.vertices)}, edges={len(self.edges)})"
    
    def __repr__(self):
        """返回图的详细表示"""
        return self.__str__()
    
    def apply_dbscan_clustering(self, eps, min_samples):
        """
        使用四叉树优化的DBSCAN算法对图中的顶点进行聚类
        
        参数:
            eps: 邻域半径，在此半径内的顶点被视为邻居
            min_samples: 成为核心点所需的最小邻居数量
            
        返回:
            cluster_labels: 字典，键为顶点ID，值为其所属的聚类ID（-1表示噪声点）
            clusters: 列表，包含每个聚类中的顶点列表
        """
        # 如果没有空间索引，先构建四叉树
        if not self.spatial_index:
            self.build_spatial_index()
            
        if not self.vertices:
            return {}, []
            
        cluster_labels = {v_id: -1 for v_id in self.vertices.keys()}  # 初始化所有点为噪音点
        visited = set()  # 记录已访问的顶点
        cluster_id = 0   # 当前聚类ID
        clusters = []    # 存储所有聚类
        
        # 定义一个辅助函数，使用四叉树查找eps半径内的邻居
        def get_neighbors(vertex, eps):
            # 创建一个包含当前点在eps范围内的矩形区域
            x, y = vertex.x, vertex.y
            range_rect = (x - eps, y - eps, x + eps, y + eps)
            
            # 使用四叉树的range查询获取该矩形内的所有点
            candidates = self.spatial_index.query_range(range_rect)
            
            # 过滤出在eps圆形范围内的点
            neighbors = []
            for candidate in candidates:
                if vertex.distance_to(candidate) <= eps:
                    neighbors.append(candidate)
                    
            return neighbors
        
        # 遍历所有顶点进行聚类
        for vertex_id, vertex in self.vertices.items():
            if vertex_id in visited:
                continue
                
            visited.add(vertex_id)
            
            # 获取当前顶点的邻居
            neighbors = get_neighbors(vertex, eps)
            
            # 如果邻居数量不足，标记为噪声点并继续
            if len(neighbors) < min_samples:
                continue
                
            # 当前点是核心点，开始一个新聚类
            current_cluster = []
            clusters.append(current_cluster)
            cluster_labels[vertex_id] = cluster_id
            current_cluster.append(vertex)
            
            # 使用BFS扩展当前聚类
            queue = deque(neighbors)
            processed = {vertex_id}  # 记录已处理的顶点，避免重复处理
            
            while queue:
                current = queue.popleft()
                current_id = current.id
                
                # 如果已处理过，跳过
                if current_id in processed:
                    continue
                    
                processed.add(current_id)
                visited.add(current_id)
                
                # 将当前点加入到当前聚类
                cluster_labels[current_id] = cluster_id
                current_cluster.append(current)
                
                # 检查当前点是否也是核心点
                current_neighbors = get_neighbors(current, eps)
                
                if len(current_neighbors) >= min_samples:
                    # 当前点也是核心点，将其未处理的邻居加入队列
                    for neighbor in current_neighbors:
                        if neighbor.id not in processed:
                            queue.append(neighbor)
            
            # 当前聚类处理完毕，准备下一个聚类
            cluster_id += 1
        
        return cluster_labels, clusters 