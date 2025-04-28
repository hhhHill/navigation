# 导航系统测试计划

本文档详细说明了导航系统的测试策略和具体测试计划，确保系统功能正确性和性能达标。

## 1. 测试策略

测试将分为以下几个层次：

1. **单元测试**：测试各个模块的独立功能
2. **集成测试**：测试模块之间的交互
3. **性能测试**：评估系统在不同规模下的性能表现
4. **功能测试**：验证系统是否满足功能需求

## 2. 单元测试计划

### 2.1 数据模型测试

#### 顶点类测试
- 测试顶点的创建和属性访问
- 测试顶点间距离计算
- 测试添加和移除边

```python
def test_vertex_creation():
    vertex = Vertex(1, 10.0, 20.0)
    assert vertex.id == 1
    assert vertex.x == 10.0
    assert vertex.y == 20.0
    assert len(vertex.edges) == 0

def test_vertex_distance():
    vertex1 = Vertex(1, 0.0, 0.0)
    vertex2 = Vertex(2, 3.0, 4.0)
    distance = ((vertex1.x - vertex2.x) ** 2 + (vertex1.y - vertex2.y) ** 2) ** 0.5
    assert distance == 5.0
```

#### 边类测试
- 测试边的创建和属性访问
- 测试边长度计算
- 测试通行时间计算

```python
def test_edge_creation():
    vertex1 = Vertex(1, 0.0, 0.0)
    vertex2 = Vertex(2, 3.0, 4.0)
    edge = Edge(1, vertex1, vertex2)
    assert edge.id == 1
    assert edge.vertex1 == vertex1
    assert edge.vertex2 == vertex2
    assert edge.length == 5.0
    assert edge.capacity == 0
    assert edge.current_vehicles == 0

def test_edge_travel_time():
    vertex1 = Vertex(1, 0.0, 0.0)
    vertex2 = Vertex(2, 3.0, 4.0)
    edge = Edge(1, vertex1, vertex2)
    edge.capacity = 100
    
    # 无拥堵情况
    edge.current_vehicles = 50
    assert edge.travel_time(1.0) == edge.length
    
    # 轻微拥堵情况
    edge.current_vehicles = 100
    assert edge.travel_time(1.0) == edge.length
    
    # 严重拥堵情况
    edge.current_vehicles = 200
    assert edge.travel_time(1.0) > edge.length
```

#### 图类测试
- 测试添加顶点和边
- 测试查询顶点和边
- 测试空间索引功能

```python
def test_graph_creation():
    graph = Graph()
    assert len(graph.vertices) == 0
    assert len(graph.edges) == 0

def test_add_vertex_and_edge():
    graph = Graph()
    
    vertex1 = Vertex(1, 0.0, 0.0)
    vertex2 = Vertex(2, 3.0, 4.0)
    
    graph.add_vertex(vertex1)
    graph.add_vertex(vertex2)
    
    assert len(graph.vertices) == 2
    assert graph.vertices[1] == vertex1
    assert graph.vertices[2] == vertex2
    
    edge = Edge(1, vertex1, vertex2)
    graph.add_edge(edge)
    
    assert len(graph.edges) == 1
    assert graph.edges[1] == edge
    assert edge in vertex1.edges
    assert edge in vertex2.edges

def test_nearby_vertices():
    graph = Graph()
    
    # 添加多个顶点
    for i in range(10):
        for j in range(10):
            vertex = Vertex(i*10+j, i*10.0, j*10.0)
            graph.add_vertex(vertex)
    
    # 初始化空间索引
    graph.build_spatial_index()
    
    # 查询附近顶点
    nearby = graph.get_nearby_vertices(25.0, 25.0, 5)
    assert len(nearby) == 5
    
    # 验证结果是按距离排序的
    distances = [((v.x-25.0)**2 + (v.y-25.0)**2)**0.5 for v in nearby]
    assert all(distances[i] <= distances[i+1] for i in range(len(distances)-1))
```

