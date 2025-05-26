from src.models.graph import Graph
from src.models.quadtree import QuadTree
from collections import deque


class DBSCAN:
    """
    基于四叉树优化的DBSCAN聚类算法实现
    
    使用四叉树加速空间邻域查询，提高DBSCAN算法在大规模数据上的性能
    """
    
    def __init__(self, eps=1.0, min_samples=5):
        """
        初始化DBSCAN算法
        
        参数:
            eps: 邻域半径，在此半径内的顶点被视为邻居
            min_samples: 成为核心点所需的最小邻居数量
        """
        self.eps = eps
        self.min_samples = min_samples
        self.cluster_labels = {}  # 每个点的聚类标签
        self.clusters = []        # 每个聚类的点集合
    
    def fit(self, graph):
        """
        对图中的顶点执行DBSCAN聚类
        
        参数:
            graph: Graph对象，包含要聚类的顶点
            
        返回:
            self: 返回自身，便于链式调用
        """
        # 确保图已经构建了空间索引
        if not graph.spatial_index:
            graph.build_spatial_index()
            
        if not graph.vertices:
            self.cluster_labels = {}
            self.clusters = []
            return self
            
        self.cluster_labels = {v_id: -1 for v_id in graph.vertices.keys()}  # 初始化所有点为噪音点
        visited = set()  # 记录已访问的顶点
        cluster_id = 0   # 当前聚类ID
        self.clusters = []  # 清空聚类列表
        
        core_points_count = 0  # 核心点计数
        
        # 遍历所有顶点
        for vertex_id, vertex in graph.vertices.items():
            # 如果顶点已经被访问，跳过
            if vertex_id in visited:
                continue
                
            # 获取当前顶点的邻居
            neighbors = self._get_neighbors(vertex, graph)
            
            # 如果邻居数量不小于min_samples，则该点是核心点
            if len(neighbors) >= self.min_samples:
                core_points_count += 1
                
                # 创建一个新的聚类
                current_cluster = []
                self.clusters.append(current_cluster)
                
                # 核心点自己加入聚类
                self.cluster_labels[vertex_id] = cluster_id
                current_cluster.append(vertex)
                visited.add(vertex_id)
                
                # 将核心点的所有邻居加入当前聚类（仅限直接邻居，不再链式扩展）
                for neighbor in neighbors:
                    if neighbor.id not in visited:
                        visited.add(neighbor.id)
                        self.cluster_labels[neighbor.id] = cluster_id
                        current_cluster.append(neighbor)
                
                # 一个局部聚类处理完毕，准备下一个
                cluster_id += 1
        
        print(f"找到 {core_points_count} 个核心点")
        return self
    
    def _get_neighbors(self, vertex, graph):
        """
        使用四叉树查找一个顶点在eps半径内的所有邻居
        
        参数:
            vertex: 中心顶点
            graph: 包含四叉树空间索引的图对象
            
        返回:
            邻居顶点列表
        """
        # 创建一个包含当前点在eps范围内的矩形区域
        x, y = vertex.x, vertex.y
        range_rect = (x - self.eps, y - self.eps, x + self.eps, y + self.eps)
        
        # 使用四叉树的range查询获取该矩形内的所有点
        candidates = graph.spatial_index.query_range(range_rect)
        
        # 过滤出在eps圆形范围内的点
        neighbors = []
        for candidate in candidates:
            if vertex.distance_to(candidate) <= self.eps:
                neighbors.append(candidate)
                
        return neighbors
    
    def get_cluster_labels(self):
        """
        获取每个顶点的聚类标签
        
        返回:
            字典，键为顶点ID，值为聚类ID（-1表示噪声点）
        """
        return self.cluster_labels
    
    def get_clusters(self):
        """
        获取所有聚类
        
        返回:
            列表，包含每个聚类中的顶点列表
        """
        return self.clusters
    
    def get_noise_points(self, graph):
        """
        获取所有被标记为噪声的点
        
        参数:
            graph: 图对象，包含所有顶点
            
        返回:
            噪声点列表
        """
        noise_points = []
        for vertex_id, label in self.cluster_labels.items():
            if label == -1:
                noise_points.append(graph.vertices[vertex_id])
        return noise_points


def apply_dbscan(graph, eps=1.0, min_samples=5):
    """
    应用DBSCAN算法对图中的顶点进行聚类的便捷函数
    
    参数:
        graph: 图对象，包含要聚类的顶点
        eps: 邻域半径
        min_samples: 成为核心点所需的最小邻居数量
        
    返回:
        cluster_labels: 字典，键为顶点ID，值为聚类ID
        clusters: 列表，包含每个聚类中的顶点列表
    """
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    dbscan.fit(graph)
    return dbscan.get_cluster_labels(), dbscan.get_clusters()


