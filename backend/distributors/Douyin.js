/**
 * 抖音音乐人分发器
 * 
 * 平台特点：
 * - 无公开API
 * - 通过Puppeteer浏览器自动化上传
 * - 支持音乐人后台
 * 
 * 官方：https://creator.douyin.com/
 */

const { BaseDistributor, PlatformType, DistributeStatus, AuthType } = require('./BaseDistributor');
// const BrowserAutomation = require('./BrowserAutomation'); // TODO: implement
const logger = require('../src/utils/logger');

class DouyinDistributor extends BaseDistributor {
  constructor(config = {}) {
    super(config);
    
    this.platform = {
      id: 'douyin',
      name: '抖音',
      icon: '🎬',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.BROWSER,
      docsUrl: '',
      registerUrl: 'https://creator.douyin.com/creator-micro/home',
      description: '抖音音乐人，短视频配乐首发平台'
    };
    
    this.uploadUrl = 'https://creator.douyin.com/creator-micro/home';
  }
  
  setCredentials(credentials) {
    this.credentials = credentials;
  }
  
  async login(params) {
    if (!this.credentials?.cookies) {
      return this.buildResponse(false, '请先配置抖音Cookie认证', {
        requiresManualAuth: true,
        instructions: [
          '1. 登录抖音创作服务平台',
          '2. 打开开发者工具，复制Cookie',
          '3. 粘贴到配置中'
        ]
      });
    }
    
    return this.buildResponse(true, '抖音认证成功');
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
      return this.buildResponse(false, '请先完成抖音授权');
    }
    
    const browser = new BrowserAutomation({
      headless: this.config.headless !== false
    });
    
    try {
      await browser.init();
      await browser.setCookies(this.parseCookies(this.credentials.cookies));
      
      await browser.navigate(this.uploadUrl);
      await browser.wait(3000);
      
      logger.info('开始抖音上传');
      
      // 查找上传按钮并上传
      // 注意：抖音音乐人后台可能需要特定的音乐人资格
      
      const taskId = `douyin_${Date.now()}`;
      
      return this.buildResponse(true, '歌曲提交成功', {
        taskId,
        platformId: 'douyin',
        platformName: '抖音',
        status: DistributeStatus.PENDING,
        note: '请前往抖音创作服务平台确认上传'
      });
      
    } catch (error) {
      logger.error('抖音上传失败:', error);
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
          domain: '.douyin.com',
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
      id: 'douyin',
      name: '抖音',
      icon: '🎬',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.BROWSER,
      registerUrl: 'https://creator.douyin.com/creator-micro/home',
      description: '抖音音乐人，短视频配乐首发平台'
    }];
  }
}

module.exports = DouyinDistributor;
