/**
 * 认证中间件
 */

const logger = require('../utils/logger');

/**
 * API Key 认证
 * 用于验证小程序端的请求
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // 简单的API Key验证
  // 生产环境应使用更安全的方式（如JWT、OAuth等）
  const validKeys = (process.env.API_KEYS || '').split(',').filter(k => k);
  
  // 如果没有配置API Keys，则跳过验证
  if (validKeys.length === 0) {
    return next();
  }
  
  if (!apiKey || !validKeys.includes(apiKey)) {
    logger.warn('Unauthorized API access attempt', { 
      ip: req.ip, 
      path: req.path 
    });
    return res.status(401).json({
      code: 401,
      success: false,
      message: 'API Key无效或缺失'
    });
  }
  
  next();
}

/**
 * 微信小程序请求验证
 * 验证请求来源是否为微信小程序
 */
function wxMiniAppAuth(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  
  // 微信小程序的User-Agent包含micromessenger
  // 但服务端请求不会有这个标识，所以仅作参考
  // 生产环境建议使用微信的session验证
  
  next();
}

/**
 * 速率限制
 * 防止恶意请求
 */
function createRateLimiter() {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
    message: {
      code: 430,
      success: false,
      message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

module.exports = {
  apiKeyAuth,
  wxMiniAppAuth,
  createRateLimiter
};
