/**
 * 小红书分发器
 * 
 * 小红书无音乐人后台，采用"素材包"方案：
 * - 生成符合平台要求的文件包
 * - 提供上传链接和操作指引
 * - 用户手动完成上传
 */

const { BaseDistributor, PlatformType, DistributeStatus, AuthType } = require('./BaseDistributor');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

class XiaohongshuDistributor extends BaseDistributor {
  constructor(config = {}) {
    super(config);
    
    this.platform = {
      id: 'xiaohongshu',
      name: '小红书',
      icon: '📕',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.MANUAL, // 手动上传
      docsUrl: '',
      registerUrl: 'https://creator.xiaohongshu.com/',
      description: '小红书配乐（提供素材包手动上传）'
    };
    
    this.tempDir = path.join(__dirname, '../../../temp/package');
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  setCredentials(credentials) {
    // 小红书不需要认证凭证
    this.credentials = {};
  }
  
  async login(params) {
    // 无需登录
    return this.buildResponse(true, '小红书分发无需登录，直接生成素材包', {
      manualUpload: true
    });
  }
  
  async validateAuth() {
    return { valid: true };
  }
  
  /**
   * 生成小红书素材包
   * 包含：音频文件 + 封面图 + 歌词 + 操作指引
   */
  async upload(song, metadata = {}) {
    const validation = await this.validateSong(song);
    if (!validation.valid) {
      return this.buildResponse(false, '歌曲验证失败：' + validation.errors.join(', '));
    }
    
    try {
      logger.info('生成小红书素材包', { title: song.title });
      
      // 生成素材包
      const packageResult = await this.generatePackage(song, metadata);
      
      const taskId = `xiaohongshu_${Date.now()}`;
      
      return this.buildResponse(true, '素材包生成成功', {
        taskId,
        platformId: 'xiaohongshu',
        platformName: '小红书',
        status: DistributeStatus.PENDING,
        isManual: true,
        packageUrl: packageResult.packageUrl,
        instructions: this.getUploadInstructions(),
        note: '请下载素材包，按指引手动上传到小红书'
      });
      
    } catch (error) {
      logger.error('小红书素材包生成失败:', error);
      return this.buildResponse(false, '生成失败：' + error.message);
    }
  }
  
  /**
   * 生成素材包
   */
  async generatePackage(song, metadata) {
    const taskId = `xiaohongshu_${Date.now()}`;
    const packageDir = path.join(this.tempDir, taskId);
    
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }
    
    const files = [];
    
    // 1. 复制/下载音频文件
    const audioFile = path.join(packageDir, `${song.title}.mp3`);
    if (song.audioPath && fs.existsSync(song.audioPath)) {
      fs.copyFileSync(song.audioPath, audioFile);
    } else if (song.audioUrl) {
      // 实际需要下载
      // 这里简化处理
    }
    files.push({
      name: '音频文件.mp3',
      path: audioFile,
      desc: '歌曲完整版音频'
    });
    
    // 2. 生成歌词文件（LRC格式）
    if (song.lyrics) {
      const lrcContent = this.generateLRC(song.lyrics, song.duration);
      const lrcFile = path.join(packageDir, `${song.title}.lrc`);
      fs.writeFileSync(lrcFile, lrcContent, 'utf8');
      files.push({
        name: '歌词文件.lrc',
        path: lrcFile,
        desc: '带时间轴的歌词文件'
      });
    }
    
    // 3. 生成封面图（如果有）
    if (song.coverPath && fs.existsSync(song.coverPath)) {
      const coverFile = path.join(packageDir, `cover.jpg`);
      fs.copyFileSync(song.coverPath, coverFile);
      files.push({
        name: '封面图.jpg',
        path: coverFile,
        desc: '建议尺寸 1:1 或 3:4'
      });
    }
    
    // 4. 生成操作指引
    const instructions = this.getUploadInstructionsMarkdown(song);
    const guideFile = path.join(packageDir, '小红书上传指引.md');
    fs.writeFileSync(guideFile, instructions, 'utf8');
    files.push({
      name: '上传指引.md',
      path: guideFile,
      desc: '详细操作步骤'
    });
    
    // 5. 生成音频信息JSON
    const infoFile = path.join(packageDir, '歌曲信息.json');
    const info = {
      title: song.title,
      style: song.style || metadata.genre,
      duration: song.duration,
      artist: metadata.artistName || 'AI歌手',
      aiGenerated: true,
      uploadTime: new Date().toISOString()
    };
    fs.writeFileSync(infoFile, JSON.stringify(info, null, 2), 'utf8');
    files.push({
      name: '歌曲信息.json',
      path: infoFile,
      desc: '歌曲元数据'
    });
    
    // 返回包路径（实际需要压缩成zip）
    const packageUrl = packageDir;
    
    return {
      packageDir,
      packageUrl,
      files
    };
  }
  
  /**
   * 获取上传指引
   */
  getUploadInstructions() {
    return [
      '1. 打开小红书App，点击右下角"+"发布笔记',
      '2. 选择"上传视频"，导入我们的音频文件',
      '3. 如需配视频，可使用封面图作为视频背景',
      '4. 填写标题和描述，记得标注"#AI音乐"标签',
      '5. 发布后可在评论区置顶歌曲信息'
    ];
  }
  
  /**
   * 获取上传指引（Markdown格式）
   */
  getUploadInstructionsMarkdown(song) {
    return `# 小红书配乐上传指引

## 歌曲信息
- 标题：${song.title}
- 风格：${song.style || 'AI音乐'}
- 时长：${Math.floor(song.duration / 60)}分${song.duration % 60}秒

## 上传步骤

### 第一步：准备素材
1. 音频文件：\`${song.title}.mp3\`
2. 封面图：\`cover.jpg\`（如需要）
3. 歌词：\`${song.title}.lrc\`（可选）

### 第二步：发布笔记
1. 打开小红书App
2. 点击右下角"+"按钮
3. 选择"上传视频"
4. 导入我们的音频文件作为视频配乐

### 第三步：添加描述
建议标题格式：
\`\`\`
🎵【AI原创】${song.title}

#AI音乐 #原创音乐 #${song.style || '音乐分享'}
✨本歌曲由AI技术生成
\`\`\`

### 第四步：发布
1. 检查无误后点击发布
2. 建议在评论区置顶歌曲信息

## 注意事项
- 请务必标注"AI生成内容"
- 遵守小红书社区规范
- 尊重原创，文明传播

---
生成时间：${new Date().toLocaleString('zh-CN')}
`;
  }
  
  async getStatus(taskId) {
    return this.buildResponse(true, '请手动完成上传', {
      taskId,
      status: DistributeStatus.PENDING,
      isManual: true
    });
  }
  
  static getSupportedPlatforms() {
    return [{
      id: 'xiaohongshu',
      name: '小红书',
      icon: '📕',
      type: PlatformType.SHORT_VIDEO,
      authType: AuthType.MANUAL,
      registerUrl: 'https://creator.xiaohongshu.com/',
      description: '小红书配乐（提供素材包手动上传）'
    }];
  }
}

module.exports = XiaohongshuDistributor;
