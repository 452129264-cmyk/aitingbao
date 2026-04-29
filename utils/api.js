/**
 * AI音乐API封装 - 基于Suno API + 独家壁垒功能
 * 
 * 新增接口：
 * - 音频质检 API
 * - 混音处理 API
 * - 高潮检测 API
 * - 版权检测 API
 * - 分发管理 API
 */

const app = getApp();

// 后端API基础地址
const API_BASE = 'https://api.example.com';

/**
 * 封装网络请求
 */
function request(url, method, data, header = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          reject(new Error('API认证失败'));
        } else if (res.statusCode === 429) {
          reject(new Error('API配额不足'));
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(new Error('网络错误'));
      }
    });
  });
}

// ==================== 基础音乐生成 ====================

/**
 * 生成音乐
 */
function generateMusic(options) {
  const {
    prompt,
    style,
    title,
    vocalGender,
    instrumental,
    customMode,
    model
  } = options;

  return request('/api/music/generate', 'POST', {
    prompt,
    style,
    title,
    vocalGender,
    instrumental: instrumental !== undefined ? instrumental : false,
    customMode: customMode !== undefined ? customMode : true,
    model: model || 'V4_5ALL'
  });
}

/**
 * 查询生成状态
 */
function getMusicStatus(taskId) {
  return request(`/api/music/status/${taskId}`, 'GET');
}

/**
 * 获取曲风列表（含独家曲风规则）
 */
function getStyleList() {
  return request('/api/music/styles', 'GET');
}

// ==================== 独家壁垒：AI音质质检系统 ====================

/**
 * 检查音频质量
 * @param {Object} params - { audioUrl, taskId }
 * @returns {Promise<Object>} 质检报告
 */
function checkAudioQuality(params) {
  return request('/api/quality/check', 'POST', {
    audioUrl: params.audioUrl,
    taskId: params.taskId
  });
}

/**
 * 批量质检
 * @param {Array} audioList - 音频列表
 */
function batchQualityCheck(audioList) {
  return request('/api/quality/batch', 'POST', {
    audios: audioList
  });
}

// ==================== 独家壁垒：自动混音降噪 ====================

/**
 * 处理音频混音
 * @param {Object} params - { audioUrl, options }
 * options: { targetLUFS, enhanceVocal, denoise }
 */
function processAudioMix(params) {
  return request('/api/mixer/process', 'POST', {
    audioUrl: params.audioUrl,
    taskId: params.taskId,
    options: params.options || {
      targetLUFS: -14,
      enhanceVocal: true,
      denoise: true
    }
  });
}

/**
 * 获取混音状态
 */
function getMixStatus(taskId) {
  return request(`/api/mixer/status/${taskId}`, 'GET');
}

// ==================== 独家壁垒：精准高潮截取 ====================

/**
 * 提取高潮片段
 * @param {Object} params - { audioUrl, duration }
 */
function extractHook(params) {
  return request('/api/hook/extract', 'POST', {
    audioUrl: params.audioUrl,
    duration: params.duration || 15
  });
}

/**
 * 快速检测高潮位置
 */
function quickDetectHook(audioUrl) {
  return request('/api/hook/detect', 'POST', {
    audioUrl
  });
}

// ==================== 独家壁垒：版权过滤 ====================

/**
 * 检查版权/相似度
 * @param {Object} params - { songId, fingerprint }
 */
function checkCopyright(params) {
  return request('/api/copyright/check', 'POST', {
    songId: params.songId,
    fingerprint: params.fingerprint
  });
}

/**
 * 生成音频指纹
 */
function generateFingerprint(songId, audioUrl) {
  return request('/api/copyright/fingerprint', 'POST', {
    songId,
    audioUrl
  });
}

/**
 * 批量版权过滤
 */
function batchCopyrightFilter(songs) {
  return request('/api/copyright/batch', 'POST', {
    songs
  });
}

// ==================== 独家壁垒：曲风Prompt引擎 ====================

/**
 * 生成曲风Prompt
 * @param {Object} params - { style, vocalGender, instrumental }
 */
function generateStylePrompt(params) {
  return request('/api/style/prompt', 'POST', {
    style: params.style,
    vocalGender: params.vocalGender,
    instrumental: params.instrumental,
    customStyle: params.customStyle,
    additionalInstructions: params.additionalInstructions
  });
}

/**
 * 获取曲风详情
 */
function getStyleDetails(styleName) {
  return request(`/api/style/details/${styleName}`, 'GET');
}

// ==================== 多平台分发 ====================

/**
 * 获取支持的分发平台列表
 */
function getDistributePlatforms() {
  return request('/api/distribute/platforms', 'GET');
}

/**
 * 获取平台授权状态
 */
function getPlatformAuthStatus() {
  return request('/api/distribute/auth/status', 'GET');
}

/**
 * 发起平台授权
 */
function authorizePlatform(platformId) {
  return request('/api/distribute/auth/authorize', 'POST', {
    platformId
  });
}

/**
 * 分发歌曲到平台
 * @param {Object} params - { songId, platformIds }
 */
function distributeSong(params) {
  return request('/api/distribute/submit', 'POST', {
    songId: params.songId,
    platformIds: params.platformIds,
    metadata: params.metadata
  });
}

/**
 * 查询分发状态
 */
function getDistributeStatus(taskId, platformId) {
  return request('/api/distribute/status', 'POST', {
    taskId,
    platformId
  });
}

/**
 * 获取分发结果列表
 */
function getDistributeResults(songId) {
  return request(`/api/distribute/results/${songId}`, 'GET');
}

// ==================== 导出 ====================

module.exports = {
  // 基础功能
  generateMusic,
  getMusicStatus,
  getStyleList,
  
  // 独家壁垒：质检
  checkAudioQuality,
  batchQualityCheck,
  
  // 独家壁垒：混音
  processAudioMix,
  getMixStatus,
  
  // 独家壁垒：高激
  extractHook,
  quickDetectHook,
  
  // 独家壁垒：版权
  checkCopyright,
  generateFingerprint,
  batchCopyrightFilter,
  
  // 独家壁垒：曲风
  generateStylePrompt,
  getStyleDetails,
  
  // 多平台分发
  getDistributePlatforms,
  getPlatformAuthStatus,
  authorizePlatform,
  distributeSong,
  getDistributeStatus,
  getDistributeResults
};
