/**
 * UI工具模块 - 负责处理界面元素创建和消息显示
 */

/**
 * 创建并显示缩放信息提示
 * @param {HTMLElement} container - 容器元素
 * @returns {HTMLElement} - 创建的缩放信息元素
 */
function createScaleInfo(container) {
  const scaleInfo = document.createElement('div');
  scaleInfo.className = 'scale-info';
  container.appendChild(scaleInfo);
  return scaleInfo;
}

/**
 * 更新缩放信息显示
 * @param {HTMLElement} scaleInfo - 缩放信息元素
 * @param {number} ratio - 当前缩放比例
 */
function updateScaleInfo(scaleInfo, ratio) {
  scaleInfo.textContent = `Camera Ratio: ${ratio.toFixed(2)}`;
  scaleInfo.style.display = 'block';
  
  // 3秒后隐藏提示
  clearTimeout(scaleInfo.timeout);
  scaleInfo.timeout = setTimeout(() => {
    scaleInfo.style.display = 'none';
  }, 3000);
}

/**
 * 显示加载消息
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 消息内容
 * @returns {HTMLElement} - 创建的消息元素
 */
function showLoadingMessage(container, message) {
  const loadingMsg = document.createElement('div');
  loadingMsg.textContent = message;
  loadingMsg.className = 'info-message loading-message';
  loadingMsg.id = 'loading-nearby';
  container.appendChild(loadingMsg);
  return loadingMsg;
}

/**
 * 显示结果消息
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 消息内容
 * @param {number} hideDelay - 消息自动隐藏延迟（毫秒）
 * @returns {HTMLElement} - 创建的消息元素
 */
function showResultMessage(container, message, hideDelay = 3000) {
  const resultMsg = document.createElement('div');
  resultMsg.textContent = message;
  resultMsg.className = 'info-message result-message';
  resultMsg.id = 'result-nearby';
  container.appendChild(resultMsg);
  
  if (hideDelay > 0) {
    setTimeout(() => {
      const resultEl = document.getElementById('result-nearby');
      if (resultEl) {
        resultEl.remove();
      }
    }, hideDelay);
  }
  
  return resultMsg;
}

/**
 * 显示错误消息
 * @param {HTMLElement} container - 容器元素
 * @param {string|Error} error - 错误对象或消息
 * @param {number} hideDelay - 消息自动隐藏延迟（毫秒）
 * @returns {HTMLElement} - 创建的消息元素
 */
function showErrorMessage(container, error, hideDelay = 3000) {
  const errorMsg = document.createElement('div');
  errorMsg.textContent = error instanceof Error ? `错误: ${error.message}` : error;
  errorMsg.className = 'info-message error-message';
  errorMsg.id = 'error-nearby';
  container.appendChild(errorMsg);
  
  if (hideDelay > 0) {
    setTimeout(() => {
      const errorEl = document.getElementById('error-nearby');
      if (errorEl) {
        errorEl.remove();
      }
    }, hideDelay);
  }
  
  return errorMsg;
}

/**
 * 移除元素
 * @param {string} elementId - 元素ID
 */
function removeElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.remove();
  }
}

export {
  createScaleInfo,
  updateScaleInfo,
  showLoadingMessage,
  showResultMessage,
  showErrorMessage,
  removeElement
}; 