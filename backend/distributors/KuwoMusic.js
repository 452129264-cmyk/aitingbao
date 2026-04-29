/**
 * 酷我音乐分发器
 */

const { BaseDistributor, PlatformType, DistributeStatus, AuthType } = require('./BaseDistributor');
const QQMusicDistributor = require('./QQMusic');
const BrowserAutomation = require('./BrowserAutomation');
const logger = require('../../utils/logger');

class KuwoMusicDistributor extends BaseDistributor {
  constructor(config = {}) {
    super(config);
    
    this.platform = {
      id: 'kuwo',
      name: '酷我音乐',
      icon: '🎶',
      type: PlatformType.MUSIC,
      authType: AuthType.BROWSER,
      docsUrl: '',
      registerUrl: 'https://y.tencentmusic.com/artist/apply',
      description: '酷我音乐，腾讯音乐旗下平台（可通过腾讯音乐人统一分发）'
    };
    
    this.qqMusicDistributor = null;
    this.uploadUrl = 'https://www.kuwo.cn/upload';
    this.loginUrl = 'https://www.kuwo.cn/';
  }
  
  setCredentials(credentials) {
    this.credentials = credentials;
    
    if (credentials?.qqMusicAppId && credentials?.qqMusicAppKey) {
      this.qqMusicDistributor = new QQMusicDistributor(this.config);
      this.qqMusicDistributor.setCredentials({
        appId: credentials.qqMusicAppId,
        appKey: credentials.qqMusicAppKey,
        token: credentials.qqMusicToken,
        artistId: credentials.artistId
      });
    }
  }
  
  async login(params) {
    if (this.qqMusicDistributor) {
      return await this.qqMusicDistributor.login(params);
    }
    
    return this.buildResponse(false, '请先配置腾讯音乐人账号或酷我Cookie', {
      requiresManualAuth: true
    });
  }
  
  async validateAuth() {
    if (this.qqMusicDistributor) {
      return await this.qqMusicDistributor.validateAuth();
    }
    
    if (!this.credentials?.cookies) {
      return { valid: false, message: '未配置凭证' };
    }
    
    return { valid: true };
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
          domain: '.kuwo.cn',
          path: '/'
        });
      }
    }
    return cookies;
  }
  
  async upload(song, metadata = {}) {
    if (this.qqMusicDistributor) {
      logger.info('使用腾讯音乐人统一分发到酷我');
      const result = await this.qqMusicDistributor.upload(song, {
        ...metadata,
        distributeTo: ['qqmusic', 'kugou', 'kuwo']
      });
      
      if (result.success) {
        result.data = {
          ...result.data,
          platformId: 'kuwo',
          platformName: '酷我音乐'
        };
      }
      
      return result;
    }
    
    return this.buildResponse(false, '请先配置酷我音乐授权');
  }
  
  async getStatus(taskId) {
    if (this.qqMusicDistributor) {
      return await this.qqMusicDistributor.getStatus(taskId);
    }
    
    return this.buildResponse(true, '状态查询完成', {
      taskId,
      status: DistributeStatus.UNKNOWN
    });
  }
  
  static getSupportedPlatforms() {
    return [{
      id: 'kuwo',
      name: '酷我音乐',
      icon: '🎶',
      type: PlatformType.MUSIC,
      authType: AuthType.BROWSER,
      registerUrl: 'https://y.tencentmusic.com/artist/apply',
      description: '可通过腾讯音乐人统一分发'
    }];
  }
}

module.exports = KuwoMusicDistributor;