### 2.2 工具函数测试

#### 优先队列测试
- 测试添加和移除元素
- 测试优先级顺序
- 测试更新优先级

```python
def test_priority_queue():
    pq = PriorityQueue()
    
    # 测试空队列
    assert pq.empty()
    
    # 添加元素
    pq.put("task1", 5)
    pq.put("task2", 2)
    pq.put("task3", 10)
    
    assert not pq.empty()
    
    # 按优先级取出元素
    assert pq.get() == "task2"
    assert pq.get() == "task1"
    assert pq.get() == "task3"
    
    assert pq.empty()

def test_update_priority():
    pq = PriorityQueue()
    
    pq.put("task1", 5)
    pq.put("task2", 10)
    
    # 更新优先级
    pq.put("task2", 1)
    
    assert pq.get() == "task2"
    assert pq.get() == "task1"
```

#### 四叉树测试
- 测试点的插入
- 测试范围查询
- 测试最近点查询

```python
def test_quadtree_insertion():
    quad = QuadTree((0, 0, 100, 100))
    
    # 插入点
    p1 = Vertex(1, 10, 10)
    p2 = Vertex(2, 20, 20)
    p3 = Vertex(3, 30, 30)
    
    assert quad.insert(p1)
    assert quad.insert(p2)
    assert quad.insert(p3)
    
    # 插入边界外的点
    p4 = Vertex(4, 110, 110)
    assert not quad.insert(p4)

def test_quadtree_query_range():
    quad = QuadTree((0, 0, 100, 100))
    
    # 插入多个点
    for i in range(10):
        for j in range(10):
            p = Vertex(i*10+j, i*10, j*10)
            quad.insert(p)
    
    # 查询范围内的点
    result = quad.query_range((20, 20, 50, 50))
    
    # 验证结果
    for p in result:
        assert 20 <= p.x <= 50
        assert 20 <= p.y <= 50

def test_quadtree_nearest():
    quad = QuadTree((0, 0, 100, 100))
    
    # 插入多个点
    for i in range(10):
        for j in range(10):
            p = Vertex(i*10+j, i*10, j*10)
            quad.insert(p)
    
    # 查询最近的点
    result = quad.find_nearest(Vertex(0, 25, 25), k=3)
    
    # 验证结果
    assert len(result) == 3
    
    # 验证是否按距离排序
    distances = [dist for _, dist in result]
    assert all(distances[i] <= distances[i+1] for i in range(len(distances)-1))
```

### 2.3 地图生成测试

#### 随机点生成测试
- 测试点的数量
- 测试点的分布

```python
def test_random_points_generation():
    n = 1000
    vertices = generate_random_points(n, 0, 0, 1000, 1000)
    
    # 验证点的数量
    assert len(vertices) == n
    
    # 验证点的坐标范围
    for v in vertices:
        assert 0 <= v.x <= 1000
        assert 0 <= v.y <= 1000
        
    # 验证点的id唯一性
    ids = [v.id for v in vertices]
    assert len(ids) == len(set(ids))
```

#### Delaunay三角剖分测试
- 测试三角剖分结果
- 测试Delaunay性质

```python
def test_delaunay_triangulation():
    # 生成测试点
    vertices = [
        Vertex(1, 0, 0),
        Vertex(2, 100, 0),
        Vertex(3, 0, 100),
        Vertex(4, 100, 100),
        Vertex(5, 50, 50)
    ]
    
    # 进行三角剖分
    graph = delaunay_triangulation(vertices)
    
    # 验证所有点都在图中
    assert len(graph.vertices) == len(vertices)
    
    # 验证边的数量（对于平面图，边数约为3n-6，其中n为顶点数）
    assert len(graph.edges) == (3 * len(vertices) - 6)
    
    # 验证Delaunay性质（对每个三角形，其外接圆内不应有其他点）
    # 此测试较复杂，可能需要单独实现
```

#### 连通图测试
- 测试图的连通性
- 测试边的合理性

