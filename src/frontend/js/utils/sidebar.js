/**
 * 生成侧边栏的 HTML 字符串
 * @param {string} currentPage - 当前页面的标识符 ('map' 或 'quadtree-viz')
 * @returns {string} 完整的侧边栏 HTML 字符串
 */
export function generateSidebar(currentPage) {
    // 页面配置定义
    const pageConfigs = {
        'map': {
            sectionTitle: '项目介绍',
            sectionContent: `
                <p>本导航系统采用先进的图论算法和空间索引结构，提供高效的路径规划和交通模拟功能。</p>
                <p>当前页面展示了城市道路网络的拓扑结构，支持最短路径计算和车流模拟。</p>
            `,
            operationGuideTitle: '使用指南',
            operationGuideContent: `
                <p>• 使用鼠标滚轮缩放地图</p>
                <p>• 拖动鼠标移动地图位置</p>
                <p>• 点击节点可查看详细信息</p>
                <p>• 使用功能区按钮进行路径规划</p>
            `
        },
        'quadtree-viz': {
            sectionTitle: '四叉树介绍',
            sectionContent: `
                <p>四叉树是一种树形数据结构，每个内部节点都有四个子节点，常用于空间索引和区域查询优化。</p>
                <p>本页面可视化展示了四叉树在地图空间索引中的应用，实现高效的近邻点查询。</p>
            `,
            operationGuideTitle: '操作指南',
            operationGuideContent: `
                <p>• 缩放可查看不同层级的划分</p>
                <p>• 移动鼠标查看四叉树节点详情</p>
                <p>• 点击区域查看包含的数据点</p>
            `
        },
        'default': {
            sectionTitle: '介绍',
            sectionContent: '<p>请选择一个页面</p>',
            operationGuideTitle: '指南',
            operationGuideContent: '<p>无特定指南</p>'
        }
    };

    // 获取当前页面配置，如果未找到则使用默认配置
    const config = pageConfigs[currentPage] || pageConfigs['default'];
    
    // 导航项定义
    const navItems = [
        {
            id: 'map',
            icon: '🗺️',
            text: '导航地图',
            url: 'map'
        },
        {
            id: 'quadtree-viz',
            icon: '🌲',
            text: '四叉树可视化',
            url: 'quadtree-viz'
        }
    ];

    // 生成导航项HTML
    const renderNavItems = () => {
        return navItems.map((item, index) => {
            const isActive = currentPage === item.id;
            return `
                <li class="nav-item ${isActive ? 'active' : ''} animate__animated animate__fadeInLeft" style="animation-delay: ${0.1 * (index + 1)}s;">
                    <a href="${item.url}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.text}</span>
                    </a>
                </li>
            `;
        }).join('');
    };

    // 生成侧边栏区域HTML
    const renderSectionContent = (title, content, animationDelay) => {
        return `
            <div class="sidebar-section animate__animated animate__fadeIn" style="animation-delay: ${animationDelay}s;">
                <h3 class="section-title">${title}</h3>
                <div class="section-content">
                    ${content}
                </div>
            </div>
        `;
    };

    // 返回完整的侧边栏 HTML 字符串
    return `
        <aside class="app-sidebar">
            <div class="sidebar-header animate__animated animate__fadeIn">
                <div class="logo">
                    <span class="logo-text">智能导航</span>
                </div>
                <button id="toggle-sidebar" class="sidebar-toggle" title="隐藏/显示侧边栏">
                    <span>◀</span>
                </button>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    ${renderNavItems()}
                </ul>
            </nav>
            ${renderSectionContent(config.sectionTitle, config.sectionContent, 0.3)}
            ${renderSectionContent(config.operationGuideTitle, config.operationGuideContent, 0.4)}
            <div class="sidebar-footer">
                <span>© 2023 网络工程</span>
            </div>
        </aside>
    `;
} 