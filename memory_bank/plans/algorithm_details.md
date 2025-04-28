# 导航系统算法详细规划

本文档详细描述导航系统各模块的算法实现方案，是对主实现计划的补充说明。

## 1. 空间索引算法

### 1.1 四叉树实现详细设计

四叉树是用于高效查询二维空间中点的数据结构，将用于实现地图的快速空间查询。

```python
class QuadTree:
    def __init__(self, boundary, capacity=4):
        self.boundary = boundary  # (x_min, y_min, x_max, y_max)
        self.capacity = capacity  # 每个节点最多存储的点数
        self.points = []          # 存储点的列表
        self.divided = False      # 是否已分割
        self.northwest = None     # 西北象限
        self.northeast = None     # 东北象限
        self.southwest = None     # 西南象限
        self.southeast = None     # 东南象限
    
    def contains(self, point):
        """检查一个点是否在边界内"""
        x_min, y_min, x_max, y_max = self.boundary
        return (x_min <= point.x <= x_max and 
                y_min <= point.y <= y_max)
    
    def subdivide(self):
        """将节点分成四个子节点"""
        x_min, y_min, x_max, y_max = self.boundary
        x_mid = (x_min + x_max) / 2
        y_mid = (y_min + y_max) / 2
        
        # 创建四个子象限
        nw = (x_min, y_mid, x_mid, y_max)
        ne = (x_mid, y_mid, x_max, y_max)
        sw = (x_min, y_min, x_mid, y_mid)
        se = (x_mid, y_min, x_max, y_mid)
        
        self.northwest = QuadTree(nw, self.capacity)
        self.northeast = QuadTree(ne, self.capacity)
        self.southwest = QuadTree(sw, self.capacity)
        self.southeast = QuadTree(se, self.capacity)
        self.divided = True
    
    def insert(self, point):
        """插入一个点到四叉树"""
        # 如果点不在边界内，返回False
        if not self.contains(point):
            return False
        
        # 如果节点未满，直接添加点
        if len(self.points) < self.capacity and not self.divided:
            self.points.append(point)
            return True
        
        # 如果节点未分割，进行分割
        if not self.divided:
            self.subdivide()
            
            # 将已有点重新分配到子节点
            for p in self.points:
                self.northwest.insert(p) or \
                self.northeast.insert(p) or \
                self.southwest.insert(p) or \
                self.southeast.insert(p)
            self.points = []
        
        # 尝试在子节点中插入点
        return (self.northwest.insert(point) or 
                self.northeast.insert(point) or 
                self.southwest.insert(point) or 
                self.southeast.insert(point))
    
    def query_range(self, range_rect):
        """查询指定范围内的所有点"""
        found_points = []
        
        # 如果查询范围与当前节点没有交集，返回空列表
        if not self._intersects(range_rect):
            return found_points
        
        # 检查当前节点中的点
        for point in self.points:
            if self._point_in_range(point, range_rect):
                found_points.append(point)
        
        # 如果节点已分割，递归查询子节点
        if self.divided:
            found_points.extend(self.northwest.query_range(range_rect))
            found_points.extend(self.northeast.query_range(range_rect))
            found_points.extend(self.southwest.query_range(range_rect))
            found_points.extend(self.southeast.query_range(range_rect))
        
        return found_points
    
    def find_nearest(self, point, k=1, max_distance=float('inf')):
        """查找距离指定点最近的k个点"""
        # 使用优先队列存储最近的k个点
        pq = []
        
        # 递归搜索四叉树
        self._nearest_search(point, k, pq, max_distance)
        
        # 返回最近的k个点
        result = []
        while pq:
            dist, p = heapq.heappop(pq)
            result.append((p, dist))
        
        return result
    
    def _nearest_search(self, point, k, pq, max_distance):
        """递归搜索最近点的辅助函数"""
        # 检查节点中的点
        for p in self.points:
            dist = self._distance(point, p)
            
            if dist <= max_distance:
                if len(pq) < k:
                    heapq.heappush(pq, (-dist, p))  # 使用负距离形成最大堆
                elif -dist > pq[0][0]:  # 如果当前点比堆顶元素更近
                    heapq.heappushpop(pq, (-dist, p))
                    
                # 更新最大距离
                if len(pq) == k:
                    max_distance = -pq[0][0]
        
        # 如果节点已分割，按距离优先级递归搜索子节点
        if self.divided:
            # 计算点到各子节点边界的最小距离
            quadrants = [
                (self.northwest, self._min_distance(point, self.northwest.boundary)),
                (self.northeast, self._min_distance(point, self.northeast.boundary)),
                (self.southwest, self._min_distance(point, self.southwest.boundary)),
                (self.southeast, self._min_distance(point, self.southeast.boundary))
            ]
            
            # 按距离排序
            quadrants.sort(key=lambda x: x[1])
            
            # 递归搜索子节点
            for quadrant, dist in quadrants:
                if dist <= max_distance:
                    quadrant._nearest_search(point, k, pq, max_distance)
                    # 更新最大距离
                    if len(pq) == k:
                        max_distance = -pq[0][0]
```

