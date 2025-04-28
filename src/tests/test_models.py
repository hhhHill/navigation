"""
测试数据模型模块
"""
import unittest
from ..models.vertex import Vertex
from ..models.edge import Edge
from ..models.graph import Graph

class TestVertex(unittest.TestCase):
    """测试顶点类"""
    
    def test_init(self):
        """测试顶点初始化"""
        vertex = Vertex(1, 10.0, 20.0)
        self.assertEqual(vertex.id, 1)
        self.assertEqual(vertex.x, 10.0)
        self.assertEqual(vertex.y, 20.0)
        self.assertEqual(len(vertex.edges), 0)
    
    def test_add_edge(self):
        """测试添加边"""
        vertex1 = Vertex(1, 10.0, 20.0)
        vertex2 = Vertex(2, 30.0, 40.0)
        edge = Edge(1, vertex1, vertex2)
        
        self.assertEqual(len(vertex1.edges), 1)
        self.assertEqual(len(vertex2.edges), 1)
        self.assertEqual(vertex1.edges[0], edge)
        self.assertEqual(vertex2.edges[0], edge)
    
    def test_get_neighbors(self):
        """测试获取邻居"""
        vertex1 = Vertex(1, 10.0, 20.0)
        vertex2 = Vertex(2, 30.0, 40.0)
        vertex3 = Vertex(3, 50.0, 60.0)
        
        edge1 = Edge(1, vertex1, vertex2)
        edge2 = Edge(2, vertex1, vertex3)
        
        neighbors = vertex1.get_neighbors()
        self.assertEqual(len(neighbors), 2)
        self.assertIn(vertex2, neighbors)
        self.assertIn(vertex3, neighbors)
    
    def test_distance_to(self):
        """测试距离计算"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        
        self.assertEqual(vertex1.distance_to(vertex2), 5.0)

class TestEdge(unittest.TestCase):
    """测试边类"""
    
    def test_init(self):
        """测试边初始化"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        edge = Edge(1, vertex1, vertex2, 100)
        
        self.assertEqual(edge.id, 1)
        self.assertEqual(edge.vertex1, vertex1)
        self.assertEqual(edge.vertex2, vertex2)
        self.assertEqual(edge.length, 5.0)
        self.assertEqual(edge.capacity, 100)
        self.assertEqual(edge.current_vehicles, 0)
    
    def test_get_other_vertex(self):
        """测试获取另一个顶点"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        edge = Edge(1, vertex1, vertex2)
        
        self.assertEqual(edge.get_other_vertex(vertex1), vertex2)
        self.assertEqual(edge.get_other_vertex(vertex2), vertex1)
        self.assertIsNone(edge.get_other_vertex(Vertex(3, 1.0, 1.0)))
    
    def test_travel_time(self):
        """测试通行时间计算"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        edge = Edge(1, vertex1, vertex2, 100)
        
        # 初始状态（无车辆）
        self.assertEqual(edge.travel_time(), 5.0)
        
        # 添加车辆，但未超过容量
        edge.current_vehicles = 50
        self.assertEqual(edge.travel_time(), 5.0)
        
        # 添加车辆，超过容量
        edge.current_vehicles = 150
        self.assertGreater(edge.travel_time(), 5.0)
    
    def test_update_vehicles(self):
        """测试更新车辆数"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        edge = Edge(1, vertex1, vertex2)
        
        edge.update_vehicles(10)
        self.assertEqual(edge.current_vehicles, 10)
        
        edge.update_vehicles(-5)
        self.assertEqual(edge.current_vehicles, 5)
        
        edge.update_vehicles(-10)
        self.assertEqual(edge.current_vehicles, 0)  # 不应低于0
    
    def test_get_congestion_level(self):
        """测试获取拥堵等级"""
        vertex1 = Vertex(1, 0.0, 0.0)
        vertex2 = Vertex(2, 3.0, 4.0)
        edge = Edge(1, vertex1, vertex2, 100)
        
        # 畅通
        edge.current_vehicles = 0
        self.assertEqual(edge.get_congestion_level(), 0)
        
        # 轻微拥堵
        edge.current_vehicles = 60
        self.assertEqual(edge.get_congestion_level(), 1)
        
        # 中度拥堵
        edge.current_vehicles = 85
        self.assertEqual(edge.get_congestion_level(), 2)
        
        # 严重拥堵
        edge.current_vehicles = 120
        self.assertEqual(edge.get_congestion_level(), 3)
        
        # 极度拥堵
        edge.current_vehicles = 200
        self.assertEqual(edge.get_congestion_level(), 4)

class TestGraph(unittest.TestCase):
    """测试图类"""
    
    def test_init(self):
        """测试图初始化"""
        graph = Graph()
        self.assertEqual(len(graph.vertices), 0)
        self.assertEqual(len(graph.edges), 0)
        self.assertIsNone(graph.spatial_index)
    
    def test_add_vertex(self):
        """测试添加顶点"""
        graph = Graph()
        vertex = Vertex(1, 10.0, 20.0)
        
        graph.add_vertex(vertex)
        self.assertEqual(len(graph.vertices), 1)
        self.assertEqual(graph.vertices[1], vertex)
    
    def test_create_vertex(self):
        """测试创建顶点"""
        graph = Graph()
        vertex = graph.create_vertex(10.0, 20.0)
        
        self.assertEqual(len(graph.vertices), 1)
        self.assertEqual(vertex.x, 10.0)
        self.assertEqual(vertex.y, 20.0)
        self.assertEqual(graph.next_vertex_id, 1)
    
    def test_add_edge(self):
        """测试添加边"""
        graph = Graph()
        vertex1 = graph.create_vertex(10.0, 20.0)
        vertex2 = graph.create_vertex(30.0, 40.0)
        edge = Edge(1, vertex1, vertex2)
        
        graph.add_edge(edge)
        self.assertEqual(len(graph.edges), 1)
        self.assertEqual(graph.edges[1], edge)
    
    def test_create_edge(self):
        """测试创建边"""
        graph = Graph()
        vertex1 = graph.create_vertex(10.0, 20.0)
        vertex2 = graph.create_vertex(30.0, 40.0)
        
        edge = graph.create_edge(vertex1, vertex2, 150)
        self.assertEqual(len(graph.edges), 1)
        self.assertEqual(edge.vertex1, vertex1)
        self.assertEqual(edge.vertex2, vertex2)
        self.assertEqual(edge.capacity, 150)
        self.assertEqual(graph.next_edge_id, 1)
    
    def test_get_nearby_vertices(self):
        """测试获取附近顶点"""
        graph = Graph()
        
        # 创建一些顶点
        v1 = graph.create_vertex(0.0, 0.0)   # 距离查询点(5,5)的距离为 7.07
        v2 = graph.create_vertex(10.0, 0.0)  # 距离查询点(5,5)的距离为 7.07
        v3 = graph.create_vertex(0.0, 10.0)  # 距离查询点(5,5)的距离为 7.07
        v4 = graph.create_vertex(10.0, 10.0) # 距离查询点(5,5)的距离为 7.07
        v5 = graph.create_vertex(5.0, 5.0)   # 距离查询点(5,5)的距离为 0.00
        
        # 测试获取附近顶点
        nearby = graph.get_nearby_vertices(5.0, 5.0, n=3)
        self.assertEqual(len(nearby), 3)
        self.assertEqual(nearby[0], v5)  # 最近的应该是v5
    
    def test_is_connected(self):
        """测试连通性检查"""
        graph = Graph()
        
        # 空图是连通的
        print("\nDEBUG: 测试空图连通性")
        self.assertTrue(graph.is_connected())
        
        # 创建一些顶点和边
        v1 = graph.create_vertex(0.0, 0.0)
        print(f"DEBUG: 创建顶点 v1, id={v1.id}")
        
        # 只有一个顶点，应该是连通的
        print("\nDEBUG: 测试单个顶点图连通性")
        self.assertTrue(graph.is_connected())
        
        v2 = graph.create_vertex(10.0, 0.0)
        print(f"DEBUG: 创建顶点 v2, id={v2.id}")
        v3 = graph.create_vertex(0.0, 10.0)
        print(f"DEBUG: 创建顶点 v3, id={v3.id}")
        
        # 添加一条边，连接v1和v2
        edge1 = graph.create_edge(v1, v2)
        print(f"DEBUG: 创建边 edge1, id={edge1.id}, 连接顶点 {v1.id} 和 {v2.id}")
        print(f"DEBUG: v1的边: {[e.id for e in v1.edges]}")
        print(f"DEBUG: v2的边: {[e.id for e in v2.edges]}")
        
        # v3还不与其他顶点相连，图应该不是连通的
        print("\nDEBUG: 测试v3未连接时的图连通性")
        self.assertFalse(graph.is_connected())
        
        # 添加一条边，连接v2和v3
        edge2 = graph.create_edge(v2, v3)
        print(f"DEBUG: 创建边 edge2, id={edge2.id}, 连接顶点 {v2.id} 和 {v3.id}")
        print(f"DEBUG: v2的边: {[e.id for e in v2.edges]}")
        print(f"DEBUG: v3的边: {[e.id for e in v3.edges]}")
        
        # 现在图应该是连通的
        print("\nDEBUG: 测试所有顶点连接后的图连通性")
        self.assertTrue(graph.is_connected())

if __name__ == '__main__':
    unittest.main() 