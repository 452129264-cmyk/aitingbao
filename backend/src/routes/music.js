/**
 * 音乐路由 - API接口
 * 
 * 所有接口均通过后端代理调用 Suno API
 * 前端不直接接触 Suno API Key
 */

const express = require('express');
const router = express.Router();
const sunoService = require('../services/suno.service');
const audioService = require('../services/audio.service');
const { sensitiveWordFilter, checkSensitive } = require('../middleware/sensitiveFilter');
const logger = require('../utils/logger');

/**
 * POST /api/music/generate
 * 生成音乐
 * 
 * 请求体:
 * {
 *   prompt: string,         // 歌词或描述
 *   style: string,          // 音乐风格
 *   title: string,          // 歌曲标题
 *   vocalGender: 'm'|'f',   // 人声性别
 *   instrumental: boolean,   // 是否纯音乐
 *   customMode: boolean,     // 是否自定义模式
 *   model: string            // Suno模型版本
 * }
 * 
 * 响应:
 * {
 *   code: 200,
 *   success: true,
 *   taskId: string,
 *   message: string
 * }
 */
router.post('/generate', sensitiveWordFilter(), async (req, res) => {
  try {
    const { prompt, style, title, vocalGender, instrumental, customMode, model } = req.body;

    // 参数验证
    if (!prompt || prompt.trim().length < 2) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请输入至少2个字符的描述'
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '描述不能超过500个字符'
      });
    }

    logger.info('Music generation request', { 
      prompt: prompt.substring(0, 50), 
      style, 
      vocalGender 
    });

    const result = await sunoService.generateMusic({
      prompt: prompt.trim(),
      style: style || 'pop',
      title: title || 'AI原创歌曲',
      vocalGender: vocalGender || 'f',
      instrumental: instrumental || false,
      customMode: customMode !== false,
      model: model || 'V4_5ALL'
    });

    res.json({
      code: 200,
      success: result.success,
      data: {
        taskId: result.taskId
      },
      message: result.message || '任务提交成功'
    });

  } catch (error) {
    logger.error('Generate music error:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});

/**
 * GET /api/music/status/:taskId
 * 查询音乐生成状态
 * 
 * 对应 Suno API: GET /api/v1/generate/record-info?taskId=xxx
 * 
 * 响应:
 * {
 *   code: 200,
 *   success: true,
 *   data: {
 *     status: 'PENDING'|'PROCESSING'|'SUCCESS'|'FAILED',
 *     data: [{
 *       id: string,
 *       audio_url: string,
 *       title: string,
 *       duration: number,
 *       prompt: string,
 *       tags: string
 *     }]
 *   }
 * }
 */
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '缺少taskId参数'
      });
    }

    const result = await sunoService.getTaskStatus(taskId);

    res.json({
      code: 200,
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '查询失败'
    });
  }
});

/**
 * POST /api/music/lyrics
 * 生成歌词
 * 
 * 对应 Suno API: POST /api/v1/lyrics
 */
router.post('/lyrics', sensitiveWordFilter(['prompt']), async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 2) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请输入歌词描述'
      });
    }

    const result = await sunoService.generateLyrics(prompt.trim());

    res.json({
      code: 200,
      success: result.success,
      data: {
        taskId: result.taskId,
        lyrics: result.lyrics
      },
      message: result.success ? '歌词生成中' : result.message
    });

  } catch (error) {
    logger.error('Generate lyrics error:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '歌词生成失败'
    });
  }
});

/**
 * POST /api/music/clip
 * 裁剪音频片段（15秒副歌）
 * 
 * 使用 FFmpeg 处理
 */
router.post('/clip', async (req, res) => {
  try {
    const { audioUrl, startTime, duration } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '缺少音频URL'
      });
    }

    const clipPath = await audioService.clipAudio(
      audioUrl,
      startTime || 30,
      duration || 15
    );

    // 在实际部署中，需要将裁剪后的文件上传到CDN/OSS
    // 这里返回本地路径用于测试
    res.json({
      code: 200,
      success: true,
      data: {
        clipUrl: clipPath,
        startTime: startTime || 30,
        duration: duration || 15
      }
    });

  } catch (error) {
    logger.error('Clip audio error:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '音频裁剪失败'
    });
  }
});

/**
 * GET /api/music/credits
 * 查询Suno API配额
 * 
 * 对应 Suno API: GET /api/v1/get-credits
 */
router.get('/credits', async (req, res) => {
  try {
    const credits = await sunoService.getCredits();

    res.json({
      code: 200,
      success: true,
      data: credits
    });

  } catch (error) {
    logger.error('Get credits error:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '查询配额失败'
    });
  }
});

/**
 * POST /api/callback/suno
 * Suno API 生成回调
 * 
 * Suno API 在音乐生成完成后会调用此接口
 * 回调分三个阶段: text(歌词完成), first(第一首完成), complete(全部完成)
 */
router.post('/callback/suno', async (req, res) => {
  try {
    const { taskId, callbackType, data } = req.body;

    logger.info('Suno callback received', { 
      taskId, 
      callbackType,
      trackCount: data?.length 
    });

    // 更新任务状态
    sunoService.handleCallback(taskId, {
      status: callbackType === 'complete' ? 'SUCCESS' : 'PROCESSING',
      data: data
    });

    // 如果全部完成，自动裁剪15秒副歌片段
    if (callbackType === 'complete' && data && data.length > 0) {
      for (const track of data) {
        if (track.audio_url) {
          try {
            const clipPath = await audioService.clipAudio(track.audio_url, 30, 15);
            logger.info(`Auto-clipped: ${clipPath} for track ${track.id}`);
          } catch (clipErr) {
            logger.warn('Auto-clip failed:', clipErr.message);
          }
        }
      }
    }

    res.json({ code: 200, message: 'ok' });

  } catch (error) {
    logger.error('Callback error:', error);
    res.status(500).json({ code: 500, message: 'error' });
  }
});

/**
 * POST /api/callback/lyrics
 * Suno API 歌词生成回调
 */
router.post('/callback/lyrics', async (req, res) => {
  try {
    const { taskId, data } = req.body;

    logger.info('Lyrics callback received', { taskId });

    sunoService.handleCallback(taskId, {
      status: 'SUCCESS',
      data: data
    });

    res.json({ code: 200, message: 'ok' });

  } catch (error) {
    logger.error('Lyrics callback error:', error);
    res.status(500).json({ code: 500, message: 'error' });
  }
});

module.exports = router;
