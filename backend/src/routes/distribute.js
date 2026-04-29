/**
 * 多平台分发路由
 * 
 * 支持平台：
 * - 音乐平台：QQ音乐、网易云、汽水音乐、酷狗、酷我
 * - 短视频平台：抖音、快手、小红书
 */

const express = require('express');
const router = express.Router();
const DistributorFactory = require('../../distributors/DistributorFactory');
const { DistributeStatus, PlatformType } = require('../../distributors/BaseDistributor');
const logger = require('../utils/logger');

// 分发器工厂
const factory = new DistributorFactory();

// ==================== 平台管理 ====================

/**
 * GET /api/distribute/platforms
 * 获取支持的分发平台列表
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = factory.getAllPlatforms();
    
    res.json({
      success: true,
      data: {
        music: platforms.filter(p => p.type === PlatformType.MUSIC),
        shortVideo: platforms.filter(p => p.type === PlatformType.SHORT_VIDEO)
      }
    });
  } catch (error) {
    logger.error('获取平台列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取平台列表失败'
    });
  }
});

// ==================== 授权管理 ====================

/**
 * GET /api/distribute/auth/status
 * 获取各平台授权状态
 */
router.get('/auth/status', async (req, res) => {
  try {
    const platforms = factory.getAllPlatforms();
    const statusList = [];
    
    for (const platform of platforms) {
      const distributor = factory.createDistributor(platform.id);
      const authStatus = await distributor.validateAuth().catch(() => ({ valid: false }));
      
      statusList.push({
        platformId: platform.id,
        platformName: platform.name,
        icon: platform.icon,
        isAuthorized: authStatus.valid,
        authType: platform.authType
      });
    }
    
    res.json({
      success: true,
      data: statusList
    });
  } catch (error) {
    logger.error('获取授权状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取授权状态失败'
    });
  }
});

/**
 * POST /api/distribute/auth/authorize
 * 发起平台授权
 */
router.post('/auth/authorize', async (req, res) => {
  try {
    const { platformId, credentials } = req.body;
    
    if (!platformId) {
      return res.status(400).json({
        success: false,
        message: '缺少平台ID'
      });
    }
    
    const distributor = factory.createDistributor(platformId);
    
    if (credentials) {
      distributor.setCredentials(credentials);
    }
    
    const result = await distributor.login(credentials);
    
    res.json(result);
  } catch (error) {
    logger.error('平台授权失败:', error);
    res.status(500).json({
      success: false,
      message: '平台授权失败'
    });
  }
});

// ==================== 分发操作 ====================

/**
 * POST /api/distribute/submit
 * 提交分发任务
 */
router.post('/submit', async (req, res) => {
  try {
    const { songId, platformIds, metadata } = req.body;
    
    if (!songId) {
      return res.status(400).json({
        success: false,
        message: '缺少歌曲ID'
      });
    }
    
    if (!platformIds || !Array.isArray(platformIds) || platformIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择至少一个分发平台'
      });
    }
    
    logger.info('开始分发任务', { songId, platformIds });
    
    // 获取歌曲信息（实际从数据库获取）
    const song = {
      id: songId,
      title: metadata?.title || 'AI原创歌曲',
      audioUrl: metadata?.audioUrl,
      coverUrl: metadata?.coverUrl,
      lyrics: metadata?.lyrics,
      duration: metadata?.duration,
      style: metadata?.style
    };
    
    const results = [];
    
    // 分发到各平台
    for (const platformId of platformIds) {
      try {
        const distributor = factory.createDistributor(platformId);
        
        // 如果有保存的凭证，设置凭证
        const savedCredentials = req.session?.distributorCredentials?.[platformId];
        if (savedCredentials) {
          distributor.setCredentials(savedCredentials);
        }
        
        const result = await distributor.upload(song, {
          artistName: metadata?.artistName,
          albumName: metadata?.albumName,
          genre: metadata?.genre,
          description: metadata?.description
        });
        
        results.push({
          platformId,
          platformName: distributor.platform.name,
          ...result
        });
        
      } catch (error) {
        logger.error(`分发到 ${platformId} 失败:`, error);
        results.push({
          platformId,
          success: false,
          message: '分发失败：' + error.message
        });
      }
    }
    
    // 汇总结果
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        total: platformIds.length,
        success: successCount,
        failed: platformIds.length - successCount,
        results
      },
      message: `分发完成：${successCount}/${platformIds.length} 成功`
    });
    
  } catch (error) {
    logger.error('提交分发任务失败:', error);
    res.status(500).json({
      success: false,
      message: '提交分发任务失败'
    });
  }
});

/**
 * POST /api/distribute/status
 * 查询分发状态
 */
router.post('/status', async (req, res) => {
  try {
    const { taskId, platformId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: '缺少任务ID'
      });
    }
    
    let status;
    
    if (platformId) {
      // 查询单个平台状态
      const distributor = factory.createDistributor(platformId);
      status = await distributor.getStatus(taskId);
    } else {
      // 查询所有平台状态（实际从数据库获取）
      status = {
        success: true,
        data: {
          taskId,
          status: DistributeStatus.PENDING
        }
      };
    }
    
    res.json(status);
    
  } catch (error) {
    logger.error('查询分发状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询状态失败'
    });
  }
});

/**
 * GET /api/distribute/results/:songId
 * 获取分发结果
 */
router.get('/results/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    
    // 实际从数据库获取分发记录
    // 这里返回模拟数据
    const results = factory.getAllPlatforms().map(p => ({
      platformId: p.id,
      platformName: p.name,
      icon: p.icon,
      status: DistributeStatus.PENDING,
      submittedAt: new Date().toISOString(),
      musicUrl: null
    }));
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    logger.error('获取分发结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分发结果失败'
    });
  }
});

// ==================== 配置管理 ====================

/**
 * POST /api/distribute/config
 * 保存平台配置
 */
router.post('/config', async (req, res) => {
  try {
    const { platformId, config } = req.body;
    
    if (!platformId || !config) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 保存配置到会话或数据库
    if (!req.session.distributorCredentials) {
      req.session.distributorCredentials = {};
    }
    req.session.distributorCredentials[platformId] = config;
    
    res.json({
      success: true,
      message: '配置保存成功'
    });
    
  } catch (error) {
    logger.error('保存配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    });
  }
});

/**
 * GET /api/distribute/config/:platformId
 * 获取平台配置
 */
router.get('/config/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    
    const config = req.session?.distributorCredentials?.[platformId];
    
    res.json({
      success: true,
      data: config || null
    });
    
  } catch (error) {
    logger.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

module.exports = router;
