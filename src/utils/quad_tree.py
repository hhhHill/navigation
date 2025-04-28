"""
四叉树实现，用于高效地进行空间查询
"""

class QuadTreeNode:
    """
    四叉树节点
    
    属性:
        boundary: 边界，格式为 (x_min, y_min, x_max, y_max)
        capacity: 节点容量，超过此容量将被细分
        points: 节点中的点
        divided: 节点是否已被细分
        children: 子节点列表 [northeast, northwest, southeast, southwest]
    """
    
    def __init__(self, x_min, y_min, x_max, y_max, capacity=4):
        """
        初始化四叉树节点
        
        参数:
            x_min: 边界左下角x坐标
            y_min: 边界左下角y坐标
            x_max: 边界右上角x坐标
            y_max: 边界右上角y坐标
            capacity: 节点容量
        """
        self.boundary = (x_min, y_min, x_max, y_max)
        self.capacity = capacity
        self.points = []
        self.divided = False
        self.children = None
    
    def contains(self, x, y):
        """
        检查点是否在节点边界内
        
        参数:
            x: 点的x坐标
            y: 点的y坐标
            
        返回:
            如果点在边界内则为True，否则为False
        """
        x_min, y_min, x_max, y_max = self.boundary
        return x_min <= x <= x_max and y_min <= y <= y_max
    
    def subdivide(self):
        """细分节点为四个子节点"""
        x_min, y_min, x_max, y_max = self.boundary
        x_mid = (x_min + x_max) / 2
        y_mid = (y_min + y_max) / 2
        
        # 创建四个子节点
        self.children = [
            QuadTreeNode(x_mid, y_mid, x_max, y_max, self.capacity),  # 东北
            QuadTreeNode(x_min, y_mid, x_mid, y_max, self.capacity),  # 西北
            QuadTreeNode(x_min, y_min, x_mid, y_mid, self.capacity),  # 西南
            QuadTreeNode(x_mid, y_min, x_max, y_mid, self.capacity)   # 东南
        ]
        
        self.divided = True
        
        # 将点重新分配到子节点
        for point in self.points:
            x, y, data = point
            for child in self.children:
                if child.contains(x, y):
                    child.insert(x, y, data)
                    break
        
        # 清空当前节点的点
        self.points.clear()
    
    def insert(self, x, y, data=None):
        """
        插入点到四叉树
        
        参数:
            x: 点的x坐标
            y: 点的y坐标
            data: 与点关联的数据
            
        返回:
            如果插入成功则为True，否则为False
        """
        # 检查点是否在边界内
        if not self.contains(x, y):
            return False
        
        # 如果节点未满且未细分，直接添加点
        if len(self.points) < self.capacity and not self.divided:
            self.points.append((x, y, data))
            return True
        
        # 如果节点未细分但已满，进行细分
        if not self.divided:
            self.subdivide()
        
        # 将点插入到合适的子节点
        for child in self.children:
            if child.insert(x, y, data):
                return True
        
        # 不应该到达这里
        return False
    
    def query_range(self, x_min, y_min, x_max, y_max):
        """
        查询矩形区域内的所有点
        
        参数:
            x_min: 查询区域左下角x坐标
            y_min: 查询区域左下角y坐标
            x_max: 查询区域右上角x坐标
            y_max: 查询区域右上角y坐标
            
        返回:
            区域内的点列表 [(x, y, data), ...]
        """
        # 检查矩形与边界是否相交
        if not self._intersects(x_min, y_min, x_max, y_max):
            return []
        
        # 存储找到的点
        found_points = []
        
        # 检查当前节点的点
        for point in self.points:
            x, y, data = point
            if x_min <= x <= x_max and y_min <= y <= y_max:
                found_points.append(point)
        
        # 如果已细分，递归查询子节点
        if self.divided:
            for child in self.children:
                found_points.extend(child.query_range(x_min, y_min, x_max, y_max))
        
        return found_points
    
    def _intersects(self, x_min, y_min, x_max, y_max):
        """
        检查矩形是否与节点边界相交
        
        参数:
            x_min: 矩形左下角x坐标
            y_min: 矩形左下角y坐标
            x_max: 矩形右上角x坐标
            y_max: 矩形右上角y坐标
            
        返回:
            如果相交则为True，否则为False
        """
        b_x_min, b_y_min, b_x_max, b_y_max = self.boundary
        return not (x_max < b_x_min or x_min > b_x_max or y_max < b_y_min or y_min > b_y_max)
    
    def find_nearest(self, x, y, k=1, max_distance=float('inf')):
        """
        找到距离指定点最近的k个点
        
        参数:
            x: 查询点的x坐标
            y: 查询点的y坐标
            k: 要返回的最近点数量
            max_distance: 最大搜索距离
            
        返回:
            最近的k个点列表 [(distance, x, y, data), ...]，按距离排序
        """
        # 使用优先队列维护最近的k个点
        import heapq
        nearest_points = []
        
        # 递归查找最近点
        self._find_nearest_recursive(x, y, k, max_distance, nearest_points)
        
        # 对结果按距离排序
        nearest_points.sort(key=lambda p: p[0])
        return nearest_points
    
    def _find_nearest_recursive(self, x, y, k, max_distance, nearest_points):
        """
        递归查找最近点的辅助方法
        
        参数:
            x: 查询点的x坐标
            y: 查询点的y坐标
            k: 要返回的最近点数量
            max_distance: 最大搜索距离
            nearest_points: 当前找到的最近点列表
        """
        # 检查当前节点的点
        for point in self.points:
            px, py, data = point
            dist = ((px - x) ** 2 + (py - y) ** 2) ** 0.5
            
            if dist <= max_distance:
                # 如果还未找到k个点，或者该点比当前最远点更近
                if len(nearest_points) < k:
                    nearest_points.append((dist, px, py, data))
                    # 如果已有k个点，更新最大距离
                    if len(nearest_points) == k:
                        nearest_points.sort(key=lambda p: p[0])
                else:
                    # 如果该点比当前最远点更近，替换最远点
                    if dist < nearest_points[-1][0]:
                        nearest_points[-1] = (dist, px, py, data)
                        nearest_points.sort(key=lambda p: p[0])
                
                # 更新最大距离为当前第k近的点的距离
                if len(nearest_points) == k:
                    max_distance = nearest_points[-1][0]
        
        # 如果已细分，递归查询可能包含更近点的子节点
        if self.divided:
            # 对子节点按到查询点的距离排序
            children_with_distance = []
            for child in self.children:
                min_dist = self._min_distance(x, y, child.boundary)
                children_with_distance.append((min_dist, child))
            
            children_with_distance.sort(key=lambda p: p[0])
            
            # 递归查询子节点
            for min_dist, child in children_with_distance:
                # 如果子节点可能包含更近的点，继续查询
                if min_dist <= max_distance:
                    child._find_nearest_recursive(x, y, k, max_distance, nearest_points)
                    
                    # 更新最大距离
                    if len(nearest_points) == k:
                        max_distance = nearest_points[-1][0]
    
    def _min_distance(self, x, y, boundary):
        """
        计算点到矩形的最小距离
        
        参数:
            x: 点的x坐标
            y: 点的y坐标
            boundary: 矩形边界 (x_min, y_min, x_max, y_max)
            
        返回:
            点到矩形的最小距离
        """
        x_min, y_min, x_max, y_max = boundary
        
        # 如果点在矩形内，距离为0
        if x_min <= x <= x_max and y_min <= y <= y_max:
            return 0
        
        # 计算点到矩形各边的最小距离
        dx = max(x_min - x, 0, x - x_max)
        dy = max(y_min - y, 0, y - y_max)
        
        return (dx ** 2 + dy ** 2) ** 0.5
    
    def __str__(self):
        """返回四叉树节点的字符串表示"""
        return f"QuadTreeNode(boundary={self.boundary}, points={len(self.points)}, divided={self.divided})"


