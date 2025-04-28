"""
测试地图生成模块
"""
import unittest
import math
from ..generators.random_map import generate_random_points, generate_connected_map
from ..generators.delaunay import create_delaunay_triangulation, is_point_in_circumcircle
from ..models.vertex import Vertex
from ..models.edge import Edge
from ..models.graph import Graph

class TestRandomMapGenerator(unittest.TestCase):
    """测试随机地图生成功能"""
    
    def test_generate_random_points(self):
        """测试随机点生成"""
        n = 10000
        vertices = generate_random_points(n=n, x_min=0, y_min=0, x_max=100, y_max=100)
        
        # 检查生成的点数量
        self.assertEqual(len(vertices), n)
        
        # 检查点的坐标范围
        for v in vertices:
            self.assertTrue(0 <= v.x <= 100)
            self.assertTrue(0 <= v.y <= 100)
        
        # 检查点的ID
        ids = [v.id for v in vertices]
        self.assertEqual(len(set(ids)), n)  # ID应该是唯一的
    
    def test_generate_connected_map(self):
        """测试生成连通地图"""
        # 生成一些顶点
        vertices = [
            Vertex(0, 10, 10),
            Vertex(1, 30, 10),
            Vertex(2, 20, 30),
            Vertex(3, 40, 30),
            Vertex(4, 10, 50),
            Vertex(5, 30, 50)
        ]
        
        # 生成连通图
        graph = generate_connected_map(vertices)
        
        # 检查图中的顶点和边
        self.assertEqual(len(graph.vertices), len(vertices))
        self.assertGreater(len(graph.edges), 0)
        
        # 检查图是否连通
        self.assertTrue(graph.is_connected())
        
        # 检查每条边的容量
        for edge in graph.edges.values():
            self.assertGreater(edge.capacity, 0)

class TestDelaunay(unittest.TestCase):
    """测试Delaunay三角剖分"""
    
    def test_is_point_in_circumcircle(self):
        """测试点是否在外接圆内"""
        # 创建一个三角形
        v1 = Vertex(1, 0, 0)
        v2 = Vertex(2, 10, 0)
        v3 = Vertex(3, 5, 8.66)  # 近似为等边三角形
        
        # 在外接圆内的点
        p_in = Vertex(4, 5, 3)
        self.assertTrue(is_point_in_circumcircle(p_in, (v1, v2, v3)))
        
        # 在外接圆外的点
        p_out = Vertex(5, 15, 15)
        self.assertFalse(is_point_in_circumcircle(p_out, (v1, v2, v3)))
    
    def test_create_delaunay_triangulation(self):
        """测试创建Delaunay三角剖分"""
        # 创建一些顶点
        vertices = [
            Vertex(0, 0, 0),
            Vertex(1, 10, 0),
            Vertex(2, 10, 10),
            Vertex(3, 0, 10),
            Vertex(4, 5, 5)
        ]
        
        # 创建三角剖分
        triangulation = create_delaunay_triangulation(vertices)
        
        # 检查结果
        self.assertGreater(len(triangulation), 0)
        
        # 每个三角形应该有3个顶点
        for triangle in triangulation:
            self.assertEqual(len(triangle), 3)
            
            # 三角形的顶点应该在输入顶点列表中
            for vertex in triangle:
                self.assertIn(vertex.id, [v.id for v in vertices])
        
        # 检查三角形的数量
        # 对于平面上的n个点，三角剖分后的三角形数量不超过2n-5
        self.assertLessEqual(len(triangulation), 2 * len(vertices) - 5)

if __name__ == '__main__':
    unittest.main() 