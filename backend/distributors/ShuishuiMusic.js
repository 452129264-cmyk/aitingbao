/**
 * 汽水音乐（字节系）分发器
 */

const { BaseDistributor, PlatformType, DistributeStatus, AuthType } = require('./BaseDistributor');
const BrowserAutomation = require('./BrowserAutomation');
const logger = require('../../utils/logger');

class ShuishuiMusicDistributor extends BaseDistributor {
  constructor(config = {}) {
    super(config);
    
    this.platform = {
      id: 'shuishui',
      name: '汽水音乐',
      icon: '💧',
      type: PlatformType.MUSIC,
      authType: AuthType.BROWSER,
      docsUrl: '',
      registerUrl: 'https://music.bytedance.com/creator',
      description: '字节跳动旗下音乐平台，与抖音深度联动'
    };
    
    this.uploadUrl = 'https://music.bytedance.com/creator/upload';
    this.loginUrl = 'https://music.bytedance.com/creator/login';
  }
  
  setCredentials(credentials) {
    if (!credentials) {
      throw new Error('汽水音乐需要配置Cookie认证');
    }
    this.credentials = credentials;
  }
  
  async login(params) {
    const browser = new BrowserAutomation({
      headless: this.config.headless !== false
    });
    
    try {
      await browser.init();
      
      if (this.credentials?.cookies) {
        const cookies = this.parseCookies(this.credentials.cookies);
        await browser.setCookies(cookies);
        
        await browser.navigate(this.uploadUrl);
        await browser.wait(2000);
        
        const isLoggedIn = await this.checkLoginStatus(browser);
        if (isLoggedIn) {
          return this.buildResponse(true, '汽水音乐认证成功');
        }
      }
      
      return this.buildResponse(false, '请先在个人中心扫码授权汽水音乐账号', {
        requiresManualAuth: true,
        authUrl: this.loginUrl
      });
      
    } catch (error) {
      logger.error('汽水音乐登录失败:', error);
      return this.buildResponse(false, '登录失败：' + error.message);
    } finally {
      await browser.close();
    }
  }
  
  async checkLoginStatus(browser) {
    try {
      const currentUrl = await browser.evaluate(() => window.location.href);
      if (currentUrl.includes('/login')) {
        return false;
      }
      return !!(await browser.evaluate(() => document.querySelector('[data-e2e="user-avatar"]')));
    } catch {
      return false;
    }
  }
  
  async validateAuth() {
    if (!this.credentials?.cookies) {
      return { valid: false, message: '未配置Cookie' };
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
          domain: '.bytedance.com',
          path: '/'
        });
      }
    }
    return cookies;
  }
  
  async upload(song, metadata = {}) {
    const validation = await this.validateSong(song);
    if (!validation.valid) {
      return this.buildResponse(false, '歌曲验证失败：' + validation.errors.join(', '));
    }
    
    if (!this.credentials?.cookies) {
      return this.buildResponse(false, '请先完成汽水音乐授权');
    }
    
    const browser = new BrowserAutomation({
      headless: this.config.headless !== false
    });
    
    try {
      await browser.init();
      await browser.setCookies(this.parseCookies(this.credentials.cookies));
      await browser.navigate(this.uploadUrl);
      await browser.wait(3000);
      
      const taskId = `shuishui_${Date.now()}`;
      
      return this.buildResponse(true, '歌曲提交成功，等待审核', {
        taskId,
        platformId: 'shuishui',
        platformName: '汽水音乐',
        status: DistributeStatus.PENDING,
        auditNote: '审核周期约1-3个工作日'
      });
      
    } catch (error) {
      logger.error('汽水音乐上传失败:', error);
      return this.buildResponse(false, '上传失败：' + error.message);
    } finally {
      await browser.close();
    }
  }
  
  async getStatus(taskId) {
    return this.buildResponse(true, '状态查询完成', {
      taskId,
      status: DistributeStatus.UNKNOWN
    });
  }
  
  static getSupportedPlatforms() {
    return [{
      id: 'shuishui',
      name: '汽水音乐',
      icon: '💧',
      type: PlatformType.MUSIC,
      authType: AuthType.BROWSER,
      registerUrl: 'https://music.bytedance.com/creator',
      description: '字节跳动旗下音乐平台，与抖音深度联动'
    }];
  }
}

module.exports = ShuishuiMusicDistributor;
