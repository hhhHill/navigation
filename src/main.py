"""
导航系统主程序
用于测试和演示项目功能
"""
import random
import time
from models.graph import Graph
from models.vertex import Vertex
from models.edge import Edge
from generators.random_map import generate_random_points, generate_connected_map

def test_graph_creation():
    """测试基本的图创建功能"""
    print("=== 测试基本的图创建功能 ===")
    
    # 创建一个图
    graph = Graph()
    
    # 创建一些顶点
    v1 = graph.create_vertex(0, 0)
    v2 = graph.create_vertex(3, 0)
    v3 = graph.create_vertex(3, 4)
    v4 = graph.create_vertex(0, 4)
    
    # 创建一些边
    e1 = graph.create_edge(v1, v2, 100)
    e2 = graph.create_edge(v2, v3, 150)
    e3 = graph.create_edge(v3, v4, 100)
    e4 = graph.create_edge(v4, v1, 150)
    e5 = graph.create_edge(v1, v3, 200)
    
    # 输出图信息
    print(f"图中有 {len(graph.vertices)} 个顶点和 {len(graph.edges)} 条边")
    
    # 检查图的连通性
    print(f"图是否连通: {graph.is_connected()}")
    
    # 获取附近顶点
    nearby = graph.get_nearby_vertices(1, 1, n=2)
    print(f"距离点 (1,1) 最近的 2 个顶点: {nearby}")
    
    # 更新边上的车辆数量
    e1.update_vehicles(80)
    e2.update_vehicles(200)
    
    # 显示边的信息
    print(f"边 e1: {e1}, 拥堵等级: {e1.get_congestion_level()}")
    print(f"边 e2: {e2}, 拥堵等级: {e2.get_congestion_level()}")
    
    # 计算通行时间
    print(f"边 e1 的通行时间: {e1.travel_time():.2f}")
    print(f"边 e2 的通行时间: {e2.travel_time():.2f}")

def test_random_map_generation(n=100):
    """
    测试随机地图生成功能
    
    参数:
        n: 要生成的顶点数量
    """
    print(f"\n=== 测试随机地图生成 ({n} 个顶点) ===")
    
    # 记录开始时间
    start_time = time.time()
    
    # 生成随机顶点
    print("生成随机顶点...")
    vertices = generate_random_points(n=n, x_min=0, y_min=0, x_max=1000, y_max=1000)
    
    # 生成连通图
    print("生成连通图...")
    graph = generate_connected_map(vertices)
    
    # 记录结束时间
    end_time = time.time()
    elapsed = end_time - start_time
    
    # 输出结果
    print(f"地图生成完成，用时 {elapsed:.2f} 秒")
    print(f"图中有 {len(graph.vertices)} 个顶点和 {len(graph.edges)} 条边")
    print(f"图是否连通: {graph.is_connected()}")
    
    # 统计边的拥堵情况
    congestion_counts = [0, 0, 0, 0, 0]  # 5个拥堵等级的计数
    for edge in graph.edges.values():
        congestion_level = edge.get_congestion_level()
        congestion_counts[congestion_level] += 1
    
    print("道路拥堵统计:")
    print(f"  畅通: {congestion_counts[0]} 条")
    print(f"  轻微拥堵: {congestion_counts[1]} 条")
    print(f"  中度拥堵: {congestion_counts[2]} 条")
    print(f"  严重拥堵: {congestion_counts[3]} 条")
    print(f"  极度拥堵: {congestion_counts[4]} 条")
    
    # 测试空间查询
    x, y = 500, 500  # 查询中心点
    nearby = graph.get_nearby_vertices(x, y, n=10)
    print(f"\n距离点 ({x},{y}) 最近的 10 个顶点:")
    for i, v in enumerate(nearby):
        dist = ((v.x - x) ** 2 + (v.y - y) ** 2) ** 0.5
        print(f"  {i+1}. 顶点 {v.id}: 坐标 ({v.x:.1f}, {v.y:.1f}), 距离 {dist:.1f}")
    
    return graph

def main():
    """主函数"""
    print("导航系统 - 阶段1和阶段2测试")
    print("------------------------------")
    
    # 测试基本图功能
    test_graph_creation()
    
    # 测试小规模地图生成
    small_graph = test_random_map_generation(n=100)
    
    # 测试中等规模地图生成
    medium_graph = test_random_map_generation(n=1000)
    
    # 如果需要，可以测试更大规模的地图生成
    # large_graph = test_random_map_generation(n=10000)
    
    print("\n测试完成！")

if __name__ == "__main__":
    main() 