```python
def test_connected_map():
    vertices = generate_random_points(100, 0, 0, 1000, 1000)
    graph = generate_connected_map(vertices)
    
    # 验证顶点数量
    assert len(graph.vertices) == len(vertices)
    
    # 验证图的连通性
    # 使用BFS遍历检查是否所有顶点都可达
    visited = set()
    start = next(iter(graph.vertices.values()))
    queue = [start]
    visited.add(start)
    
    while queue:
        current = queue.pop(0)
        for edge in current.edges:
            neighbor = edge.vertex2 if edge.vertex1 == current else edge.vertex1
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    
    assert len(visited) == len(graph.vertices)
    
    # 验证边的交叉情况（复杂测试）
```

### 2.4 算法测试

#### 最短路径算法测试
- 测试Dijkstra算法
- 测试A*算法
- 比较两种算法的结果

```python
def test_dijkstra():
    # 创建测试图
    graph = create_test_graph()
    
    # 选择起点和终点
    start = graph.vertices[1]
    end = graph.vertices[10]
    
    # 执行Dijkstra算法
    path, distance = dijkstra(graph, start, end)
    
    # 验证路径存在
    assert path is not None
    assert distance < float('infinity')
    
    # 验证路径的连续性
    for i in range(len(path) - 1):
        edge = find_edge(graph, path[i], path[i+1])
        assert edge is not None
    
    # 验证路径的最优性（复杂测试）

def test_a_star():
    # 创建测试图
    graph = create_test_graph()
    
    # 选择起点和终点
    start = graph.vertices[1]
    end = graph.vertices[10]
    
    # 执行A*算法
    path, distance = a_star(graph, start, end)
    
    # 验证路径存在
    assert path is not None
    assert distance < float('infinity')
    
    # 验证路径的连续性
    for i in range(len(path) - 1):
        edge = find_edge(graph, path[i], path[i+1])
        assert edge is not None
    
    # 与Dijkstra算法比较
    d_path, d_distance = dijkstra(graph, start, end)
    assert abs(distance - d_distance) < 1e-6  # 应该得到相同的最短距离
```

#### 车流模拟测试
- 测试车流初始化
- 测试车流更新
- 测试考虑路况的路径计算

```python
def test_traffic_initialization():
    graph = create_test_graph()
    vehicles = initialize_traffic(graph, 100)
    
    # 验证车辆数量
    assert len(vehicles) == 100
    
    # 验证每个车辆都有有效路径
    for vehicle in vehicles:
        assert len(vehicle['path']) >= 2
        assert not vehicle['arrived']
    
    # 验证边的车流量
    edge_vehicles = sum(edge.current_vehicles for edge in graph.edges.values())
    assert edge_vehicles == 100  # 每个车辆应该在一条边上

def test_traffic_update():
    graph = create_test_graph()
    vehicles = initialize_traffic(graph, 100)
    
    # 记录初始状态
    initial_positions = [v['current_position'] for v in vehicles]
    initial_edge_vehicles = {e.id: e.current_vehicles for e in graph.edges.values()}
    
    # 更新车流
    update_traffic(graph, vehicles, time_step=10.0)
    
    # 验证车辆位置变化
    positions_changed = False
    for i, v in enumerate(vehicles):
        if v['current_position'] != initial_positions[i]:
            positions_changed = True
            break
    assert positions_changed
    
    # 验证边的车流量变化
    current_edge_vehicles = {e.id: e.current_vehicles for e in graph.edges.values()}
    assert current_edge_vehicles != initial_edge_vehicles

def test_traffic_aware_routing():
    graph = create_test_graph()
    
    # 设置一些边的车流量
    for i, edge in enumerate(graph.edges.values()):
        if i % 3 == 0:  # 每三条边设置一条拥堵
            edge.capacity = 100
            edge.current_vehicles = 150  # 超负荷
    
    start = graph.vertices[1]
    end = graph.vertices[10]
    
    # 不考虑路况的路径
    normal_path, _ = dijkstra(graph, start, end)
    
    # 考虑路况的路径
    traffic_path, _ = traffic_aware_dijkstra(graph, start, end)
    
    # 两条路径应该不同
    assert normal_path != traffic_path
    
    # 计算两条路径的实际通行时间
    normal_time = calculate_travel_time(graph, normal_path)
    traffic_time = calculate_travel_time(graph, traffic_path)
    
    # 考虑路况的路径应该有更短的通行时间
    assert traffic_time <= normal_time
```