### 1.2 优先队列实现

```python
class PriorityQueue:
    def __init__(self):
        self.elements = []  # 堆元素
        self.entry_finder = {}  # 映射项到位置
        self.counter = 0  # 唯一序列计数器，用于避免相同优先级比较
        
    def empty(self):
        """判断队列是否为空"""
        return len(self.entry_finder) == 0
        
    def put(self, item, priority):
        """添加新项或更新现有项的优先级"""
        if item in self.entry_finder:
            self.remove(item)
        count = self.counter
        self.counter += 1
        entry = [priority, count, item]
        self.entry_finder[item] = entry
        heapq.heappush(self.elements, entry)
        
    def remove(self, item):
        """标记一个项为删除"""
        entry = self.entry_finder.pop(item)
        entry[-1] = "REMOVED"  # 替换为删除标记
        
    def get(self):
        """移除并返回优先级最低的项"""
        while self.elements:
            priority, count, item = heapq.heappop(self.elements)
            if item != "REMOVED":
                del self.entry_finder[item]
                return item
        raise KeyError('get from an empty priority queue')
```

## 2. 地图生成算法

### 2.1 随机点生成

```python
def generate_random_points(n, x_min, y_min, x_max, y_max):
    """生成n个随机点"""
    vertices = []
    
    for i in range(n):
        x = random.uniform(x_min, x_max)
        y = random.uniform(y_min, y_max)
        vertices.append(Vertex(i, x, y))
    
    return vertices
```

### 2.2 Delaunay三角剖分

使用自行实现的增量式Delaunay三角剖分算法：

```python
def delaunay_triangulation(vertices):
    """基于增量式方法实现Delaunay三角剖分"""
    # 初始化图结构
    graph = Graph()
    
    # 添加所有顶点到图中
    for vertex in vertices:
        graph.add_vertex(vertex)
    
    # 构建超级三角形，包含所有点
    super_triangle = create_super_triangle(vertices)
    triangles = [super_triangle]
    
    # 逐个添加点并更新三角剖分
    for vertex in vertices:
        # 找到包含当前点的所有三角形
        bad_triangles = []
        for triangle in triangles:
            if point_in_circumcircle(vertex, triangle):
                bad_triangles.append(triangle)
        
        # 找到多边形边界
        polygon = []
        for triangle in bad_triangles:
            for edge in triangle.edges:
                if sum(1 for t in bad_triangles if edge in t.edges) == 1:
                    polygon.append(edge)
        
        # 从三角形列表中移除不良三角形
        for triangle in bad_triangles:
            triangles.remove(triangle)
        
        # 使用当前点和多边形边界创建新三角形
        for edge in polygon:
            new_triangle = Triangle(vertex, edge.vertex1, edge.vertex2)
            triangles.append(new_triangle)
            
            # 添加边到图中
            edge_id = len(graph.edges)
            new_edge = Edge(edge_id, edge.vertex1, edge.vertex2)
            graph.add_edge(new_edge)
    
    # 移除与超级三角形相关的三角形
    # ...
    
    return graph
```

