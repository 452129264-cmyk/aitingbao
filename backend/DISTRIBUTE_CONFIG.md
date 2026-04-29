# AI音乐小程序 - 独家壁垒功能配置指南

## 📋 目录

1. [AI音质质检系统](#1-ai音质质检系统)
2. [自动混音降噪](#2-自动混音降噪)
3. [精准高潮截取](#3-精准高潮截取)
4. [版权过滤系统](#4-版权过滤系统)
5. [曲风深度差异化引擎](#5-曲风深度差异化引擎)
6. [多平台分发](#6-多平台分发)

---

## 1. AI音质质检系统

### 功能说明
- **自动检测**：杂音、人声浑浊、旋律杂乱
- **评分机制**：A+(90+) / A(85+) / B+(75+) / B(70+) / C(60+) / F(<60)
- **不合格处理**：自动标记，可触发重新生成

### 质检指标

| 指标 | 说明 | 阈值 |
|------|------|------|
| SNR信噪比 | 信号功率/噪声功率 | ≥18dB |
| RMS能量 | 音频振幅 | 0.01-0.95 |
| 削波检测 | 信号截断 | ≤0处 |
| 清晰度 | 人声频段(250Hz-4kHz)质量 | ≥60% |
| 节拍稳定性 | BPM一致性 | ≥70% |

### 配置

```javascript
// 后端配置 (src/services/quality/AudioQualityInspector.js)
const inspector = new AudioQualityInspector({
  minSNR: 18,              // 最低信噪比(dB)
  minRMS: 0.01,            // 最低RMS
  maxRMS: 0.95,            // 最高RMS(防削波)
  clippingThreshold: 0.98,  // 削波阈值
  minQualityScore: 60      // 最低通过分数
});
```

### API接口

```
POST /api/quality/check
Body: { audioUrl, taskId }
Response: {
  success: true,
  data: {
    quality: {
      score: 85,
      grade: 'A',
      passed: true,
      issues: []
    },
    metrics: {
      snr: 22.5,
      rms: 0.45,
      isClipping: false,
      clarity: 0.82
    }
  }
}
```

---

## 2. 自动混音降噪

### 功能说明
- **降噪处理**：移除背景杂音
- **人声增强**：提升1kHz-4kHz人声频段
- **响度标准化**：LUFS统一化(流媒体标准-14LUFS)
- **无需手动**：全自动化处理

### LUFS标准对照

| 平台 | 目标LUFS |
|------|----------|
| Spotify | -14 |
| YouTube | -14 |
| Apple Music | -16 |
| 广播 | -23 |

### 配置

```javascript
// 后端配置 (src/services/mixer/AudioMixer.js)
const mixer = new AudioMixer({
  targetLUFS: -14,         // 目标响度
  truePeak: -1,            // 峰值限制(dB)
  vocalEnhance: 0.7,       // 人声增强强度(0-1)
  noiseReduction: 0.5,      // 降噪强度(0-1)
  outputBitrate: '320k'    // 输出码率
});
```

### 混音流程

1. **降噪** → `afftdn` 滤波器
2. **人声增强** → EQ提升1kHz-4kHz + 压缩
3. **响度标准化** → `loudnorm` 两遍法

### API接口

```
POST /api/mixer/process
Body: { 
  audioUrl, 
  taskId,
  options: {
    targetLUFS: -14,
    enhanceVocal: true,
    denoise: true
  }
}
```

---

## 3. 精准高潮截取

### 功能说明
- **能量曲线分析**：定位高能量段落
- **频谱峰值检测**：识别主旋律高潮
- **无前奏卡点**：直接进入副歌
- **适配短视频**：15秒高潮片段

### 技术原理

```
1. 能量曲线计算
   RMS(t) = sqrt(1/N * Σ x[n]²)
   
2. 滑动窗口评分
   Score(t) = 0.7 * Energy(t) + 0.3 * Spectral(t)
   
3. 高潮候选筛选
   - 能量 > 70%
   - 间隔 > 20秒
   - 位置在30秒以后
```

### 配置

```javascript
// 后端配置 (src/services/hookfinder/HookFinder.js)
const hookFinder = new HookFinder({
  targetDuration: 15,      // 目标时长(秒)
  introSkip: 10,           // 前奏跳过(秒)
  minHookInterval: 20,     // 最小间隔(秒)
  energyThreshold: 0.7,     // 能量阈值
  spectralWeight: 0.3       // 频谱权重
});
```

### API接口

```
POST /api/hook/extract
Body: { audioUrl, duration: 15 }
Response: {
  success: true,
  data: {
    startTime: 45.2,
    endTime: 60.2,
    duration: 15,
    score: 0.92,
    outputPath: '/temp/hook_xxx.mp3'
  }
}
```

---

## 4. 版权过滤系统

### 功能说明
- **旋律指纹提取**：Chromaprint算法
- **相似度比对**：余弦相似度计算
- **风险分级**：low/medium/high/critical
- **自动过滤**：高风险作品拦截

### 风险等级

| 等级 | 相似度 | 建议 |
|------|--------|------|
| Low | <70% | 可发布 |
| Medium | 70-80% | 可接受 |
| High | 80-90% | 建议微调 |
| Critical | >90% | 重新生成 |

### 技术原理

```
1. 音频指纹生成
   - 重采样至11025Hz
   - STFT → 频谱图
   - 峰值检测 → Constellation map
   - MurmurHash3 → 64位哈希

2. 相似度计算
   Similarity = cos(θ) = (A·B) / (|A||B|)
```

### 配置

```javascript
// 后端配置 (src/services/copyright/CopyrightFilter.js)
const filter = new CopyrightFilter({
  similarityThreshold: 0.7,  // 相似度阈值
  minFingerprintMatches: 5  // 最低匹配数
});
```

### API接口

```
POST /api/copyright/check
Body: { songId, fingerprint }

POST /api/copyright/fingerprint
Body: { songId, audioUrl }
```

---

## 5. 曲风深度差异化引擎

### 曲风规则

#### 伤感风格
```
节奏：BPM 55-75 (慢)
调式：C Minor / A Minor
乐器：Piano + Strings
人声：烟嗓、忧郁、情感
混音：大量混响、大量留白
```

#### 洗脑风格
```
节奏：BPM 120-130 (快)
调式：C Major / G Major
乐器：Synth Lead + 808 Bass
人声：短句重复、抓耳hook
混音：强侧链压缩
```

#### 古风风格
```
节奏：BPM 70-95 (中慢)
调式：宫商角徵羽(五声音阶)
乐器：古筝 + 笛 + 二胡
人声：清冷、古典唱法
混音：自然空间感
```

### 配置

```javascript
// 可用曲风
const styles = [
  '伤感', '洗脑', '古风', 
  '流行', '民谣', '电子'
];

// 使用引擎
const result = stylePromptEngine.generatePrompt({
  style: '伤感',
  vocalGender: 'f',
  instrumental: false
});
```

### API接口

```
POST /api/style/prompt
Body: { 
  style: '洗脑',
  vocalGender: 'm',
  instrumental: false,
  customStyle: '',
  additionalInstructions: ''
}
Response: {
  success: true,
  data: {
    prompt: 'catchy pop hook, confident male vocal...',
    negativePrompt: 'upbeat, sad, minor key...',
    metadata: {
      style: '洗脑',
      tempo: { min: 120, max: 130, target: 125 },
      key: 'C Major',
      instruments: ['Synth Lead', '808 Bass']
    }
  }
}
```

---

## 6. 多平台分发

### 支持平台

#### 音乐平台
| 平台 | 认证方式 | API支持 |
|------|----------|---------|
| QQ音乐 | API Key | ✓ 完整 |
| 网易云音乐 | API Key | ✓ 完整 |
| 汽水音乐 | Cookie | ✗ 浏览器自动化 |
| 酷狗音乐 | 腾讯音乐人 | ✓ 统一分发 |
| 酷我音乐 | 腾讯音乐人 | ✓ 统一分发 |

#### 短视频平台
| 平台 | 认证方式 | 方式 |
|------|----------|------|
| 抖音 | Cookie | 浏览器自动化 |
| 快手 | Cookie | 浏览器自动化 |
| 小红书 | 无需认证 | 素材包 |

### 平台配置

#### QQ音乐（腾讯音乐人）
```javascript
{
  platformId: 'qqmusic',
  credentials: {
    appId: 'your_app_id',
    appKey: 'your_app_key',
    token: 'your_access_token',
    artistId: 'your_artist_id'
  }
}
```

申请地址：https://y.tencentmusic.com/

#### 网易云音乐
```javascript
{
  platformId: 'netease',
  credentials: {
    appId: 'your_app_id',
    appKey: 'your_app_key',
    token: 'your_token'
  }
}
```

申请地址：https://music.163.com/st/musician

#### 抖音
```javascript
{
  platformId: 'douyin',
  credentials: {
    cookies: 'sessionid=xxx; csrf_token=xxx'
  }
}
```

获取方式：登录 creator.douyin.com → F12 → Application → Cookies

### API接口

```
GET /api/distribute/platforms
POST /api/distribute/auth/authorize
POST /api/distribute/submit
POST /api/distribute/status
GET /api/distribute/results/:songId
```

### 分发请求示例

```javascript
POST /api/distribute/submit
Body: {
  songId: 'music_xxx',
  platformIds: ['qqmusic', 'netease', 'douyin'],
  metadata: {
    title: '我的AI歌曲',
    artistName: 'AI歌手',
    genre: '流行',
    description: 'AI原创音乐'
  }
}
```

---

## 环境变量配置

```bash
# .env 文件

# 基础配置
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret

# Suno API
SUNO_API_KEY=your_suno_api_key
CALLBACK_BASE_URL=https://your-domain.com

# CORS白名单（逗号分隔）
CORS_WHITELIST=https://your-miniprogram.com

# 速率限制
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20

# 平台认证（示例）
QQMUSIC_APP_ID=xxx
QQMUSIC_APP_KEY=xxx
QQMUSIC_TOKEN=xxx

NETEASE_APP_ID=xxx
NETEASE_APP_KEY=xxx
NETEASE_TOKEN=xxx

# 抖音Cookie
DOUYIN_COOKIES=sessionid=xxx; ...

# FFmpeg路径（可选）
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

---

## 快速开始

```bash
# 1. 安装依赖
cd aitingbao-backend
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入配置

# 3. 安装FFmpeg（用于音频处理）
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: 下载ffmpeg.exe到bin目录

# 4. 启动服务
npm run dev

# 5. 测试接口
curl http://localhost:3000/api/health
```

---

## 技术栈

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **音频处理**: FFmpeg + fluent-ffmpeg
- **浏览器自动化**: Puppeteer / Playwright
- **日志**: Winston
- **安全**: express-rate-limit

---

## 注意事项

1. **合规要求**
   - 所有平台必须标注"AI生成内容"
   - 遵守各平台音乐人上传规范
   - 尊重版权，避免侵权

2. **文件格式**
   - MP3: 320kbps（推荐）
   - WAV: 44.1kHz/16bit
   - FLAC: 无损格式

3. **浏览器自动化**
   - 服务器部署需要Chrome/Chromium
   - 建议使用Docker运行
   - 注意反爬虫机制

4. **版权过滤**
   - 首次生成建议全量检测
   - 定期更新指纹数据库
   - 高风险作品自动拦截
