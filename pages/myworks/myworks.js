const app = getApp();

Page({
  data: {
    musicList: [],
    playing: false,
    playingId: null,
    currentMusic: null,
    showMenu: false,
    showRenameModal: false,
    newName: '',
    currentEditingId: null
  },

  audioContext: null,

  onLoad() {
    this.audioContext = wx.createInnerAudioContext();
    this.audioContext.onEnded(() => {
      this.setData({
        playing: false,
        playingId: null
      });
    });
  },

  onShow() {
    this.loadMusicList();
  },

  onHide() {
    if (this.audioContext) {
      this.audioContext.pause();
      this.setData({ playing: false });
    }
  },

  onUnload() {
    if (this.audioContext) {
      this.audioContext.stop();
      this.audioContext.destroy();
    }
  },

  onPullDownRefresh() {
    this.loadMusicList();
    wx.stopPullDownRefresh();
  },

  loadMusicList() {
    const musicList = wx.getStorageSync('musicList') || [];
    this.setData({ musicList });
  },

  onPlayMusic(e) {
    const id = e.currentTarget.dataset.id;
    const music = this.data.musicList.find(m => m.id === id);
    
    if (!music || !music.fullAudioUrl) {
      app.showToast('音频无效', 'none');
      return;
    }

    if (this.data.playingId === id && this.data.playing) {
      // 暂停
      this.audioContext.pause();
      this.setData({ playing: false });
    } else {
      // 播放
      if (this.data.playingId !== id) {
        this.audioContext.src = music.fullAudioUrl;
      }
      this.audioContext.play();
      this.setData({ 
        playing: true, 
        playingId: id,
        currentMusic: music
      });
    }
  },

  onShowMenu(e) {
    const id = e.currentTarget.dataset.id;
    const music = this.data.musicList.find(m => m.id === id);
    this.setData({
      showMenu: true,
      currentMusic: music,
      currentEditingId: id
    });
  },

  onHideMenu() {
    this.setData({ showMenu: false });
  },

  preventBubble() {
    // 阻止冒泡
  },

  onRename() {
    this.setData({
      showMenu: false,
      showRenameModal: true,
      newName: this.data.currentMusic?.title || ''
    });
  },

  onNameInput(e) {
    this.setData({ newName: e.detail.value });
  },

  onCancelRename() {
    this.setData({
      showRenameModal: false,
      newName: ''
    });
  },

  onConfirmRename() {
    const { newName, currentEditingId } = this.data;
    
    if (!newName || newName.trim().length === 0) {
      app.showToast('请输入歌曲名称', 'none');
      return;
    }

    app.updateMusic(currentEditingId, { title: newName.trim() });
    this.loadMusicList();
    this.setData({ showRenameModal: false });
    app.showToast('重命名成功', 'success');
  },

  onDownload() {
    this.setData({ showMenu: false });
    
    const music = this.data.currentMusic;
    if (!music || !music.fullAudioUrl) {
      app.showToast('音频链接无效', 'none');
      return;
    }

    wx.showLoading({ title: '下载中...' });
    
    wx.downloadFile({
      url: music.fullAudioUrl,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success: () => {
              app.showToast('下载成功', 'success');
            },
            fail: () => {
              app.showToast('保存失败', 'none');
            }
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        app.showToast('下载失败', 'none');
      }
    });
  },

  onShare() {
    this.setData({ showMenu: false });
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onDelete() {
    wx.showModal({
      title: '删除歌曲',
      content: '确定要删除这首歌曲吗？删除后不可恢复。',
      success: (res) => {
        if (res.confirm) {
          const id = this.data.currentEditingId;
          app.deleteMusic(id);
          this.loadMusicList();
          
          if (this.data.playingId === id) {
            this.audioContext.stop();
            this.setData({ playing: false, playingId: null });
          }
          
          app.showToast('已删除', 'success');
        }
        this.setData({ showMenu: false });
      }
    });
  },

  onGoCreate() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