## 3. 集成测试计划

### 3.1 模块集成测试
- 测试数据模型与地图生成模块的集成
- 测试地图生成与路径计算模块的集成
- 测试路径计算与车流模拟模块的集成

```python
def test_map_generation_to_path_finding():
    # 生成地图
    vertices = generate_random_points(1000, 0, 0, 1000, 1000)
    graph = generate_connected_map(vertices)
    
    # 选择起点和终点
    start = list(graph.vertices.values())[0]
    end = list(graph.vertices.values())[-1]
    
    # 计算路径
    path, distance = dijkstra(graph, start, end)
    
    # 验证路径存在
    assert path is not None
    assert distance < float('infinity')
    
    # 验证路径的连续性
    for i in range(len(path) - 1):
        edge = find_edge(graph, path[i], path[i+1])
        assert edge is not None

def test_path_finding_to_traffic_simulation():
    # 生成地图
    vertices = generate_random_points(1000, 0, 0, 1000, 1000)
    graph = generate_connected_map(vertices)
    
    # 初始化车流
    vehicles = initialize_traffic(graph, 100)
    
    # 选择起点和终点
    start = list(graph.vertices.values())[0]
    end = list(graph.vertices.values())[-1]
    
    # 计算考虑路况的路径
    path, travel_time = traffic_aware_dijkstra(graph, start, end)
    
    # 验证路径存在
    assert path is not None
    assert travel_time < float('infinity')
    
    # 更新车流
    update_traffic(graph, vehicles, time_step=10.0)
    
    # 重新计算路径，应该有所变化
    new_path, new_travel_time = traffic_aware_dijkstra(graph, start, end)
    
    # 路况变化后，路径或时间应有变化
    assert path != new_path or abs(travel_time - new_travel_time) > 1e-6
```

### 3.2 系统集成测试
- 测试完整系统流程
- 测试不同模块的协同工作

```python
def test_complete_system_flow():
    # 1. 生成地图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 2. 初始化车流
    vehicles = initialize_traffic(graph, 1000)
    
    # 3. 选择查询点
    center_x, center_y = 5000, 5000
    
    # 4. 获取附近的顶点
    nearby_vertices = graph.get_nearby_vertices(center_x, center_y, 100)
    assert len(nearby_vertices) == 100
    
    # 5. 选择起点和终点
    start = nearby_vertices[0]
    end = nearby_vertices[-1]
    
    # 6. 计算最短路径
    path, _ = dijkstra(graph, start, end)
    assert path is not None
    
    # 7. 更新车流
    update_traffic(graph, vehicles, time_step=10.0)
    
    # 8. 计算考虑路况的路径
    traffic_path, _ = traffic_aware_dijkstra(graph, start, end)
    assert traffic_path is not None
    
    # 9. 生成交通可视化数据
    viz_data = visualize_traffic(graph, center_x, center_y, 1000)
    assert len(viz_data) > 0
```

## 4. 性能测试计划

### 4.1 大规模数据测试
- 测试大规模图的生成性能
- 测试最短路径算法的性能
- 测试车流模拟的性能

