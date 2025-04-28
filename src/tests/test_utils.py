"""
测试工具类模块
"""
import unittest
import math
from ..utils.priority_queue import PriorityQueue
from ..utils.quad_tree import QuadTree, QuadTreeNode

class TestPriorityQueue(unittest.TestCase):
    """测试优先队列"""
    
    def test_init(self):
        """测试初始化"""
        pq = PriorityQueue()
        self.assertTrue(pq.empty())
        self.assertEqual(len(pq), 0)
    
    def test_put_get(self):
        """测试放入和获取元素"""
        pq = PriorityQueue()
        
        # 添加元素
        pq.put("item1", 3)
        pq.put("item2", 1)
        pq.put("item3", 2)
        
        self.assertEqual(len(pq), 3)
        self.assertFalse(pq.empty())
        
        # 按优先级获取元素
        self.assertEqual(pq.get(), "item2")  # 优先级1
        self.assertEqual(pq.get(), "item3")  # 优先级2
        self.assertEqual(pq.get(), "item1")  # 优先级3
        
        self.assertTrue(pq.empty())
    
    def test_update_priority(self):
        """测试更新优先级"""
        pq = PriorityQueue()
        
        # 添加元素
        pq.put("item1", 3)
        pq.put("item2", 2)
        pq.put("item3", 1)
        
        # 更新优先级
        pq.update_priority("item1", 0.5)
        
        # 验证更新后的顺序
        self.assertEqual(pq.get(), "item1")  # 现在优先级最高
        self.assertEqual(pq.get(), "item3")
        self.assertEqual(pq.get(), "item2")
    
    def test_contains(self):
        """测试包含检查"""
        pq = PriorityQueue()
        
        pq.put("item1", 1)
        
        self.assertTrue(pq.contains("item1"))
        self.assertFalse(pq.contains("item2"))

class TestQuadTree(unittest.TestCase):
    """测试四叉树"""
    
    def test_init(self):
        """测试初始化"""
        qt = QuadTree(0, 0, 100, 100)
        self.assertEqual(qt.root.boundary, (0, 0, 100, 100))
        self.assertFalse(qt.root.divided)
    
    def test_insert_and_query(self):
        """测试插入和查询"""
        qt = QuadTree(0, 0, 100, 100)
        
        # 插入一些点
        qt.insert(10, 10, "point1")
        qt.insert(90, 90, "point2")
        qt.insert(50, 50, "point3")
        
        # 查询范围
        points = qt.query_range(0, 0, 50, 50)
        
        # 应该找到点1和点3
        self.assertEqual(len(points), 2)
        values = [data for _, _, data in points]
        self.assertIn("point1", values)
        self.assertIn("point3", values)
        
        # 查询不同范围
        points = qt.query_range(75, 75, 100, 100)
        
        # 应该只找到点2
        self.assertEqual(len(points), 1)
        self.assertEqual(points[0][2], "point2")
    
    def test_find_nearest(self):
        """测试查找最近点"""
        qt = QuadTree(0, 0, 100, 100)
        
        # 插入一些点
        qt.insert(10, 10, "point1")
        qt.insert(20, 20, "point2")
        qt.insert(30, 30, "point3")
        qt.insert(40, 40, "point4")
        qt.insert(50, 50, "point5")
        
        # 查找距离(15,15)最近的2个点
        nearest = qt.find_nearest(15, 15, 2)
        
        # 验证结果
        self.assertEqual(len(nearest), 2)
        
        # 最近的应该是point1和point2
        data_list = [data for _, _, _, data in nearest]
        self.assertIn("point1", data_list)
        self.assertIn("point2", data_list)
        
        # 第一个应该是point1（最近）
        self.assertEqual(nearest[0][3], "point1")
    
    def test_subdivision(self):
        """测试细分"""
        qt = QuadTreeNode(0, 0, 100, 100, capacity=2)
        
        # 插入两个点，不应该细分
        qt.insert(10, 10, "point1")
        qt.insert(90, 90, "point2")
        
        self.assertFalse(qt.divided)
        self.assertEqual(len(qt.points), 2)
        
        # 插入第三个点，应该触发细分
        qt.insert(50, 50, "point3")
        
        self.assertTrue(qt.divided)
        self.assertEqual(len(qt.points), 0)  # 原节点的点应该被移动到子节点
        self.assertEqual(len(qt.children), 4)  # 应该有4个子节点

if __name__ == '__main__':
    unittest.main() 