### 2.3 生成连通图

```python
def generate_connected_map(vertices, epsilon=0.1):
    """生成连通图"""
    # 使用Delaunay三角剖分创建初始图
    graph = delaunay_triangulation(vertices)
    
    # 应用最小生成树算法确保连通性
    mst = minimum_spanning_tree(graph)
    
    # 将MST的边添加到最终图中
    final_graph = Graph()
    for vertex in vertices:
        final_graph.add_vertex(vertex)
    
    for edge in mst.edges.values():
        final_graph.add_edge(edge)
    
    # 添加一些额外的边，但避免不合理的交叉
    for edge in graph.edges.values():
        if edge not in final_graph.edges.values():
            # 检查是否会导致不合理的交叉
            if not would_cause_unreasonable_crossing(edge, final_graph, epsilon):
                final_graph.add_edge(edge)
    
    # 设置道路容量
    set_road_capacities(final_graph)
    
    return final_graph
```

### 2.4 设置道路容量

```python
def set_road_capacities(graph, min_capacity=50, max_capacity=500):
    """设置道路容量"""
    # 计算所有边的长度
    edge_lengths = [edge.length for edge in graph.edges.values()]
    min_length = min(edge_lengths)
    max_length = max(edge_lengths)
    
    # 根据长度比例设置容量
    for edge in graph.edges.values():
        # 长度归一化到[0, 1]
        normalized_length = (edge.length - min_length) / (max_length - min_length)
        
        # 容量与道路长度成正比
        capacity = min_capacity + normalized_length * (max_capacity - min_capacity)
        edge.capacity = round(capacity)
```

## 3. 路径计算算法

### 3.1 Dijkstra算法优化

原始Dijkstra算法在实现计划中已给出。这里给出一些优化策略：

1. **剪枝策略**：

```python
def dijkstra_optimized(graph, start, end, max_distance=float('inf')):
    """带有剪枝的Dijkstra算法"""
    distances = {vertex: float('infinity') for vertex in graph.vertices.values()}
    distances[start] = 0
    predecessors = {vertex: None for vertex in graph.vertices.values()}
    
    pq = PriorityQueue()
    pq.put(start, 0)
    
    # 估计终点到起点的直线距离
    direct_distance = ((start.x - end.x)**2 + (start.y - end.y)**2) ** 0.5
    
    while not pq.empty():
        current = pq.get()
        
        # 到达终点，结束搜索
        if current == end:
            break
            
        current_distance = distances[current]
        
        # 剪枝：如果当前距离已经超过最大距离，跳过
        if current_distance > max_distance:
            continue
            
        # 剪枝：如果当前距离加上直线距离估计已超过当前最优解，跳过
        if current_distance + direct_distance > distances[end] and distances[end] != float('infinity'):
            continue
        
        for edge in current.edges:
            neighbor = edge.vertex2 if edge.vertex1 == current else edge.vertex1
            
            distance = current_distance + edge.length
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                predecessors[neighbor] = current
                pq.put(neighbor, distance)
    
    # 构建路径
    path = []
    current = end
    while current:
        path.append(current)
        current = predecessors[current]
    path.reverse()
    
    return path, distances[end]
```

2. **双向搜索**：

