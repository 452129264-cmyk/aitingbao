/**
 * 分发模块 - 基础类
 * 所有平台分发器必须继承此类
 */

const logger = require('../src/utils/logger');

/**
 * 平台类型枚举
 */
const PlatformType = {
  MUSIC: 'music',           // 音乐平台
  SHORT_VIDEO: 'short_video' // 短视频平台
};

/**
 * 审核状态枚举
 */
const DistributeStatus = {
  PENDING: 'pending',        // 待审核
  REVIEWING: 'reviewing',    // 审核中
  APPROVED: 'approved',      // 已通过
  REJECTED: 'rejected',      // 已拒绝
  OFFLINE: 'offline',        // 已下架
  UNKNOWN: 'unknown'          // 未知状态
};

/**
 * 认证类型枚举
 */
const AuthType = {
  API_KEY: 'api_key',         // API Key认证
  OAUTH: 'oauth',            // OAuth授权
  COOKIE: 'cookie',          // Cookie认证
  BROWSER: 'browser'         // 浏览器自动化
};

/**
 * 基础分发器类
 */
class BaseDistributor {
  constructor(config = {}) {
    this.config = {
      // 默认配置
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 60000,
      ...config
    };
    
    // 平台基础信息（子类覆盖）
    this.platform = {
      id: 'base',
      name: '基础平台',
      icon: '📦',
      type: PlatformType.MUSIC,
      authType: AuthType.BROWSER,
      docsUrl: '',
      registerUrl: ''
    };
    
    // 认证凭证（子类或实例化时设置）
    this.credentials = null;
  }
  
  /**
   * 获取平台ID
   */
  getPlatformId() {
    return this.platform.id;
  }
  
  /**
   * 获取平台信息
   */
  getPlatformInfo() {
    return {
      id: this.platform.id,
      name: this.platform.name,
      icon: this.platform.icon,
      type: this.platform.type,
      authType: this.platform.authType,
      docsUrl: this.platform.docsUrl,
      registerUrl: this.platform.registerUrl,
      isConfigured: this.isConfigured()
    };
  }
  
  /**
   * 检查是否已配置
   */
  isConfigured() {
    return !!this.credentials;
  }
  
  /**
   * 设置认证凭证
   * @param {Object} credentials - 认证凭证
   */
  setCredentials(credentials) {
    this.credentials = credentials;
  }
  
  /**
   * 获取认证凭证
   */
  getCredentials() {
    return this.credentials;
  }
  
  /**
   * 登录/授权
   * @param {Object} params - 登录参数
   * @returns {Promise<{success: boolean, message: string, data?: Object}>}
   */
  async login(params) {
    throw new Error('login() 方法必须被子类实现');
  }
  
  /**
   * 验证登录状态
   * @returns {Promise<{valid: boolean, expiresAt?: Date, userInfo?: Object}>}
   */
  async validateAuth() {
    throw new Error('validateAuth() 方法必须被子类实现');
  }
  
  /**
   * 获取支持的平台列表（静态方法）
   */
  static getSupportedPlatforms() {
    return [];
  }
  
  /**
   * 上传歌曲
   * @param {Object} song - 歌曲信息
   * @param {Object} metadata - 元数据
   * @returns {Promise<{success: boolean, taskId?: string, message: string, data?: Object}>}
   */
  async upload(song, metadata) {
    throw new Error('upload() 方法必须被子类实现');
  }
  
  /**
   * 查询分发状态
   * @param {string} taskId - 分发任务ID
   * @returns {Promise<{success: boolean, status: string, message?: string, data?: Object}>}
   */
  async getStatus(taskId) {
    throw new Error('getStatus() 方法必须被子类实现');
  }
  
  /**
   * 验证歌曲文件
   * @param {Object} song - 歌曲对象
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateSong(song) {
    const errors = [];
    
    // 基本验证
    if (!song.title || song.title.trim().length === 0) {
      errors.push('歌曲标题不能为空');
    }
    
    if (song.title && song.title.length > 50) {
      errors.push('歌曲标题不能超过50个字符');
    }
    
    if (!song.audioUrl && !song.audioPath) {
      errors.push('歌曲音频文件不存在');
    }
    
    // 文件大小验证（音乐平台通常限制100MB）
    if (song.fileSize && song.fileSize > 100 * 1024 * 1024) {
      errors.push('音频文件大小不能超过100MB');
    }
    
    // 封面图验证
    if (!song.coverUrl && !song.coverPath) {
      errors.push('封面图片不存在');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 生成歌词LRC文件
   * @param {string} lyrics - 歌词文本
   * @param {number} duration - 歌曲时长（秒）
   * @returns {string} LRC格式歌词
   */
  generateLRC(lyrics, duration) {
    if (!lyrics) return '';
    
    const lines = lyrics.split('\n');
    const lrcLines = [];
    
    // 生成LRC头部信息
    lrcLines.push('[ti:未命名]');
    lrcLines.push('[ar:AI歌手]');
    lrcLines.push(`[al:AI音乐专辑]`);
    lrcLines.push(`[by:AIMusicGenerator]`);
    lrcLines.push(`[length:${this.formatDuration(duration)}]`);
    lrcLines.push('');
    
    // 估算每行歌词的时间（简化处理）
    const totalLines = lines.filter(l => l.trim()).length;
    const timePerLine = totalLines > 0 ? (duration / totalLines) : 5;
    
    let currentTime = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        const centiseconds = Math.floor((currentTime % 1) * 100);
        
        lrcLines.push(`[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}]${trimmed}`);
        currentTime += timePerLine;
      }
    }
    
    return lrcLines.join('\n');
  }
  
  /**
   * 格式化时长
   * @param {number} seconds - 秒数
   * @returns {string} MM:SS格式
   */
  formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  
  /**
   * 带重试的请求
   * @param {Function} fn - 要执行的函数
   * @param {number} retries - 剩余重试次数
   * @returns {Promise<any>}
   */
  async withRetry(fn, retries = null) {
    const maxRetries = retries ?? this.config.maxRetries;
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        logger.warn(`请求失败，剩余重试次数: ${maxRetries - i}`, {
          platform: this.platform.id,
          error: error.message
        });
        
        if (i < maxRetries) {
          await this.sleep(this.config.retryDelay * (i + 1));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 构建API响应
   * @param {boolean} success - 是否成功
   * @param {string} message - 消息
   * @param {Object} data - 数据
   * @returns {Object}
   */
  buildResponse(success, message, data = null) {
    return {
      success,
      message,
      ...(data && { data }),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 获取支持的平台配置
   */
  getSupportedPlatforms() {
    return BaseDistributor.getSupportedPlatforms();
  }
}

// 导出枚举和类
module.exports = {
  BaseDistributor,
  PlatformType,
  DistributeStatus,
  AuthType
};
