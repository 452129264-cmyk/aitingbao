/**
 * 主入口文件 - Express 服务器
 * 
 * 包含独家壁垒功能：
 * - AI音质质检
 * - 自动混音降噪
 * - 精准高潮截取
 * - 版权过滤
 * - 曲风Prompt引擎
 * - 多平台分发
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { apiKeyAuth, createRateLimiter } = require('./middleware/auth');
const musicRouter = require('./routes/music');
const qualityRouter = require('./routes/quality');
const distributeRouter = require('./routes/distribute');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 中间件 ============

// CORS配置
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = (process.env.CORS_WHITELIST || '').split(',').filter(w => w);
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Session配置（用于存储分发凭证）
app.use(session({
  secret: process.env.SESSION_SECRET || 'aitingbao-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// 静态文件服务
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
app.use('/audio', express.static(tempDir));
app.use('/temp', express.static(tempDir));

// ============ 路由 ============

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    status: 'ok',
    timestamp: new Date().toISOString(),
    sunoConfigured: !!process.env.SUNO_API_KEY,
    features: {
      qualityCheck: true,
      audioMix: true,
      hookFinder: true,
      copyrightFilter: true,
      distribute: true
    }
  });
});

// 音乐生成相关路由
app.use('/api/music', createRateLimiter(), musicRouter);

// ============ 独家壁垒功能路由 ============

// AI音质质检、自动混音、高潮检测、版权过滤、曲风引擎
app.use('/api/quality', createRateLimiter(), qualityRouter);
app.use('/api/mixer', createRateLimiter(), qualityRouter);
app.use('/api/hook', createRateLimiter(), qualityRouter);
app.use('/api/copyright', createRateLimiter(), qualityRouter);
app.use('/api/style', createRateLimiter(), qualityRouter);

// 多平台分发路由
app.use('/api/distribute', createRateLimiter(), distributeRouter);

// ============ 错误处理 ============

// 404
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    success: false,
    message: '接口不存在'
  });
});

// 全局错误
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: 500,
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : '服务器内部错误'
  });
});

// ============ 启动服务器 ============

app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎵 AI写歌后端服务启动成功                               ║
║                                                          ║
║   📡 服务地址: http://localhost:${PORT.toString().padEnd(19)}║
║                                                          ║
║   🔑 Suno API: ${process.env.SUNO_API_KEY ? '已配置 ✓' : '未配置 ✗ (使用模拟数据)'.padEnd(31)}║
║                                                          ║
║   ══════════ 独家壁垒功能 ══════════                       ║
║   🎧 AI音质质检系统  ✓                                   ║
║   🎛️ 自动混音降噪    ✓                                   ║
║   🎯 精准高潮截取    ✓                                   ║
║   📝 版权过滤系统    ✓                                   ║
║   🎨 曲风Prompt引擎  ✓                                   ║
║   🌐 多平台分发      ✓ (8大平台)                        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
