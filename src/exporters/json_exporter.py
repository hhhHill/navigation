"""
JSON导出模块
用于将Graph对象转换为visjs兼容的JSON格式
"""
import json
from ..models.graph import Graph

def graph_to_visjs(graph: Graph) -> dict:
    """
    将Graph对象转换为visjs兼容的JSON格式
    
    参数:
        graph: Graph对象
        
    返回:
        包含nodes和edges的字典，可直接转换为JSON
    """
    nodes = []
    edges = []
    
    # 转换顶点
    for vertex_id, vertex in graph.vertices.items():
        nodes.append({
            "id": vertex_id,
            "label": f"Node {vertex_id}",
            "x": vertex.x,
            "y": vertex.y,
            "fixed": True
        })
    
    # 转换边
    for edge_id, edge in graph.edges.items():
        edges.append({
            "id": f"{edge.vertex1.id}-{edge.vertex2.id}",
            "from": edge.vertex1.id,
            "to": edge.vertex2.id,
            # 可选：根据拥堵程度设置颜色
            # "color": get_congestion_color(edge.get_congestion_level())
        })
    
    return {
        "nodes": nodes,
        "edges": edges
    }

def export_graph_to_json(graph: Graph, filepath: str) -> None:
    """
    将Graph对象导出为JSON文件
    
    参数:
        graph: Graph对象
        filepath: 导出的JSON文件路径
    """
    data = graph_to_visjs(graph)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"地图数据已导出到: {filepath}") 