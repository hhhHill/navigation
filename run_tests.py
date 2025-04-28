"""
运行单元测试的脚本
"""
import unittest
import sys
import os

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# 导入测试模块
from src.tests.test_models import TestVertex, TestEdge, TestGraph
from src.tests.test_utils import TestPriorityQueue, TestQuadTree
from src.tests.test_generators import TestRandomMapGenerator, TestDelaunay

def run_all_tests():
    """运行所有测试"""
    # 创建测试套件
    test_suite = unittest.TestSuite()
    
    # 添加测试模块到套件
    test_suite.addTest(unittest.makeSuite(TestVertex))
    test_suite.addTest(unittest.makeSuite(TestEdge))
    test_suite.addTest(unittest.makeSuite(TestGraph))
    test_suite.addTest(unittest.makeSuite(TestPriorityQueue))
    test_suite.addTest(unittest.makeSuite(TestQuadTree))
    test_suite.addTest(unittest.makeSuite(TestRandomMapGenerator))
    test_suite.addTest(unittest.makeSuite(TestDelaunay))
    
    # 运行测试
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

def run_models_tests():
    """运行模型测试"""
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestVertex))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestEdge))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestGraph))
    
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

def run_utils_tests():
    """运行工具类测试"""
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestPriorityQueue))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestQuadTree))
    
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

def run_generators_tests():
    """运行生成器测试"""
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestRandomMapGenerator))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestDelaunay))
    
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

if __name__ == "__main__":
    # 解析命令行参数
    if len(sys.argv) > 1:
        test_type = sys.argv[1]
        if test_type == "models":
            print("运行数据模型测试...")
            run_models_tests()
        elif test_type == "utils":
            print("运行工具类测试...")
            run_utils_tests()
        elif test_type == "generators":
            print("运行生成器测试...")
            run_generators_tests()
        else:
            print(f"未知的测试类型: {test_type}")
            print("可用的测试类型: models, utils, generators")
    else:
        print("运行所有测试...")
        run_all_tests() 