```python
def bidirectional_dijkstra(graph, start, end):
    """双向Dijkstra算法"""
    # 前向搜索
    forward_distances = {vertex: float('infinity') for vertex in graph.vertices.values()}
    forward_distances[start] = 0
    forward_predecessors = {vertex: None for vertex in graph.vertices.values()}
    forward_visited = set()
    
    forward_pq = PriorityQueue()
    forward_pq.put(start, 0)
    
    # 后向搜索
    backward_distances = {vertex: float('infinity') for vertex in graph.vertices.values()}
    backward_distances[end] = 0
    backward_predecessors = {vertex: None for vertex in graph.vertices.values()}
    backward_visited = set()
    
    backward_pq = PriorityQueue()
    backward_pq.put(end, 0)
    
    # 最佳路径
    best_path_length = float('infinity')
    meeting_point = None
    
    # 交替进行前向和后向搜索
    while not forward_pq.empty() and not backward_pq.empty():
        # 检查是否可以提前终止
        if min(forward_pq.elements[0][0], backward_pq.elements[0][0]) >= best_path_length:
            break
        
        # 前向搜索一步
        current = forward_pq.get()
        forward_visited.add(current)
        
        for edge in current.edges:
            neighbor = edge.vertex2 if edge.vertex1 == current else edge.vertex1
            
            if neighbor in forward_visited:
                continue
                
            distance = forward_distances[current] + edge.length
            
            if distance < forward_distances[neighbor]:
                forward_distances[neighbor] = distance
                forward_predecessors[neighbor] = current
                forward_pq.put(neighbor, distance)
                
                # 检查是否找到更短路径
                if neighbor in backward_visited:
                    path_length = distance + backward_distances[neighbor]
                    if path_length < best_path_length:
                        best_path_length = path_length
                        meeting_point = neighbor
        
        # 后向搜索一步
        current = backward_pq.get()
        backward_visited.add(current)
        
        for edge in current.edges:
            neighbor = edge.vertex2 if edge.vertex1 == current else edge.vertex1
            
            if neighbor in backward_visited:
                continue
                
            distance = backward_distances[current] + edge.length
            
            if distance < backward_distances[neighbor]:
                backward_distances[neighbor] = distance
                backward_predecessors[neighbor] = current
                backward_pq.put(neighbor, distance)
                
                # 检查是否找到更短路径
                if neighbor in forward_visited:
                    path_length = forward_distances[neighbor] + distance
                    if path_length < best_path_length:
                        best_path_length = path_length
                        meeting_point = neighbor
    
    # 构建路径
    if meeting_point is None:
        return None, float('infinity')
        
    # 构建前向路径
    path1 = []
    current = meeting_point
    while current:
        path1.append(current)
        current = forward_predecessors[current]
    path1.reverse()
    
    # 构建后向路径
    path2 = []
    current = backward_predecessors[meeting_point]
    while current:
        path2.append(current)
        current = backward_predecessors[current]
    
    # 合并路径
    path = path1 + path2
    
    return path, best_path_length
```

### 3.2 考虑路况的路径算法

```python
def traffic_aware_dijkstra(graph, start, end, time_constant=1.0):
    """考虑当前路况的Dijkstra算法"""
    distances = {vertex: float('infinity') for vertex in graph.vertices.values()}
    distances[start] = 0
    predecessors = {vertex: None for vertex in graph.vertices.values()}
    
    pq = PriorityQueue()
    pq.put(start, 0)
    
    while not pq.empty():
        current = pq.get()
        
        if current == end:
            break
            
        current_distance = distances[current]
        
        for edge in current.edges:
            neighbor = edge.vertex2 if edge.vertex1 == current else edge.vertex1
            
            # 使用travel_time计算通行时间
            travel_time = edge.travel_time(time_constant)
            
            # 总旅行时间
            total_time = current_distance + travel_time
            
            if total_time < distances[neighbor]:
                distances[neighbor] = total_time
                predecessors[neighbor] = current
                pq.put(neighbor, total_time)
    
    # 构建路径
    path = []
    current = end
    while current:
        path.append(current)
        current = predecessors[current]
    path.reverse()
    
    return path, distances[end]
```

## 4. 车流模拟算法

