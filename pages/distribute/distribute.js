/**
 * 分发上架页面
 * 一键分发歌曲到8大平台
 */

const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    songId: '',
    song: null,
    
    // 平台列表
    platforms: {
      music: [],
      shortVideo: []
    },
    
    // 选择状态
    selectedPlatforms: [],
    
    // 授权状态
    authStatus: {},
    
    // 分发结果
    distributeResults: null,
    isDistributing: false,
    distributeProgress: 0
  },

  onLoad(options) {
    const songId = options.id;
    
    if (!songId) {
      app.showToast('缺少歌曲ID', 'none');
      wx.navigateBack();
      return;
    }
    
    this.setData({ songId });
    
    // 获取歌曲信息
    this.loadSongInfo(songId);
    
    // 加载平台列表
    this.loadPlatforms();
    
    // 检查授权状态
    this.checkAuthStatus();
  },

  /**
   * 加载歌曲信息
   */
  loadSongInfo(songId) {
    const musicList = app.globalData.musicList || [];
    const song = musicList.find(m => m.id === songId);
    
    if (song) {
      this.setData({ song });
    } else {
      app.showToast('歌曲不存在', 'none');
    }
  },

  /**
   * 加载平台列表
   */
  async loadPlatforms() {
    try {
      const result = await api.getDistributePlatforms();
      
      if (result.success) {
        this.setData({
          'platforms.music': result.data.music || [],
          'platforms.shortVideo': result.data.shortVideo || []
        });
      }
    } catch (error) {
      console.error('加载平台列表失败:', error);
    }
  },

  /**
   * 检查授权状态
   */
  async checkAuthStatus() {
    try {
      const result = await api.getPlatformAuthStatus();
      
      if (result.success) {
        const statusMap = {};
        for (const item of result.data) {
          statusMap[item.platformId] = item;
        }
        this.setData({ authStatus: statusMap });
      }
    } catch (error) {
      console.error('检查授权状态失败:', error);
    }
  },

  /**
   * 选择/取消选择平台
   */
  onTogglePlatform(e) {
    const platformId = e.currentTarget.dataset.id;
    const selected = this.data.selectedPlatforms;
    const platform = this.getPlatformById(platformId);
    
    if (!platform) return;
    
    // 检查是否已授权
    const auth = this.data.authStatus[platformId];
    if (auth && !auth.isAuthorized && platform.authType !== 'manual') {
      wx.showModal({
        title: '需要授权',
        content: `请先授权 ${platform.name} 账号`,
        confirmText: '去授权',
        success: (res) => {
          if (res.confirm) {
            this.onAuthorize(platformId);
          }
        }
      });
      return;
    }
    
    const index = selected.indexOf(platformId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(platformId);
    }
    
    this.setData({ selectedPlatforms: selected });
  },

  /**
   * 获取平台信息
   */
  getPlatformById(platformId) {
    const all = [...this.data.platforms.music, ...this.data.platforms.shortVideo];
    return all.find(p => p.id === platformId);
  },

  /**
   * 全选/取消全选
   */
  onSelectAll(type) {
    const platforms = type === 'music' ? this.data.platforms.music : this.data.platforms.shortVideo;
    const selected = [...this.data.selectedPlatforms];
    
    const allSelected = platforms.every(p => selected.includes(p.id));
    
    if (allSelected) {
      // 取消全选
      for (const p of platforms) {
        const index = selected.indexOf(p.id);
        if (index > -1) {
          selected.splice(index, 1);
        }
      }
    } else {
      // 全选
      for (const p of platforms) {
        const auth = this.data.authStatus[p.id];
        // 跳过未授权且非manual的平台
        if (auth?.isAuthorized || p.authType === 'manual') {
          if (!selected.includes(p.id)) {
            selected.push(p.id);
          }
        }
      }
    }
    
    this.setData({ selectedPlatforms: selected });
  },

  /**
   * 发起授权
   */
  async onAuthorize(platformId) {
    try {
      wx.showLoading({ title: '获取授权...' });
      
      const result = await api.authorizePlatform(platformId);
      
      wx.hideLoading();
      
      if (result.success) {
        if (result.requiresManualAuth) {
          // 需要手动授权
          wx.showModal({
            title: '手动授权',
            content: result.message + '\n\n请按提示完成授权后复制Cookie',
            confirmText: '我已完成授权',
            cancelText: '取消'
          });
        } else {
          app.showToast('授权成功', 'success');
          this.checkAuthStatus();
        }
      } else {
        app.showToast(result.message || '授权失败', 'none');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('授权失败:', error);
      app.showToast('授权失败', 'none');
    }
  },

  /**
   * 开始分发
   */
  async onStartDistribute() {
    if (this.data.selectedPlatforms.length === 0) {
      app.showToast('请选择至少一个平台', 'none');
      return;
    }
    
    if (!this.data.song) {
      app.showToast('歌曲信息不存在', 'none');
      return;
    }
    
    wx.showModal({
      title: '确认分发',
      content: `确定要分发到 ${this.data.selectedPlatforms.length} 个平台吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.executeDistribute();
        }
      }
    });
  },

  /**
   * 执行分发
   */
  async executeDistribute() {
    this.setData({ 
      isDistributing: true, 
      distributeProgress: 0,
      distributeResults: null 
    });
    
    const total = this.data.selectedPlatforms.length;
    const results = [];
    
    try {
      const result = await api.distributeSong({
        songId: this.data.songId,
        platformIds: this.data.selectedPlatforms,
        metadata: {
          title: this.data.song.title,
          audioUrl: this.data.song.fullAudioUrl,
          coverUrl: this.data.song.coverUrl,
          lyrics: this.data.song.lyrics,
          duration: this.data.song.duration,
          style: this.data.song.style,
          genre: this.data.song.style,
          artistName: 'AI歌手'
        }
      });
      
      if (result.success) {
        results.push(...result.data.results);
      }
      
    } catch (error) {
      console.error('分发失败:', error);
      app.showToast('分发失败', 'none');
    }
    
    this.setData({
      isDistributing: false,
      distributeProgress: 100,
      distributeResults: results
    });
    
    // 显示结果
    this.showDistributeResult(results);
  },

  /**
   * 显示分发结果
   */
  showDistributeResult(results) {
    const successCount = results.filter(r => r.success).length;
    const total = results.length;
    
    let content = `分发完成\n\n`;
    content += `成功：${successCount}/${total}\n\n`;
    
    for (const r of results) {
      const status = r.success ? '✅' : '❌';
      content += `${status} ${r.platformName}: ${r.message || (r.success ? '已提交' : '失败')}\n`;
    }
    
    wx.showModal({
      title: '分发结果',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 查看分发状态
   */
  onViewStatus(e) {
    const platformId = e.currentTarget.dataset.id;
    const result = this.data.distributeResults?.find(r => r.platformId === platformId);
    
    if (!result) {
      app.showToast('暂无分发记录', 'none');
      return;
    }
    
    wx.showModal({
      title: result.platformName,
      content: `状态：${result.status}\n任务ID：${result.taskId}\n\n${result.note || ''}`,
      showCancel: true,
      confirmText: '查看详情',
      cancelText: '关闭'
    });
  },

  /**
   * 查看历史记录
   */
  async onViewHistory() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await api.getDistributeResults(this.data.songId);
      
      wx.hideLoading();
      
      if (result.success) {
        this.setData({ distributeResults: result.data });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载历史失败:', error);
      app.showToast('加载失败', 'none');
    }
  },

  /**
   * 复制素材包链接
   */
  onCopyPackageLink(e) {
    const platformId = e.currentTarget.dataset.id;
    const result = this.data.distributeResults?.find(r => r.platformId === platformId);
    
    if (!result || !result.packageUrl) {
      app.showToast('无可用链接', 'none');
      return;
    }
    
    wx.setClipboardData({
      data: result.packageUrl,
      success: () => {
        app.showToast('已复制链接', 'success');
      }
    });
  }
});
