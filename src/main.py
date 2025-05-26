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
from .generators.random_map import generate_random_points, generate_connected_map
from .exporters.json_exporter import export_graph_to_json
from .api.server import run_server
from .algorithms.traffic_simulate import init_traffic_simulation, get_traffic_level, get_traffic_color, calculate_travel_time, update_traffic_flow
from .algorithms.a_star import find_shortest_path, find_fastest_path, print_path_info



def test_traffic_simulation(graph: Graph, simulation_steps: int = 5):
    """
    测试交通流模拟功能
    
    参数:
        graph: 图实例
        simulation_steps: 模拟步数
    """
    print(f"\n=== 测试交通流模拟 ({simulation_steps} 步) ===")
    
    # 初始化交通模拟
    init_traffic_simulation(graph)
    
    # 运行模拟
    print("开始模拟交通流...")
    for step in range(simulation_steps):
        print(f"\n第 {step + 1} 步模拟结果:")
        
        # 获取交通状况
        levels = get_traffic_level(graph)
        colors = get_traffic_color(graph)
        travel_times = calculate_travel_time(graph)
        
        # 统计各等级道路数量
        level_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        for level in levels.values():
            level_counts[level] += 1
        
        # 输出统计信息
        print("道路拥堵统计:")
        print(f"  畅通: {level_counts[0]} 条")
        print(f"  轻微拥堵: {level_counts[1]} 条")
        print(f"  中度拥堵: {level_counts[2]} 条")
        print(f"  严重拥堵: {level_counts[3]} 条")
        print(f"  极度拥堵: {level_counts[4]} 条")
        
        # 输出部分边的详细信息
        print("\n部分边的详细信息:")
        for i, (edge_id, edge) in enumerate(list(graph.edges.items())[:5]):  # 只显示前5条边
            print(f"  边 {edge_id}:")
            print(f"    当前车辆数: {edge.current_vehicles}")
            print(f"    边长: {edge.length}")
            print(f"    容量: {edge.capacity}")
            print(f"    拥堵等级: {levels[edge_id]}")
            print(f"    颜色: {colors[edge_id]}")
            print(f"    预计行驶时间: {travel_times[edge_id]:.2f}")
        
        # 更新交通流量
        update_traffic_flow(graph)
        
        # 等待一段时间
        time.sleep(2)





def test_random_map_generation(n=10000):
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
    
    # 测试空间查询
    x, y = 500, 500  # 查询中心点
    nearby = graph.get_nearby_vertices(x, y, n=10)
    print(f"\n距离点 ({x},{y}) 最近的 10 个顶点:")
    for i, v in enumerate(nearby):
        dist = ((v.x - x) ** 2 + (v.y - y) ** 2) ** 0.5
        print(f"  {i+1}. 顶点 {v.id}: 坐标 ({v.x:.1f}, {v.y:.1f}), 距离 {dist:.1f}")
    
    return graph

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

def test_a_star_algorithm(graph: Graph):
    """
    测试A*算法功能
    
    参数:
        graph: 图实例
    """
    print("\n=== 测试A*算法 ===")
    
    # 选择两个顶点作为起点和终点
    vertices = list(graph.vertices.values())
    if len(vertices) < 2:
        print("图中顶点数量不足，无法测试A*算法")
        return
        
    start = vertices[0]
    end = vertices[-1]
    
    print(f"起点: 顶点 {start.id} ({start.x:.1f}, {start.y:.1f})")
    print(f"终点: 顶点 {end.id} ({end.x:.1f}, {end.y:.1f})")
    
    # 测试基于距离的最短路径
    print("\n1. 测试基于距离的最短路径:")
    path, edges, distance = find_shortest_path(graph, start, end)
    print_path_info(path, edges, distance)
    
    # 测试基于距离的最快路径（不考虑路况）
    print("\n2. 测试基于距离的最快路径（不考虑路况）:")
    path, edges, distance = find_fastest_path(graph, start, end, use_traffic=False)
    print_path_info(path, edges, distance)
    
    # 测试基于路况的最快路径
    print("\n3. 测试基于路况的最快路径:")
    path, edges, time = find_fastest_path(graph, start, end, use_traffic=True)
    print_path_info(path, edges, time, is_time=True)

def main():
    """主函数"""
    print("导航系统 - 阶段1和阶段2测试")
    print("------------------------------")
    
    # 测试小规模地图生成（为了前端渲染效率，使用较小的规模）
    graph = test_random_map_generation(n=10000)
    
    # 测试交通流模拟
    test_traffic_simulation(graph, simulation_steps=5)
    
    # 测试A*算法
    test_a_star_algorithm(graph)
    
    # 导出数据并启动服务器
    print("\n准备导出地图数据并启动Web服务...")
    export_and_serve_map(graph)
    
    # 注意：服务器启动后，主程序会阻塞在这里
    
if __name__ == "__main__":
    main() 