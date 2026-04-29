/**
 * Suno API 配置文件
 * 基于 https://docs.sunoapi.org
 */

module.exports = {
  // Suno API 配置
  suno: {
    baseUrl: process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org',
    apiKey: process.env.SUNO_API_KEY || '',
    
    // API端点
    endpoints: {
      generate: '/api/v1/generate',
      generateCustom: '/api/v1/custom_generate',
      lyrics: '/api/v1/lyrics',
      taskStatus: '/api/v1/generate/record-info',
      credits: '/api/v1/get-credits',
      extend: '/api/v1/generate/extend',
      vocalRemoval: '/api/v1/vocal-removal/generate',
      wavConvert: '/api/v1/wav/generate'
    },
    
    // 模型版本
    models: ['V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5'],
    defaultModel: 'V4_5ALL',
    
    // 请求限制
    maxPromptLength: 5000,
    maxStyleLength: 1000,
    maxTitleLength: 100,
    
    // 轮询配置
    pollInterval: 5000,      // 轮询间隔(ms)
    pollTimeout: 300000,     // 轮询超时(ms) = 5分钟
    callbackTimeout: 600000  // 回调超时(ms) = 10分钟
  },
  
  // 任务状态
  taskStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED'
  },
  
  // 回调阶段
  callbackStages: {
    TEXT: 'text',       // 歌词生成完成
    FIRST: 'first',     // 第一首歌生成完成
    COMPLETE: 'complete' // 全部生成完成
  },
  
  // 曲风映射
  styleMapping: {
    '伤感': 'sad, emotional, ballad, melancholic, piano',
    '洗脑': 'catchy, pop, upbeat, viral, danceable, repetitive melody',
    '古风': 'ancient Chinese, traditional, poetic, guzheng, erhu, classical'
  }
};