### 4.1 初始车流分配

```python
def initialize_traffic(graph, vehicle_count, min_trip_length=100):
    """初始化车流分配"""
    # 为每条边设置初始车流为0
    for edge in graph.edges.values():
        edge.current_vehicles = 0
    
    vehicles = []
    
    for i in range(vehicle_count):
        # 随机选择起点和终点
        while True:
            start = random.choice(list(graph.vertices.values()))
            end = random.choice(list(graph.vertices.values()))
            
            # 确保起点和终点不同且距离足够远
            if start != end:
                direct_distance = ((start.x - end.x)**2 + (start.y - end.y)**2) ** 0.5
                if direct_distance >= min_trip_length:
                    break
        
        # 计算最短路径
        path, _ = dijkstra(graph, start, end)
        
        if path:
            # 创建车辆对象
            vehicle = {
                'id': i,
                'start': start,
                'end': end,
                'path': path,
                'current_position': 0,  # 在路径中的索引
                'arrived': False
            }
            vehicles.append(vehicle)
            
            # 更新第一条边的车流
            if len(path) > 1:
                update_edge_traffic(graph, path[0], path[1], 1)
    
    return vehicles
```

### 4.2 动态车流更新

```python
def update_traffic(graph, vehicles, time_step=1.0):
    """更新车流状态"""
    # 道路通行时间缓存
    travel_time_cache = {}
    
    for vehicle in vehicles:
        if vehicle['arrived']:
            continue
            
        current_idx = vehicle['current_position']
        current_vertex = vehicle['path'][current_idx]
        
        # 如果已经到达终点
        if current_idx == len(vehicle['path']) - 1:
            vehicle['arrived'] = True
            continue
        
        next_vertex = vehicle['path'][current_idx + 1]
        
        # 找到当前行驶的边
        current_edge = find_edge(graph, current_vertex, next_vertex)
        
        if current_edge:
            # 计算通过当前边所需的时间
            edge_key = (current_edge.id, time_step)
            if edge_key not in travel_time_cache:
                travel_time_cache[edge_key] = current_edge.travel_time()
            
            travel_time = travel_time_cache[edge_key]
            
            # 如果已经行驶足够时间，移动到下一个顶点
            # 简化：这里假设车辆在一个时间步内可以通过多条边
            max_travel_distance = time_step
            
            while max_travel_distance > 0 and not vehicle['arrived']:
                current_idx = vehicle['current_position']
                
                if current_idx == len(vehicle['path']) - 1:
                    vehicle['arrived'] = True
                    break
                    
                current_vertex = vehicle['path'][current_idx]
                next_vertex = vehicle['path'][current_idx + 1]
                
                # 找到当前行驶的边
                current_edge = find_edge(graph, current_vertex, next_vertex)
                
                if current_edge:
                    # 计算通过边所需的时间
                    edge_key = (current_edge.id, time_step)
                    if edge_key not in travel_time_cache:
                        travel_time_cache[edge_key] = current_edge.travel_time()
                    
                    travel_time = travel_time_cache[edge_key]
                    
                    # 如果剩余时间足够通过该边
                    if max_travel_distance >= travel_time:
                        # 从当前边上减少车流
                        update_edge_traffic(graph, current_vertex, next_vertex, -1)
                        
                        # 更新车辆位置
                        vehicle['current_position'] += 1
                        
                        # 如果没有到达终点，向下一条边增加车流
                        if vehicle['current_position'] < len(vehicle['path']) - 1:
                            next_next_vertex = vehicle['path'][vehicle['current_position'] + 1]
                            update_edge_traffic(graph, next_vertex, next_next_vertex, 1)
                        
                        # 减少剩余可行驶距离
                        max_travel_distance -= travel_time
                    else:
                        # 时间不够通过该边，停止移动
                        break
```

### 4.3 车流可视化算法

