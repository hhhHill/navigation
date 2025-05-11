"""
Flask服务器
提供获取地图数据的API
"""
from flask import Flask, jsonify, send_from_directory
import json
import os

# 创建Flask应用
app = Flask(__name__, static_folder='../frontend')

@app.route('/api/map-data')
def get_map_data():
    """
    提供地图数据的API端点
    从JSON文件中读取数据并返回  
    """
    try:
        data_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'map_data.json')
        with open(data_file, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        return jsonify(map_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    """提供前端页面"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """提供其他静态文件"""
    return send_from_directory(app.static_folder, path)

def run_server(host='127.0.0.1', port=5000, debug=True):
    """
    运行Flask服务器
    
    参数:
        host: 服务器主机地址，默认为本地
        port: 服务器端口，默认为5000
        debug: 是否开启调试模式
    """
    # 确保数据目录存在
    os.makedirs(os.path.join(os.path.dirname(__file__), '..', '..', 'data'), exist_ok=True)
    
    # 启动服务器
    print(f"启动Flask服务器: http://{host}:{port}")
    app.run(host=host, port=port, debug=debug) 