const app = getApp();
const api = require('../../utils/api.js');
const filter = require('../../utils/filter.js');

Page({
  data: {
    prompt: '',
    styleIndex: 1,
    styleName: '洗脑',
    styleTag: 'catchy, pop, upbeat',
    hasVocal: true,
    vocalGender: 'm',
    generating: false
  },

  onLoad() {
    // 页面加载
  },

  onPromptInput(e) {
    let value = e.detail.value;
    // 敏感词过滤
    value = filter.filterText(value);
    this.setData({
      prompt: value
    });
  },

  onStyleSelect(e) {
    const index = e.currentTarget.dataset.index;
    const styles = [
      { name: '伤感', tag: 'sad, emotional, ballad' },
      { name: '洗脑', tag: 'catchy, pop, upbeat, viral' },
      { name: '古风', tag: 'ancient Chinese, traditional, poetic' }
    ];
    this.setData({
      styleIndex: index,
      styleName: styles[index].name,
      styleTag: styles[index].tag
    });
  },

  onVocalChange(e) {
    this.setData({
      hasVocal: e.detail.value
    });
  },

  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      vocalGender: gender
    });
  },

  async onGenerate() {
    const { prompt, hasVocal, vocalGender, styleName, styleTag } = this.data;

    // 输入验证
    if (!prompt || prompt.trim().length < 5) {
      app.showToast('请输入至少5个字符的描述', 'none');
      return;
    }

    if (!hasVocal) {
      app.showToast('系统暂时只支持人声歌曲', 'none');
      return;
    }

    this.setData({ generating: true });

    try {
      // 调用后端API生成音乐
      const result = await api.generateMusic({
        prompt: prompt,
        style: styleTag,
        title: `AI原创-${styleName}`,
        vocalGender: vocalGender,
        instrumental: false,
        customMode: true,
        model: 'V4_5ALL'
      });

      if (result.success) {
        // 保存生成信息到本地
        const musicData = {
          id: app.generateId(),
          title: result.title || `未命名-${styleName}`,
          prompt: prompt,
          style: styleName,
          vocalGender: vocalGender === 'm' ? '男声' : '女声',
          fullAudioUrl: result.fullAudioUrl,
          clipAudioUrl: result.clipAudioUrl,
          lyrics: result.lyrics || '',
          duration: result.duration || 0,
          coverUrl: result.coverUrl || '',
          taskId: result.taskId,
          createTime: new Date().toLocaleString('zh-CN'),
          createTimestamp: Date.now()
        };

        app.addMusic(musicData);

        // 跳转到生成页
        wx.navigateTo({
          url: `/pages/generate/generate?id=${musicData.id}&taskId=${result.taskId}`
        });
      } else {
        app.showToast(result.message || '生成失败，请重试', 'none');
      }
    } catch (err) {
      console.error('生成失败:', err);
      app.showToast('网络错误，请检查网络后重试', 'none');
    } finally {
      this.setData({ generating: false });
    }
  }
});
