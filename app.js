App({
  globalData: {
    userInfo: null,
    apiBaseUrl: 'https://api.example.com',
    musicList: [],
    currentPlaying: null,
    audioContext: null
  },
  
  onLaunch() {
    this.initStorage();
    this.initAudioContext();
  },
  
  initStorage() {
    const musicList = wx.getStorageSync('musicList') || [];
    this.globalData.musicList = musicList;
  },
  
  initAudioContext() {
    if (!this.globalData.audioContext) {
      this.globalData.audioContext = wx.createInnerAudioContext();
      this.globalData.audioContext.onEnded(() => {
        this.globalData.currentPlaying = null;
      });
    }
  },
  
  addMusic(music) {
    const musicList = this.globalData.musicList;
    musicList.unshift(music);
    this.globalData.musicList = musicList;
    wx.setStorageSync('musicList', musicList);
  },
  
  deleteMusic(id) {
    let musicList = this.globalData.musicList;
    musicList = musicList.filter(item => item.id !== id);
    this.globalData.musicList = musicList;
    wx.setStorageSync('musicList', musicList);
  },
  
  updateMusic(id, data) {
    const musicList = this.globalData.musicList;
    const index = musicList.findIndex(item => item.id === id);
    if (index !== -1) {
      musicList[index] = { ...musicList[index], ...data };
      this.globalData.musicList = musicList;
      wx.setStorageSync('musicList', musicList);
    }
  },
  
  generateId() {
    return 'music_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },
  
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },
  
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },
  
  hideLoading() {
    wx.hideLoading();
  }
});