```python
def test_large_scale_map_generation():
    # 测试不同规模的地图生成性能
    sizes = [1000, 5000, 10000, 50000]
    times = []
    
    for size in sizes:
        start_time = time.time()
        
        vertices = generate_random_points(size, 0, 0, 10000, 10000)
        graph = generate_connected_map(vertices)
        
        end_time = time.time()
        times.append(end_time - start_time)
        
        # 验证生成的地图
        assert len(graph.vertices) == size
        assert len(graph.edges) > 0
    
    # 输出性能结果
    for i, size in enumerate(sizes):
        print(f"生成{size}个点的地图耗时: {times[i]:.2f}秒")

def test_path_finding_performance():
    # 生成测试图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 随机选择多对起点和终点
    test_pairs = []
    for _ in range(100):
        start = random.choice(list(graph.vertices.values()))
        end = random.choice(list(graph.vertices.values()))
        test_pairs.append((start, end))
    
    # 测试Dijkstra算法性能
    dijkstra_times = []
    for start, end in test_pairs:
        start_time = time.time()
        dijkstra(graph, start, end)
        end_time = time.time()
        dijkstra_times.append(end_time - start_time)
    
    # 测试A*算法性能
    astar_times = []
    for start, end in test_pairs:
        start_time = time.time()
        a_star(graph, start, end)
        end_time = time.time()
        astar_times.append(end_time - start_time)
    
    # 输出性能比较
    print(f"Dijkstra平均耗时: {sum(dijkstra_times)/len(dijkstra_times):.6f}秒")
    print(f"A*平均耗时: {sum(astar_times)/len(astar_times):.6f}秒")

def test_traffic_simulation_performance():
    # 生成测试图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 测试不同数量的车辆
    vehicle_counts = [100, 500, 1000, 5000]
    init_times = []
    update_times = []
    
    for count in vehicle_counts:
        # 测试初始化性能
        start_time = time.time()
        vehicles = initialize_traffic(graph, count)
        end_time = time.time()
        init_times.append(end_time - start_time)
        
        # 测试更新性能
        start_time = time.time()
        update_traffic(graph, vehicles, time_step=10.0)
        end_time = time.time()
        update_times.append(end_time - start_time)
    
    # 输出性能结果
    for i, count in enumerate(vehicle_counts):
        print(f"{count}辆车初始化耗时: {init_times[i]:.2f}秒")
        print(f"{count}辆车更新耗时: {update_times[i]:.2f}秒")
```

### 4.2 内存使用测试
- 测试系统在不同规模下的内存占用

```python
def test_memory_usage():
    # 测试不同规模的内存占用
    sizes = [1000, 5000, 10000, 50000]
    memory_usages = []
    
    for size in sizes:
        # 记录初始内存
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # 执行操作
        vertices = generate_random_points(size, 0, 0, 10000, 10000)
        graph = generate_connected_map(vertices)
        
        # 记录最终内存
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        memory_usages.append(final_memory - initial_memory)
        
        # 清理内存
        del vertices
        del graph
        gc.collect()
    
    # 输出内存使用结果
    for i, size in enumerate(sizes):
        print(f"{size}个点的地图内存占用: {memory_usages[i]:.2f}MB")
```

## 5. 功能测试计划

### 5.1 地图显示功能测试
- 测试指定坐标附近点的显示
- 测试地图缩放功能

```python
def test_nearby_points_display():
    # 生成测试图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 测试不同坐标
    test_coordinates = [
        (5000, 5000),  # 中心
        (0, 0),        # 左下角
        (10000, 10000) # 右上角
    ]
    
    for x, y in test_coordinates:
        # 获取附近的顶点
        nearby = graph.get_nearby_vertices(x, y, 100)
        
        # 验证结果数量
        assert len(nearby) == 100
        
        # 验证点的顺序是按距离排序的
        distances = [((v.x-x)**2 + (v.y-y)**2)**0.5 for v in nearby]
        assert all(distances[i] <= distances[i+1] for i in range(len(distances)-1))

def test_map_zooming():
    # 生成测试图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 测试不同缩放级别
    zoom_levels = [0.1, 0.5, 1.0, 2.0, 5.0]
    center_x, center_y = 5000, 5000
    screen_width, screen_height = 800, 600
    
    for zoom in zoom_levels:
        # 获取适应缩放级别的点
        points = adaptive_point_selection(graph, center_x, center_y, zoom, screen_width, screen_height)
        
        # 验证结果
        assert len(points) > 0
        
        # 缩放级别越大，显示的点应该越多
        if zoom > 1.0:
            # 高缩放级别下，点应该更密集
            assert len(points) > 100
        else:
            # 低缩放级别下，应该进行了抽稀
            assert len(points) < 1000
```

