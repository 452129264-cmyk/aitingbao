/**
 * Suno API 服务层
 * 封装所有与 Suno API 的交互
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/suno.config');
const logger = require('../utils/logger');

// 内存存储（生产环境应使用Redis）
const taskStore = new Map();

class SunoService {
  constructor() {
    this.apiKey = config.suno.apiKey;
    this.baseUrl = config.suno.baseUrl;
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 检查API配置
   */
  isConfigured() {
    return this.apiKey && this.apiKey.length > 0;
  }

  /**
   * 生成音乐
   * @param {Object} params - 生成参数
   */
  async generateMusic(params) {
    const {
      prompt,        // 歌词或描述
      style,         // 风格标签
      title,         // 标题
      vocalGender,   // 人声性别: 'm' 或 'f'
      instrumental,  // 是否纯音乐
      customMode,    // 是否自定义模式
      model,         // 模型版本
      callBackUrl    // 回调URL
    } = params;

    if (!this.isConfigured()) {
      // 返回模拟数据用于测试
      return this.getMockResponse(params);
    }

    const requestData = {
      customMode: customMode !== false,
      instrumental: instrumental === true,
      model: model || config.suno.defaultModel,
      callBackUrl: callBackUrl || `${process.env.CALLBACK_BASE_URL}/api/callback/suno`,
      prompt: prompt,
      title: title || 'AI原创歌曲'
    };

    // 自定义模式需要style
    if (customMode !== false && style) {
      requestData.style = style;
    }

    // 非纯音乐需要人声性别
    if (!requestData.instrumental && vocalGender) {
      requestData.vocalGender = vocalGender;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}${config.suno.endpoints.generate}`,
        requestData,
        { headers: this.headers, timeout: 30000 }
      );

      if (response.data.code === 200) {
        const taskId = response.data.data.taskId;
        
        // 存储任务信息
        taskStore.set(taskId, {
          id: taskId,
          params: requestData,
          status: config.taskStatus.PROCESSING,
          createdAt: Date.now()
        });

        return {
          success: true,
          taskId: taskId,
          message: '音乐生成任务已提交'
        };
      } else {
        logger.error('Suno API error:', response.data);
        return {
          success: false,
          message: response.data.msg || 'API调用失败'
        };
      }
    } catch (error) {
      logger.error('Suno API request failed:', error.message);
      throw error;
    }
  }

  /**
   * 查询任务状态
   * @param {string} taskId - 任务ID
   */
  async getTaskStatus(taskId) {
    if (!this.isConfigured()) {
      // 返回模拟状态
      return this.getMockStatus(taskId);
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}${config.suno.endpoints.taskStatus}?taskId=${taskId}`,
        { headers: this.headers, timeout: 10000 }
      );

      if (response.data.code === 200) {
        const data = response.data.data;
        
        // 更新本地存储
        if (taskStore.has(taskId)) {
          const task = taskStore.get(taskId);
          task.status = data.status;
          task.data = data.response;
          taskStore.set(taskId, task);
        }

        return {
          status: data.status,
          data: data.response?.data || data.data,
          message: data.errorMessage
        };
      }

      return { status: config.taskStatus.FAILED, message: '查询失败' };
    } catch (error) {
      logger.error('Get task status failed:', error.message);
      throw error;
    }
  }

  /**
   * 生成歌词
   * @param {string} prompt - 描述
   */
  async generateLyrics(prompt) {
    if (!this.isConfigured()) {
      return {
        success: true,
        taskId: 'mock_lyrics_' + Date.now(),
        lyrics: this.generateMockLyrics(prompt)
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}${config.suno.endpoints.lyrics}`,
        {
          prompt: prompt,
          callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/callback/lyrics`
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (response.data.code === 200) {
        return {
          success: true,
          taskId: response.data.data.taskId
        };
      }

      return { success: false, message: response.data.msg };
    } catch (error) {
      logger.error('Generate lyrics failed:', error.message);
      throw error;
    }
  }

  /**
   * 获取配额信息
   */
  async getCredits() {
    if (!this.isConfigured()) {
      return { credits: 100, quota: 100 };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}${config.suno.endpoints.credits}`,
        { headers: this.headers, timeout: 10000 }
      );

      if (response.data.code === 200) {
        return {
          credits: response.data.data.credits,
          quota: response.data.data.totalCredits
        };
      }

      return { credits: 0, quota: 0 };
    } catch (error) {
      logger.error('Get credits failed:', error.message);
      return { credits: 0, quota: 0 };
    }
  }

  /**
   * 生成模拟响应（用于测试）
   */
  getMockResponse(params) {
    const taskId = 'mock_task_' + Date.now();
    
    taskStore.set(taskId, {
      id: taskId,
      params: params,
      status: 'PROCESSING',
      createdAt: Date.now(),
      isMock: true
    });

    return {
      success: true,
      taskId: taskId,
      message: '模拟任务已创建'
    };
  }

  /**
   * 生成模拟状态
   */
  getMockStatus(taskId) {
    const task = taskStore.get(taskId);
    
    if (!task) {
      return { status: 'FAILED', message: '任务不存在' };
    }

    // 模拟任务进度
    const elapsed = Date.now() - task.createdAt;
    
    if (elapsed < 5000) {
      return { status: 'PROCESSING', stage: 'text' };
    } else if (elapsed < 15000) {
      return { status: 'PROCESSING', stage: 'first' };
    } else {
      // 完成后返回模拟歌曲数据
      task.status = 'SUCCESS';
      task.data = [{
        id: 'mock_audio_' + taskId,
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        source_audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        title: task.params.title || 'AI原创歌曲',
        duration: 225,
        prompt: task.params.prompt,
        tags: task.params.style || 'pop'
      }];

      return {
        status: 'SUCCESS',
        data: task.data
      };
    }
  }

  /**
   * 生成模拟歌词
   */
  generateMockLyrics(prompt) {
    return `[Verse]
这是一个美好的时刻
阳光照耀着大地
我们一起追逐梦想
在这片天空下

[Chorus]
啦啦啦啦
快乐就是这么简单
啦啦啦啦
让我们一起歌唱

[Verse 2]
微风吹过脸庞
心中充满希望
无论前方有多少困难
我们永不放弃

[Chorus]
啦啦啦啦
快乐就是这么简单
啦啦啦啦
让我们一起飞翔`;
  }

  /**
   * 处理回调
   */
  handleCallback(taskId, data) {
    if (taskStore.has(taskId)) {
      const task = taskStore.get(taskId);
      task.status = data.status || config.taskStatus.SUCCESS;
      task.data = data.data;
      task.callbackData = data;
      taskStore.set(taskId, task);
    }
  }

  /**
   * 获取任务详情
   */
  getTask(taskId) {
    return taskStore.get(taskId);
  }
}

module.exports = new SunoService();
