# Vis.js 网络图集群功能详细说明

## 目录
- [基本概念](#基本概念)
- [集群创建方法](#集群创建方法)
- [集群操作](#集群操作)
- [集群样式与属性](#集群样式与属性)
- [实用代码示例](#实用代码示例)

## 基本概念

在 vis.js 网络图中，集群(Clustering)是将多个节点合并为一个节点的过程，可以帮助简化复杂网络的显示，提高渲染性能。集群后的节点被称为集群节点(Cluster Node)，它有自己的ID和属性。

集群功能主要通过 `network.clustering` 对象访问，该对象提供了一系列方法来创建、管理和操作集群。

## 集群创建方法

### 1. 基本集群方法

最基本的集群方法是 `cluster()`，它允许你通过各种条件来确定哪些节点应该被集群在一起：

```javascript
network.clustering.cluster({
    joinCondition: function(nodeOptions) {
        // 返回 true 表示将该节点加入集群
        return nodeOptions.color.background === 'red';
    },
    processProperties: function(clusterOptions, childNodes, childEdges) {
        // 处理集群节点的属性
        clusterOptions.label = '红色节点集群 (' + childNodes.length + '个节点)';
        return clusterOptions;
    },
    clusterNodeProperties: {
        // 定义集群节点的属性
        borderWidth: 3,
        shape: 'box',
        color: { background: 'red' }
    }
});
```

### 2. 内置的集群方法

vis.js 提供了几种预定义的集群策略：

#### 按连接性集群

将与指定节点相连的所有节点集群：

```javascript
// 将与节点2相连的所有节点集群
network.clustering.clusterByConnection(2);
```

#### 按中心度(Hub)集群

将具有大量连接的节点(Hub)及其邻居集群：

```javascript
// 集群所有具有3个及以上连接的节点
network.clustering.clusterByHubsize(3);
```

#### 集群离群点

将孤立或连接少的节点集群：

```javascript
network.clustering.clusterOutliers();
```

### 3. 自定义集群条件

可以基于任何条件创建集群：

```javascript
// 按颜色集群
network.clustering.cluster({
    joinCondition: function(nodeOptions) {
        return nodeOptions.color.background === 'blue';
    },
    clusterNodeProperties: {
        label: '蓝色节点集群',
        color: { background: 'blue' }
    }
});

// 按区域集群
network.clustering.cluster({
    joinCondition: function(nodeOptions) {
        return nodeOptions.x < 0 && nodeOptions.y < 0;
    },
    clusterNodeProperties: {
        label: '左上区域集群',
        shape: 'diamond'
    }
});
```

## 集群操作

### 1. 打开集群

要展开一个集群，使用 `openCluster()` 方法：

```javascript
// 打开指定ID的集群
network.clustering.openCluster(clusterId);
```

### 2. 检查节点是否为集群

```javascript
// 检查节点是否为集群节点
var isCluster = network.clustering.isCluster(nodeId);
if (isCluster) {
    console.log("节点 " + nodeId + " 是一个集群");
}
```

### 3. 获取集群中的节点

```javascript
// 获取集群中包含的所有节点ID
var nodesInCluster = network.clustering.getNodesInCluster(clusterId);
console.log("集群中的节点: " + nodesInCluster.join(', '));
```

### 4. 查找包含特定节点的集群

```javascript
// 搜索包含特定节点的所有集群
var nodeId = 5;
var allNodes = nodes.get();
var containingClusters = [];

for (var i = 0; i < allNodes.length; i++) {
    if (network.clustering.isCluster(allNodes[i].id)) {
        var clusterNodes = network.clustering.getNodesInCluster(allNodes[i].id);
        if (clusterNodes.includes(nodeId)) {
            containingClusters.push(allNodes[i].id);
        }
    }
}
```

### 5. 刷新集群

当数据集发生变化时，可能需要重新计算集群：

```javascript
// 更新数据后重新计算所有集群
network.clustering.updateClusterer();
```

## 集群样式与属性

### 1. 集群节点属性

集群节点的属性可以通过 `clusterNodeProperties` 参数设置：

```javascript
network.clustering.cluster({
    // 集群条件...
    clusterNodeProperties: {
        // 视觉属性
        shape: 'box',
        size: 30,
        borderWidth: 2,
        borderWidthSelected: 4,
        
        // 颜色
        color: {
            background: '#CCDDEE',
            border: '#2B7CE9',
            highlight: { background: '#D2E5FF' }
        },
        
        // 标签
        font: { size: 14, face: 'arial', color: 'black' },
        label: '集群名称',
        
        // 阴影
        shadow: true,
        
        // 其他自定义属性
        title: '集群提示信息'
    }
});
```

### 2. 动态计算集群属性

`processProperties` 回调函数可以根据集群内的子节点和边动态计算集群节点的属性：

```javascript
network.clustering.cluster({
    // 集群条件...
    processProperties: function(clusterOptions, childNodes, childEdges) {
        // 计算集群中所有节点的平均值
        var totalMass = 0;
        for (var i = 0; i < childNodes.length; i++) {
            totalMass += childNodes[i].mass || 1;
        }
        
        // 设置集群属性
        clusterOptions.mass = totalMass;
        clusterOptions.label = '总质量: ' + totalMass;
        
        // 根据子节点数量调整大小
        clusterOptions.size = 10 + childNodes.length * 5;
        
        return clusterOptions;
    }
});
```

## 实用代码示例

### 1. 基于缩放级别的自动集群

```javascript
// 当缩放级别变化时自动集群或解除集群
network.on("zoom", function(params) {
    var scale = params.scale;
    
    // 在不同缩放级别应用不同集群策略
    if (scale <= 0.4) {
        // 高度缩小状态：应用更多集群
        network.clustering.clusterByHubsize(2);
    } else if (scale <= 0.7) {
        // 中等缩小状态：只集群中心节点
        network.clustering.clusterByHubsize(5);
    } else {
        // 正常/放大状态：解除所有集群
        // 获取所有节点
        var allNodes = nodes.get();
        for (var i = 0; i < allNodes.length; i++) {
            if (network.clustering.isCluster(allNodes[i].id)) {
                network.clustering.openCluster(allNodes[i].id);
            }
        }
    }
});
```

### 2. 基于用户选择的集群

```javascript
// 允许用户选择多个节点并将它们集群在一起
var selectedNodes = [];

network.on("selectNode", function(params) {
    selectedNodes = params.nodes;
});

document.getElementById('clusterSelectedBtn').addEventListener('click', function() {
    if (selectedNodes.length > 1) {
        network.clustering.cluster({
            joinCondition: function(nodeOptions) {
                return selectedNodes.includes(nodeOptions.id);
            },
            clusterNodeProperties: {
                label: '用户选择的集群',
                color: { background: '#a3a8b4' }
            }
        });
        // 清空选择
        selectedNodes = [];
        network.unselectAll();
    }
});
```

### 3. 按属性集群

```javascript
// 按节点的某个属性值集群
function clusterByProperty(propertyName) {
    // 获取所有节点
    var allNodes = nodes.get();
    // 收集所有唯一的属性值
    var propertyValues = {};
    
    allNodes.forEach(function(node) {
        if (node[propertyName] !== undefined) {
            propertyValues[node[propertyName]] = true;
        }
    });
    
    // 为每个属性值创建一个集群
    Object.keys(propertyValues).forEach(function(value) {
        network.clustering.cluster({
            joinCondition: function(nodeOptions) {
                return nodeOptions[propertyName] === value;
            },
            clusterNodeProperties: {
                label: propertyName + ': ' + value,
                title: '包含所有 ' + propertyName + '=' + value + ' 的节点'
            }
        });
    });
}

// 使用
clusterByProperty('category');
```

### 4. 集群事件监听

```javascript
// 监听集群创建和打开事件
network.on("clusterCreated", function(params) {
    console.log("创建了新集群，ID: " + params.clusterNodeId);
    console.log("包含的节点: " + params.containedNodes);
});

network.on("clusterExpanded", function(params) {
    console.log("集群已展开，ID: " + params.clusterNodeId);
});
```

### 5. 完整的集群管理工具示例

```javascript
// 创建一个集群管理对象
var clusterManager = {
    activeClusters: {},
    
    // 创建集群
    createCluster: function(criteria, label) {
        var clusterId = 'cluster_' + new Date().getTime();
        
        network.clustering.cluster({
            joinCondition: criteria,
            clusterNodeProperties: {
                id: clusterId,
                label: label,
                shape: 'box'
            },
            processProperties: function(clusterOptions, childNodes) {
                clusterOptions.label += ' (' + childNodes.length + '个节点)';
                return clusterOptions;
            }
        });
        
        this.activeClusters[clusterId] = {
            label: label,
            criteria: criteria
        };
        
        return clusterId;
    },
    
    // 打开集群
    openCluster: function(clusterId) {
        if (network.clustering.isCluster(clusterId)) {
            network.clustering.openCluster(clusterId);
            delete this.activeClusters[clusterId];
            return true;
        }
        return false;
    },
    
    // 打开所有集群
    openAllClusters: function() {
        var allNodes = nodes.get();
        var opened = 0;
        
        for (var i = 0; i < allNodes.length; i++) {
            if (network.clustering.isCluster(allNodes[i].id)) {
                network.clustering.openCluster(allNodes[i].id);
                opened++;
            }
        }
        
        this.activeClusters = {};
        return opened;
    },
    
    // 重新应用所有活动集群
    reapplyClusters: function() {
        // 先打开所有集群
        this.openAllClusters();
        
        // 重新应用每个集群
        for (var clusterId in this.activeClusters) {
            var cluster = this.activeClusters[clusterId];
            this.createCluster(cluster.criteria, cluster.label);
        }
    }
};

// 使用集群管理器
var redClusterId = clusterManager.createCluster(
    function(nodeOptions) { return nodeOptions.color.background === 'red'; },
    '红色节点集群'
);

// 打开特定集群
document.getElementById('openRedCluster').addEventListener('click', function() {
    clusterManager.openCluster(redClusterId);
});

// 打开所有集群
document.getElementById('openAllClusters').addEventListener('click', function() {
    var count = clusterManager.openAllClusters();
    console.log("已打开 " + count + " 个集群");
});
```

以上示例涵盖了vis.js网络图中集群功能的大部分用法。根据实际需求，你可以组合这些方法来实现更复杂的集群逻辑。
