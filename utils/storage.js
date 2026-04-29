/**
 * 本地存储管理
 */

const STORAGE_KEYS = {
  MUSIC_LIST: 'musicList',
  USER_SETTINGS: 'userSettings',
  PLAY_HISTORY: 'playHistory'
};

/**
 * 获取音乐列表
 */
function getMusicList() {
  return wx.getStorageSync(STORAGE_KEYS.MUSIC_LIST) || [];
}

/**
 * 保存音乐列表
 */
function saveMusicList(list) {
  wx.setStorageSync(STORAGE_KEYS.MUSIC_LIST, list);
}

/**
 * 添加歌曲
 */
function addMusic(music) {
  const list = getMusicList();
  list.unshift(music);
  saveMusicList(list);
  return list;
}

/**
 * 删除歌曲
 */
function deleteMusic(id) {
  let list = getMusicList();
  list = list.filter(item => item.id !== id);
  saveMusicList(list);
  return list;
}

/**
 * 更新歌曲信息
 */
function updateMusic(id, data) {
  const list = getMusicList();
  const index = list.findIndex(item => item.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...data };
    saveMusicList(list);
  }
  return list;
}

/**
 * 获取单首歌曲
 */
function getMusic(id) {
  const list = getMusicList();
  return list.find(item => item.id === id) || null;
}

/**
 * 获取用户设置
 */
function getUserSettings() {
  return wx.getStorageSync(STORAGE_KEYS.USER_SETTINGS) || {
    vocalGender: 'm',
    style: '洗脑',
    autoSave: true
  };
}

/**
 * 保存用户设置
 */
function saveUserSettings(settings) {
  wx.setStorageSync(STORAGE_KEYS.USER_SETTINGS, settings);
}

/**
 * 添加播放历史
 */
function addPlayHistory(musicId) {
  let history = wx.getStorageSync(STORAGE_KEYS.PLAY_HISTORY) || [];
  history = history.filter(id => id !== musicId);
  history.unshift(musicId);
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
  wx.setStorageSync(STORAGE_KEYS.PLAY_HISTORY, history);
}

/**
 * 获取播放历史
 */
function getPlayHistory() {
  return wx.getStorageSync(STORAGE_KEYS.PLAY_HISTORY) || [];
}

/**
 * 清空所有数据
 */
function clearAll() {
  wx.removeStorageSync(STORAGE_KEYS.MUSIC_LIST);
  wx.removeStorageSync(STORAGE_KEYS.PLAY_HISTORY);
}

/**
 * 检查存储空间
 */
function checkStorage() {
  try {
    const res = wx.getStorageInfoSync();
    const usedMB = (res.currentSize / 1024).toFixed(2);
    const limitMB = (res.limitSize / 1024).toFixed(2);
    return {
      used: usedMB,
      limit: limitMB,
      percent: ((res.currentSize / res.limitSize) * 100).toFixed(1)
    };
  } catch (e) {
    return { used: '0', limit: '10', percent: '0' };
  }
}

module.exports = {
  STORAGE_KEYS,
  getMusicList,
  saveMusicList,
  addMusic,
  deleteMusic,
  updateMusic,
  getMusic,
  getUserSettings,
  saveUserSettings,
  addPlayHistory,
  getPlayHistory,
  clearAll,
  checkStorage
};
