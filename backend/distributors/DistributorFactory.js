/**
 * 分发器工厂
 * 统一创建和管理所有平台分发器
 */

const { PlatformType } = require('./BaseDistributor');

// 导入所有分发器
const QQMusicDistributor = require('./QQMusic');
const NetEaseCloudDistributor = require('./NetEaseCloud');
const ShuishuiMusicDistributor = require('./ShuishuiMusic');
const KugouMusicDistributor = require('./KugouMusic');
const KuwoMusicDistributor = require('./KuwoMusic');
const DouyinDistributor = require('./Douyin');
const KuaishouDistributor = require('./Kuaishou');
const XiaohongshuDistributor = require('./Xiaohongshu');

class DistributorFactory {
  constructor() {
    // 注册所有分发器
    this.distributors = {
      // 音乐平台
      qqmusic: {
        class: QQMusicDistributor,
        name: 'QQ音乐',
        icon: '🎵',
        type: PlatformType.MUSIC,
        description: '腾讯音乐人平台，一站式分发QQ音乐、酷狗、酷我'
      },
      netease: {
        class: NetEaseCloudDistributor,
        name: '网易云音乐',
        icon: '☁️',
        type: PlatformType.MUSIC,
        description: '网易音乐人平台，优质原创音乐聚集地'
      },
      shuishui: {
        class: ShuishuiMusicDistributor,
        name: '汽水音乐',
        icon: '💧',
        type: PlatformType.MUSIC,
        description: '字节跳动旗下音乐平台，与抖音联动'
      },
      kugou: {
        class: KugouMusicDistributor,
        name: '酷狗音乐',
        icon: '🐕',
        type: PlatformType.MUSIC,
        description: '酷狗音乐（通过腾讯音乐人统一分发）'
      },
      kuwo: {
        class: KuwoMusicDistributor,
        name: '酷我音乐',
        icon: '🎶',
        type: PlatformType.MUSIC,
        description: '酷我音乐（通过腾讯音乐人统一分发）'
      },
      
      // 短视频平台
      douyin: {
        class: DouyinDistributor,
        name: '抖音',
        icon: '🎬',
        type: PlatformType.SHORT_VIDEO,
        description: '抖音音乐人，短视频配乐首发平台'
      },
      kuaishou: {
        class: KuaishouDistributor,
        name: '快手',
        icon: '⚡',
        type: PlatformType.SHORT_VIDEO,
        description: '快手音乐人，短视频配乐'
      },
      xiaohongshu: {
        class: XiaohongshuDistributor,
        name: '小红书',
        icon: '📕',
        type: PlatformType.SHORT_VIDEO,
        description: '小红书配乐（提供素材包手动上传）'
      }
    };
  }

  /**
   * 创建分发器实例
   * @param {string} platformId - 平台ID
   * @returns {BaseDistributor}
   */
  createDistributor(platformId) {
    const config = this.distributors[platformId];
    
    if (!config) {
      throw new Error(`不支持的平台: ${platformId}`);
    }
    
    return new config.class();
  }

  /**
   * 获取所有平台信息
   */
  getAllPlatforms() {
    return Object.entries(this.distributors).map(([id, config]) => ({
      id,
      name: config.name,
      icon: config.icon,
      type: config.type,
      description: config.description
    }));
  }

  /**
   * 按类型获取平台
   */
  getPlatformsByType(type) {
    return Object.entries(this.distributors)
      .filter(([_, config]) => config.type === type)
      .map(([id, config]) => ({
        id,
        name: config.name,
        icon: config.icon,
        type: config.type,
        description: config.description
      }));
  }

  /**
   * 获取音乐平台列表
   */
  getMusicPlatforms() {
    return this.getPlatformsByType(PlatformType.MUSIC);
  }

  /**
   * 获取短视频平台列表
   */
  getShortVideoPlatforms() {
    return this.getPlatformsByType(PlatformType.SHORT_VIDEO);
  }

  /**
   * 检查平台是否支持
   */
  isSupported(platformId) {
    return !!this.distributors[platformId];
  }

  /**
   * 获取平台配置信息
   */
  getPlatformConfig(platformId) {
    const config = this.distributors[platformId];
    if (!config) return null;

    return {
      id: platformId,
      ...config
    };
  }

  /**
   * 批量创建分发器
   */
  createDistributors(platformIds) {
    return platformIds.map(id => this.createDistributor(id));
  }

  /**
   * 初始化所有分发器（用于预热）
   */
  warmUp() {
    const instances = {};
    for (const platformId of Object.keys(this.distributors)) {
      instances[platformId] = this.createDistributor(platformId);
    }
    return instances;
  }
}

module.exports = DistributorFactory;
