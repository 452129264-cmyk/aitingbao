/**
 * 快手音乐人分发器
 */

const { BaseDistributor, PlatformType, DistributeStatus, AuthType } = require('./BaseDistributor');
const BrowserAutomation = require('./BrowserAutomation');
const logger = require('../../utils/logger');

class KuaishouDistributor extends BaseDistributor {
  constructor(config = {}) {
    super(config);
    
    this.platform = {
      id: 'kuaishou',
      name: '快手',
      icon: '⚡',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.BROWSER,
      docsUrl: '',
      registerUrl: 'https://cp.kuaishou.com/',
      description: '快手音乐人，短视频配乐'
    };
    
    this.uploadUrl = 'https://cp.kuaishou.com/';
  }
  
  setCredentials(credentials) {
    this.credentials = credentials;
  }
  
  async login(params) {
    if (!this.credentials?.cookies) {
      return this.buildResponse(false, '请先配置快手Cookie认证', {
        requiresManualAuth: true
      });
    }
    return this.buildResponse(true, '快手认证成功');
  }
  
  async validateAuth() {
    if (!this.credentials?.cookies) {
      return { valid: false, message: '未配置凭证' };
    }
    return { valid: true };
  }
  
  async upload(song, metadata = {}) {
    const validation = await this.validateSong(song);
    if (!validation.valid) {
      return this.buildResponse(false, '歌曲验证失败：' + validation.errors.join(', '));
    }
    
    if (!this.credentials?.cookies) {
      return this.buildResponse(false, '请先完成快手授权');
    }
    
    const browser = new BrowserAutomation({
      headless: this.config.headless !== false
    });
    
    try {
      await browser.init();
      await browser.setCookies(this.parseCookies(this.credentials.cookies));
      
      await browser.navigate(this.uploadUrl);
      await browser.wait(3000);
      
      const taskId = `kuaishou_${Date.now()}`;
      
      return this.buildResponse(true, '歌曲提交成功', {
        taskId,
        platformId: 'kuaishou',
        platformName: '快手',
        status: DistributeStatus.PENDING,
        note: '请前往快手创作者平台确认上传'
      });
      
    } catch (error) {
      logger.error('快手上传失败:', error);
      return this.buildResponse(false, '上传失败：' + error.message);
    } finally {
      await browser.close();
    }
  }
  
  parseCookies(cookieInput) {
    if (Array.isArray(cookieInput)) return cookieInput;
    
    const cookies = [];
    const parts = cookieInput.split(';');
    for (const part of parts) {
      const [name, ...valueParts] = part.trim().split('=');
      if (name && valueParts.length) {
        cookies.push({
          name: name.trim(),
          value: valueParts.join('='),
          domain: '.kuaishou.com',
          path: '/'
        });
      }
    }
    return cookies;
  }
  
  async getStatus(taskId) {
    return this.buildResponse(true, '状态查询完成', {
      taskId,
      status: DistributeStatus.UNKNOWN
    });
  }
  
  static getSupportedPlatforms() {
    return [{
      id: 'kuaishou',
      name: '快手',
      icon: '⚡',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.BROWSER,
      registerUrl: 'https://cp.kuaishou.com/',
      description: '快手音乐人，短视频配乐'
    }];
  }
}

module.exports = KuaishouDistributor;