class QuadTree:
    """
    四叉树，用于高效地进行空间查询
    
    属性:
        root: 根节点
    """
    
    def __init__(self, x_min, y_min, x_max, y_max, capacity=4):
        """
        初始化四叉树
        
        参数:
            x_min: 边界左下角x坐标
            y_min: 边界左下角y坐标
            x_max: 边界右上角x坐标
            y_max: 边界右上角y坐标
            capacity: 节点容量
        """
        self.root = QuadTreeNode(x_min, y_min, x_max, y_max, capacity)
    
    def insert(self, x, y, data=None):
        """
        插入点到四叉树
        
        参数:
            x: 点的x坐标
            y: 点的y坐标
            data: 与点关联的数据
            
        返回:
            如果插入成功则为True，否则为False
        """
        return self.root.insert(x, y, data)
    
    def query_range(self, x_min, y_min, x_max, y_max):
        """
        查询矩形区域内的所有点
        
        参数:
            x_min: 查询区域左下角x坐标
            y_min: 查询区域左下角y坐标
            x_max: 查询区域右上角x坐标
            y_max: 查询区域右上角y坐标
            
        返回:
            区域内的点列表 [(x, y, data), ...]
        """
        return self.root.query_range(x_min, y_min, x_max, y_max)
    
    def find_nearest(self, x, y, k=1):
        """
        找到距离指定点最近的k个点
        
        参数:
            x: 查询点的x坐标
            y: 查询点的y坐标
            k: 要返回的最近点数量
            
        返回:
            最近的k个点列表 [(distance, x, y, data), ...]，按距离排序
        """
        return self.root.find_nearest(x, y, k)
    
    def __str__(self):
        """返回四叉树的字符串表示"""
        return f"QuadTree(root={self.root})" 