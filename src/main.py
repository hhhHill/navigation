"""
导航系统主程序
用于测试和演示项目功能
"""
import random
import time
import os
from .models.graph import Graph
from .models.vertex import Vertex
from .models.edge import Edge
from .models.quadtree import QuadTree
from .generators.random_map import generate_random_points, generate_connected_map
from .exporters.json_exporter import export_graph_to_json
from .api.server import run_server


def test_random_map_generation(n=1000):
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

def test_quadtree_performance(graph, num_queries=100):
    """
    测试四叉树空间索引的性能
    
    参数:
        graph: 要测试的图
        num_queries: 要执行的查询次数
    """
    print("\n=== 测试四叉树空间索引性能 ===")
    
    # 构建四叉树索引
    start_time = time.time()
    graph.build_spatial_index()
    build_time = time.time() - start_time
    print(f"四叉树构建完成，用时 {build_time:.4f} 秒")
    
    # 生成随机查询点
    query_points = [(random.uniform(0, 1000), random.uniform(0, 1000)) for _ in range(num_queries)]
    
    # 测试暴力方法
    start_time = time.time()
    for x, y in query_points:
        # 临时禁用空间索引
        temp_index = graph.spatial_index
        graph.spatial_index = None
        _ = graph.get_nearby_vertices(x, y, n=10)
        # 恢复空间索引
        graph.spatial_index = temp_index
    brute_force_time = time.time() - start_time
    print(f"暴力方法执行 {num_queries} 次查询，用时 {brute_force_time:.4f} 秒")
    
    # 测试四叉树方法
    start_time = time.time()
    for x, y in query_points:
        _ = graph.get_nearby_vertices(x, y, n=10)
    quadtree_time = time.time() - start_time
    print(f"四叉树方法执行 {num_queries} 次查询，用时 {quadtree_time:.4f} 秒")
    
    # 计算性能提升
    speedup = brute_force_time / quadtree_time if quadtree_time > 0 else float('inf')
    print(f"性能提升: {speedup:.2f}x")
    
    # 验证两种方法的结果一致性
    test_point = (500, 500)
    x, y = test_point
    
    # 使用暴力方法
    graph.spatial_index = None
    brute_force_results = graph.get_nearby_vertices(x, y, n=10)
    
    # 使用四叉树
    graph.spatial_index = temp_index
    quadtree_results = graph.get_nearby_vertices(x, y, n=10)
    
    # 计算结果差异
    brute_force_ids = {v.id for v in brute_force_results}
    quadtree_ids = {v.id for v in quadtree_results}
    difference = brute_force_ids.symmetric_difference(quadtree_ids)
    
    print(f"结果一致性检查 - 差异顶点数: {len(difference)}")
    if difference:
        print("注意: 两种方法可能在距离相等的顶点上有排序差异")

def export_and_serve_map(graph, data_path=None, run_web_server=True):
    """
    导出地图数据并运行Web服务器
    
    参数:
        graph: 要导出的Graph对象
        data_path: 数据保存路径，默认为项目根目录下的data/map_data.json
        run_web_server: 是否启动Web服务器
    """
    # 确定数据目录
    if data_path is None:
        # 获取当前文件所在目录的上两级目录（项目根目录）
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(project_root, 'data')
        # 确保数据目录存在
        os.makedirs(data_dir, exist_ok=True)
        data_path = os.path.join(data_dir, 'map_data.json')
    
    # 导出地图数据
    export_graph_to_json(graph, data_path)
    
    # 运行Web服务器
    if run_web_server:
        run_server(host='127.0.0.1', port=5000, debug=True)

def main():
    """主函数"""
    print("导航系统 - 阶段1和阶段2测试")
    print("------------------------------")
    
    
    
    # 测试小规模地图生成（为了前端渲染效率，使用较小的规模）
    print("\n\n测试生成1000个点的地图")
    graph = test_random_map_generation(n=1000)
    
    # 检查实际生成的点数
    print(f"实际生成的点数: {len(graph.vertices)}")
    
    # 测试四叉树性能
    test_quadtree_performance(graph, num_queries=50)
    
    # 清理并导出数据
    import os
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'map_data.json')
    # 如果文件存在，先删除
    if os.path.exists(data_path):
        print(f"删除旧的数据文件: {data_path}")
        os.remove(data_path)
    
    # 导出数据并启动服务器
    print("\n准备导出地图数据并启动Web服务...")
    export_and_serve_map(graph, data_path=data_path)

if __name__ == "__main__":
    main() 