### 5.2 最短路径功能测试
- 测试最短路径计算
- 测试路径可视化

```python
def test_shortest_path_calculation():
    # 生成测试图
    vertices = generate_random_points(10000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 随机选择多对起点和终点
    for _ in range(10):
        start = random.choice(list(graph.vertices.values()))
        end = random.choice(list(graph.vertices.values()))
        
        # 计算最短路径
        path, distance = dijkstra(graph, start, end)
        
        # 验证路径存在
        assert path is not None
        assert distance < float('infinity')
        
        # 验证路径的连续性
        for i in range(len(path) - 1):
            edge = find_edge(graph, path[i], path[i+1])
            assert edge is not None
            
        # 计算路径长度
        calculated_distance = 0
        for i in range(len(path) - 1):
            edge = find_edge(graph, path[i], path[i+1])
            calculated_distance += edge.length
            
        # 验证计算的距离与返回的距离相符
        assert abs(calculated_distance - distance) < 1e-6
```

### 5.3 车流模拟功能测试
- 测试车流初始化和更新
- 测试交通状况可视化
- 测试考虑路况的路径计算

```python
def test_comprehensive_traffic_route():
    # 生成测试图
    vertices = generate_random_points(5000, 0, 0, 10000, 10000)
    graph = generate_connected_map(vertices)
    
    # 初始化车流
    vehicles = initialize_traffic(graph, 1000)
    
    # 选择起点和终点
    start = random.choice(list(graph.vertices.values()))
    end = random.choice(list(graph.vertices.values()))
    
    # 计算不考虑路况的路径
    normal_path, normal_distance = dijkstra(graph, start, end)
    
    # 更新多次车流，使路况发生变化
    for _ in range(10):
        update_traffic(graph, vehicles, time_step=10.0)
    
    # 计算考虑路况的路径
    traffic_path, traffic_time = traffic_aware_dijkstra(graph, start, end)
    
    # 计算两条路径的实际通行时间
    normal_time = calculate_travel_time(graph, normal_path)
    actual_traffic_time = calculate_travel_time(graph, traffic_path)
    
    # 验证考虑路况的路径有更短的通行时间
    assert actual_traffic_time <= normal_time
    
    # 验证返回的时间与计算的时间相符
    assert abs(traffic_time - actual_traffic_time) < 1e-6
```

## 6. 测试环境和工具

- **测试框架**：pytest
- **性能分析工具**：cProfile, memory_profiler
- **代码覆盖率工具**：coverage.py
- **测试数据生成**：自动生成的随机数据和手工构造的特定测试用例
- **运行环境**：与开发环境相同的Python环境

## 7. 测试执行计划

1. **单元测试**：在每个模块完成后立即执行
2. **集成测试**：在相关模块都完成后执行
3. **性能测试**：在基本功能稳定后执行
4. **功能测试**：在系统基本完成后执行

## 8. 测试报告模板

```
# 导航系统测试报告

## 测试概述
- 测试日期：[日期]
- 测试版本：[版本号]
- 测试环境：[环境描述]
- 测试执行人：[姓名]

## 测试结果摘要
- 单元测试：通过率 [X%]
- 集成测试：通过率 [X%]
- 性能测试：[结果摘要]
- 功能测试：通过率 [X%]

## 详细测试结果
### 单元测试
[详细结果]

### 集成测试
[详细结果]

### 性能测试
[详细结果]

### 功能测试
[详细结果]

## 问题和建议
[发现的问题和改进建议]

## 结论
[总体评价和下一步建议]
``` 