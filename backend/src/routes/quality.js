/**
 * 独家壁垒服务 - 路由
 * 
 * 整合：
 * - AI音质质检
 * - 自动混音降噪
 * - 精准高潮截取
 * - 版权过滤
 * - 曲风Prompt引擎
 */

const express = require('express');
const router = express.Router();
const { AudioQualityInspector } = require('../services/quality/AudioQualityInspector');
const { AudioMixer } = require('../services/mixer/AudioMixer');
const { HookFinder } = require('../services/hookfinder/HookFinder');
const { CopyrightFilter } = require('../services/copyright/CopyrightFilter');
const { StylePromptEngine } = require('../services/StylePromptEngine');
const logger = require('../utils/logger');

// 初始化服务
const qualityInspector = new AudioQualityInspector();
const audioMixer = new AudioMixer();
const hookFinder = new HookFinder();
const copyrightFilter = new CopyrightFilter();
const stylePromptEngine = new StylePromptEngine();

// ==================== 质检接口 ====================

/**
 * POST /api/quality/check
 * 音频质检
 */
router.post('/quality/check', async (req, res) => {
  try {
    const { audioUrl, taskId } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少音频URL'
      });
    }
    
    const report = await qualityInspector.analyze({ url: audioUrl, taskId });
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    logger.error('质检接口错误:', error);
    res.status(500).json({
      success: false,
      message: '质检失败'
    });
  }
});

// ==================== 混音接口 ====================

/**
 * POST /api/mixer/process
 * 音频混音处理
 */
router.post('/mixer/process', async (req, res) => {
  try {
    const { audioUrl, taskId, options } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少音频URL'
      });
    }
    
    const result = await audioMixer.process(audioUrl, {
      taskId,
      ...options
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('混音接口错误:', error);
    res.status(500).json({
      success: false,
      message: '混音处理失败'
    });
  }
});

/**
 * GET /api/mixer/status/:taskId
 * 获取混音状态
 */
router.get('/mixer/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  
  res.json({
    success: true,
    data: {
      taskId,
      status: 'completed',
      progress: 100
    }
  });
});

// ==================== 高潮截取接口 ====================

/**
 * POST /api/hook/extract
 * 提取高潮片段
 */
router.post('/hook/extract', async (req, res) => {
  try {
    const { audioUrl, duration } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少音频URL'
      });
    }
    
    const result = await hookFinder.extractHook(audioUrl, { duration });
    
    res.json({
      success: true,
      data: result.hookInfo
    });
    
  } catch (error) {
    logger.error('高潮提取接口错误:', error);
    res.status(500).json({
      success: false,
      message: '高潮提取失败'
    });
  }
});

/**
 * POST /api/hook/detect
 * 快速检测高潮位置
 */
router.post('/hook/detect', async (req, res) => {
  try {
    const { audioUrl } = req.body;
    const result = await hookFinder.quickDetect(audioUrl);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('高潮检测接口错误:', error);
    res.status(500).json({
      success: false,
      message: '检测失败'
    });
  }
});

// ==================== 版权过滤接口 ====================

/**
 * POST /api/copyright/check
 * 版权/相似度检测
 */
router.post('/copyright/check', async (req, res) => {
  try {
    const { songId, fingerprint } = req.body;
    
    if (!songId) {
      return res.status(400).json({
        success: false,
        message: '缺少歌曲ID'
      });
    }
    
    const result = await copyrightFilter.checkSimilarity(songId, fingerprint);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('版权检测接口错误:', error);
    res.status(500).json({
      success: false,
      message: '版权检测失败'
    });
  }
});

/**
 * POST /api/copyright/fingerprint
 * 生成音频指纹
 */
router.post('/copyright/fingerprint', async (req, res) => {
  try {
    const { songId, audioUrl } = req.body;
    
    if (!songId || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    const result = await copyrightFilter.generateFingerprint({
      id: songId,
      url: audioUrl
    });
    
    // 自动保存指纹
    copyrightFilter.saveFingerprint(songId, result);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('指纹生成接口错误:', error);
    res.status(500).json({
      success: false,
      message: '指纹生成失败'
    });
  }
});

// ==================== 曲风Prompt引擎接口 ====================

/**
 * POST /api/style/prompt
 * 生成曲风Prompt
 */
router.post('/style/prompt', async (req, res) => {
  try {
    const { style, vocalGender, instrumental, customStyle, additionalInstructions } = req.body;
    
    // 验证参数
    const validation = stylePromptEngine.validateStyleParams({
      style,
      vocalGender
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }
    
    const result = stylePromptEngine.generatePrompt({
      style,
      vocalGender,
      instrumental,
      customStyle,
      additionalInstructions
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Prompt生成接口错误:', error);
    res.status(500).json({
      success: false,
      message: 'Prompt生成失败'
    });
  }
});

/**
 * GET /api/style/list
 * 获取曲风列表
 */
router.get('/style/list', async (req, res) => {
  const styles = stylePromptEngine.getAllStyles();
  
  res.json({
    success: true,
    data: styles
  });
});

/**
 * GET /api/style/details/:styleName
 * 获取曲风详情
 */
router.get('/style/details/:styleName', async (req, res) => {
  const { styleName } = req.params;
  const details = stylePromptEngine.getStyleDetails(styleName);
  
  if (!details) {
    return res.status(404).json({
      success: false,
      message: '曲风不存在'
    });
  }
  
  res.json({
    success: true,
    data: details
  });
});

module.exports = router;
