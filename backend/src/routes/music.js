const express = require('express');
const router = express.Router();
const sunoService = require('../services/suno.service');
const localMusicService = require('../services/localMusic.service');
const _SPE = require('../services/StylePromptEngine');
const stylePromptEngine = (typeof _SPE === 'function') ? new _SPE() : _SPE;
const { sensitiveWordFilter } = require('../middleware/sensitiveFilter');
const logger = require('../utils/logger');

const SUNO_CREDITS_ERROR = 'The current credits are insufficient';

router.post('/generate', sensitiveWordFilter(), async (req, res) => {
  try {
    const { prompt, style, title, vocalGender, instrumental, customMode, model } = req.body;
    if (!prompt || prompt.trim().length < 2) return res.status(400).json({code:400,success:false,message:'请输入至少2个字符'});
    if (prompt.length > 500) return res.status(400).json({code:400,success:false,message:'描述不能超过500字'});

    logger.info('Music generation request', {prompt:prompt.substring(0,50), style, vocalGender});

    let result = await sunoService.generateMusic({
      prompt:prompt.trim(), style:style||'pop', title:title||'AI原创歌曲',
      vocalGender:vocalGender||'f', instrumental:instrumental||false,
      customMode:customMode!==false, model:model||'V4_5ALL'
    });

    if (!result.success && result.message && result.message.includes(SUNO_CREDITS_ERROR)) {
      logger.warn('Suno积分不足，切换本地引擎');
      const localPrompt = stylePromptEngine.buildPrompt(prompt.trim(), style||'洗脑', vocalGender==='男'?'男':'女');
      result = await localMusicService.generateMusic({prompt:localPrompt, duration:30});

      if (result.success) {
        return res.json({code:200,success:true,data:{taskId:result.taskId,audioUrl:result.audioUrl,duration:result.duration},message:'本地音乐生成成功',source:'local'});
      } else {
        return res.status(500).json({code:500,success:false,message:'Suno积分不足，本地也失败: '+result.message});
      }
    }

    res.json({code:200,success:result.success,data:{taskId:result.taskId},message:result.message||'任务提交成功',source:'suno'});
  } catch(e) {
    logger.error('Generate music error:', e);
    res.status(500).json({code:500,success:false,message:'服务器错误'});
  }
});

router.get('/status/:taskId', async (req, res) => {
  try {
    const {taskId} = req.params;
    if (!taskId) return res.status(400).json({code:400,success:false,message:'缺少taskId'});
    if (taskId.startsWith('local_')) {
      return res.json({code:200,success:true,data:{status:'SUCCESS',message:'本地音乐生成完成'}});
    }
    const result = await sunoService.getTaskStatus(taskId);
    res.json({code:200,success:true,data:result});
  } catch(e) {
    res.status(500).json({code:500,success:false,message:'状态查询失败'});
  }
});

router.get('/local-status', async (req, res) => {
  const available = await localMusicService.healthCheck();
  res.json({code:200,success:true,data:{available,source:'local'}});
});

module.exports = router;