```python
def traffic_level_color(edge):
    """根据车流量返回颜色代码"""
    ratio = edge.current_vehicles / edge.capacity if edge.capacity > 0 else 0
    
    if ratio <= 0.5:  # 通畅
        return "green"
    elif ratio <= 0.8:  # 轻度拥堵
        return "yellow"
    elif ratio <= 1.0:  # 中度拥堵
        return "orange"
    else:  # 严重拥堵
        return "red"

def visualize_traffic(graph, center_x, center_y, radius):
    """可视化指定区域内的交通状况"""
    # 获取区域内的顶点
    nearby_vertices = graph.get_nearby_vertices(center_x, center_y, 100)
    
    # 收集所有相关边
    edges_to_display = set()
    for vertex in nearby_vertices:
        for edge in vertex.edges:
            if edge.vertex1 in nearby_vertices or edge.vertex2 in nearby_vertices:
                edges_to_display.add(edge)
    
    # 收集可视化数据
    viz_data = []
    for edge in edges_to_display:
        viz_data.append({
            'x1': edge.vertex1.x,
            'y1': edge.vertex1.y,
            'x2': edge.vertex2.x,
            'y2': edge.vertex2.y,
            'color': traffic_level_color(edge),
            'width': 1 + 3 * (edge.current_vehicles / edge.capacity) if edge.capacity > 0 else 1
        })
    
    return viz_data
```

## 5. 地图缩放算法

### 5.1 动态密度控制

```python
def adaptive_point_selection(graph, center_x, center_y, zoom_level, screen_width, screen_height):
    """根据缩放级别自适应选择显示点"""
    # 计算当前可视区域
    # zoom_level越小，显示区域越大
    radius = 1000 / zoom_level
    
    x_min = center_x - radius
    y_min = center_y - radius
    x_max = center_x + radius
    y_max = center_y + radius
    
    # 查询区域内的所有顶点
    all_vertices = graph.spatial_index.query_range((x_min, y_min, x_max, y_max))
    
    # 根据缩放级别确定网格大小
    # 缩放级别越小，网格越大
    grid_size = 50 / zoom_level
    
    # 将区域划分为网格
    grid = {}
    
    for vertex in all_vertices:
        # 计算顶点所在的网格坐标
        grid_x = int((vertex.x - x_min) / grid_size)
        grid_y = int((vertex.y - y_min) / grid_size)
        grid_key = (grid_x, grid_y)
        
        # 向网格中添加顶点
        if grid_key not in grid:
            grid[grid_key] = vertex
        else:
            # 如果网格中已有顶点，保留更重要的顶点
            # 这里简单地认为连接边更多的顶点更重要
            if len(vertex.edges) > len(grid[grid_key].edges):
                grid[grid_key] = vertex
    
    # 返回网格中的代表点
    return list(grid.values())
```

## 6. 工具函数

```python
def find_edge(graph, vertex1, vertex2):
    """在图中查找连接两个顶点的边"""
    for edge in vertex1.edges:
        if (edge.vertex1 == vertex1 and edge.vertex2 == vertex2) or \
           (edge.vertex1 == vertex2 and edge.vertex2 == vertex1):
            return edge
    return None

def update_edge_traffic(graph, vertex1, vertex2, delta):
    """更新边的车流量"""
    edge = find_edge(graph, vertex1, vertex2)
    if edge:
        edge.current_vehicles = max(0, edge.current_vehicles + delta)
```

## 总结

本文档详细说明了导航系统各核心算法的实现方案，包括：

1. 四叉树空间索引算法，用于高效地查询二维空间中的点
2. 地图生成算法，包括Delaunay三角剖分和连通图生成
3. 路径计算算法，包括Dijkstra、双向Dijkstra和考虑路况的路径计算
4. 车流模拟算法，包括初始分配和动态更新
5. 地图缩放和可视化算法

这些算法都是自行实现的，不依赖外部算法库，可以根据项目实际需求进行调整和优化。 