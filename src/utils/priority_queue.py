"""
优先队列实现，用于路径寻找算法
"""
import heapq

class PriorityQueue:
    """
    优先队列实现，基于Python的heapq模块
    
    用于路径寻找算法中按优先级排序的开放列表
    """
    
    def __init__(self):
        """初始化空的优先队列"""
        self.elements = []  # (priority, count, item)
        self.count = 0  # 用于避免具有相同优先级的元素比较
        self.entry_finder = {}  # item -> (priority, count, item)
    
    def empty(self):
        """
        检查队列是否为空
        
        返回:
            如果队列为空则为True，否则为False
        """
        return len(self.elements) == 0
    
    def put(self, item, priority):
        """
        将元素插入队列
        
        参数:
            item: 要插入的元素
            priority: 元素的优先级（越小优先级越高）
        """
        if item in self.entry_finder:
            self.remove(item)
        
        entry = [priority, self.count, item]
        self.entry_finder[item] = entry
        heapq.heappush(self.elements, entry)
        self.count += 1
    
    def remove(self, item):
        """
        从队列中移除指定元素
        
        参数:
            item: 要移除的元素
        """
        entry = self.entry_finder.pop(item)
        entry[-1] = None  # 标记为已移除
    
    def get(self):
        """
        获取并移除优先级最高的元素
        
        返回:
            优先级最高的元素
        """
        while self.elements:
            _, _, item = heapq.heappop(self.elements)
            if item is not None:
                del self.entry_finder[item]
                return item
        
        raise KeyError('从空队列中获取元素')
    
    def contains(self, item):
        """
        检查队列是否包含指定元素
        
        参数:
            item: 要检查的元素
            
        返回:
            如果队列包含该元素则为True，否则为False
        """
        return item in self.entry_finder
    
    def update_priority(self, item, priority):
        """
        更新队列中元素的优先级
        
        参数:
            item: 要更新的元素
            priority: 新的优先级
        """
        self.put(item, priority)  # 会自动移除旧的条目
    
    def __len__(self):
        """获取队列中元素的数量"""
        return len(self.entry_finder)
    
    def __str__(self):
        """返回优先队列的字符串表示"""
        return f"PriorityQueue(size={len(self)})"
    
    def __repr__(self):
        """返回优先队列的详细表示"""
        return self.__str__() 