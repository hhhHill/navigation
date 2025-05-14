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
    print("\n\n测试生成10000个点的地图")
    graph = test_random_map_generation(n=10000)
    
    # 检查实际生成的点数
    print(f"实际生成的点数: {len(graph.vertices)}")
    
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