/**
 * UI工具模块 - 负责处理UI相关的工具函数
 */

// 消息自动消失的延迟时间（毫秒）
const MESSAGE_TIMEOUT = 3000;

/**
 * 创建缩放信息提示
 * @param {HTMLElement} container - 父容器元素
 * @returns {HTMLElement} 创建的缩放信息元素
 */
function createScaleInfo(container) {
  const scaleInfo = document.getElementById('scale-info') || document.createElement('div');
  
  if (!scaleInfo.id) {
    scaleInfo.id = 'scale-info';
    scaleInfo.textContent = '缩放: 1.000';
    container.appendChild(scaleInfo);
  }
  
  return scaleInfo;
}

/**
 * 更新缩放信息
 * @param {HTMLElement} scaleInfo - 缩放信息元素
 * @param {number} ratio - 缩放比例
 */
function updateScaleInfo(scaleInfo, ratio) {
  scaleInfo.textContent = `缩放: ${ratio.toFixed(3)}`;
}

/**
 * 显示加载消息
 * @param {HTMLElement} container - 父容器元素
 * @param {string} message - 消息文本
 * @returns {HTMLElement} 创建的消息元素
 */
function showLoadingMessage(container, message) {
  // 移除可能存在的相同ID元素
  removeElement('loading-nearby');
  
  const loadingElement = document.createElement('div');
  loadingElement.id = 'loading-nearby';
  loadingElement.className = 'loading';
  loadingElement.textContent = message;
  
  container.appendChild(loadingElement);
  return loadingElement;
}

/**
 * 显示结果消息
 * @param {HTMLElement} container - 父容器元素
 * @param {string} message - 消息文本
 * @returns {HTMLElement} 创建的消息元素
 */
function showResultMessage(container, message) {
  return showMessage(container, message, 'success');
}

/**
 * 显示错误消息
 * @param {HTMLElement} container - 父容器元素
 * @param {string} message - 消息文本
 * @returns {HTMLElement} 创建的消息元素
 */
function showErrorMessage(container, message) {
  return showMessage(container, message, 'error');
}

/**
 * 显示通用消息
 * @param {HTMLElement} container - 父容器元素
 * @param {string} message - 消息文本
 * @param {string} type - 消息类型（success或error）
 * @returns {HTMLElement} 创建的消息元素
 */
function showMessage(container, message, type = '') {
  // 移除之前的消息
  removeElement('message');
  
  const messageElement = document.createElement('div');
  messageElement.id = 'message';
  messageElement.className = `message ${type}`;
  messageElement.textContent = message;
  
  container.appendChild(messageElement);
  
  // 设置自动消失
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.style.opacity = '0';
      setTimeout(() => removeElement('message'), 300);
    }
  }, MESSAGE_TIMEOUT);
  
  return messageElement;
}

/**
 * 移除元素
 * @param {string} elementId - 要移除元素的ID
 */
function removeElement(elementId) {
  const element = document.getElementById(elementId);
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * 创建控制按钮
 * @param {HTMLElement} container - 父容器元素
 * @param {string} id - 按钮ID
 * @param {string} text - 按钮文本
 * @param {Function} clickHandler - 点击处理函数
 * @param {Object} position - 位置对象，包含top、left和right属性
 * @returns {HTMLElement} 创建的按钮元素
 */
function createControlButton(container, id, text, clickHandler, position = { top: '10px', left: '10px' }) {
  const button = document.createElement('button');
  button.id = id;
  button.className = 'control-button';
  button.textContent = text;
  button.style.top = position.top;
  
  // 支持left和right定位
  if (position.right !== undefined) {
    button.style.right = position.right;
  } else {
    button.style.left = position.left || '10px';
  }
  
  button.addEventListener('click', clickHandler);
  
  container.appendChild(button);
  return button;
}

export {
  createScaleInfo,
  updateScaleInfo,
  showLoadingMessage,
  showResultMessage,
  showErrorMessage,
  showMessage,
  removeElement,
  createControlButton
}; 