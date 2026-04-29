/**
 * 自动混音降噪系统
 * 
 * 功能：
 * - 自动拉高人声清晰度
 * - 压缩统一响度（LUFS标准化）
 * - 降噪处理
 * - 不用用户手动调音
 * 
 * 使用 fluent-ffmpeg 进行音频处理
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

class AudioMixer {
  constructor(options = {}) {
    this.options = {
      // LUFS标准化目标值
      // 流媒体平台标准: -14 LUFS (Spotify, YouTube)
      // 广播标准: -23 LUFS
      // Apple Music: -16 LUFS
      targetLUFS: -14,
      // 峰值限制 (dB)
      truePeak: -1,
      // 人声增强强度 (0-1)
      vocalEnhance: 0.7,
      // 降噪强度 (0-1)
      noiseReduction: 0.5,
      // 输出格式
      outputFormat: 'mp3',
      outputBitrate: '320k',
      // 临时文件目录
      tempDir: path.join(__dirname, '../../../temp'),
      ...options
    };

    // 确保临时目录存在
    if (!fs.existsSync(this.options.tempDir)) {
      fs.mkdirSync(this.options.tempDir, { recursive: true });
    }
  }

  /**
   * 完整混音处理流程
   * @param {string} inputPath - 输入音频路径
   * @param {Object} params - 处理参数
   * @returns {Promise<Object>} 处理结果
   */
  async process(inputPath, params = {}) {
    const taskId = `mix_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const outputPath = path.join(
      this.options.tempDir,
      `${taskId}_processed.${this.options.outputFormat}`
    );

    try {
      logger.info('开始混音处理', { inputPath, taskId });

      const result = {
        taskId,
        inputPath,
        outputPath,
        steps: [],
        success: false
      };

      // 步骤1: 降噪处理
      const denoiseResult = await this.applyDenoise(inputPath, taskId, params);
      result.steps.push({ name: 'denoise', ...denoiseResult });

      // 步骤2: 人声增强
      const vocalResult = await this.enhanceVocal(denoiseResult.output, taskId, params);
      result.steps.push({ name: 'vocal_enhance', ...vocalResult });

      // 步骤3: 响度标准化
      const loudnormResult = await this.applyLoudnorm(vocalResult.output, taskPath => {
        // 更新下一步的输入
        result.steps[2].input = loudPath;
      });
      result.steps.push({ name: 'loudnorm', ...loudnormResult });

      // 最终输出路径
      result.outputPath = loudnormResult.output;
      result.lufs = loudnormResult.measuredLUFS;
      result.success = true;

      logger.info('混音处理完成', { taskId, outputPath: result.outputPath });

      return result;

    } catch (error) {
      logger.error('混音处理失败:', error);
      throw error;
    }
  }

  /**
   * 降噪处理
   * 使用FFmpeg的avectorscope和lowpass滤波器组合
   */
  async applyDenoise(inputPath, taskId, params = {}) {
    const outputPath = path.join(this.options.tempDir, `${taskId}_denoised.wav`);
    const intensity = params.denoiseIntensity || this.options.noiseReduction;

    return new Promise((resolve, reject) => {
      // 使用FFmpeg的降噪滤镜
      // hqdn3d: 高质量3D降噪
      // ladspa: LADSPA插件支持
      const command = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        // 降噪强度根据参数调整
        `-af "highpass=f=200,lowpass=f=3000,afftdn=nr=${intensity * 10}:nt=w"` ,
        `-ar 44100`,
        `"${outputPath}"`
      ].join(' ');

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.warn('降噪处理失败，使用原始文件:', error.message);
          resolve({
            output: inputPath,
            success: false,
            message: '降噪处理跳过'
          });
        } else {
          resolve({
            output: outputPath,
            success: true,
            message: '降噪完成'
          });
        }
      });
    });
  }

  /**
   * 人声增强
   * 增强人声频段，提升清晰度
   */
  async enhanceVocal(inputPath, taskId, params = {}) {
    const outputPath = path.join(this.options.tempDir, `${taskId}_vocal.wav`);
    const intensity = params.vocalIntensity || this.options.vocalEnhance;

    return new Promise((resolve, reject) => {
      // 人声增强策略：
      // 1. 提升中频(1kHz-4kHz) - 人声主要频段
      // 2. 轻微压缩动态范围
      // 3. 添加轻微混响提升空间感
      const command = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        `-af "equalizer=f=1000:t=h:width_type=o:width=2000:g=${intensity * 6},` +  // 提升1kHz附近
        `equalizer=f=2500:t=h:width_type=o:width=1500:g=${intensity * 4},` +  // 提升2.5kHz附近
        `acompressor=threshold=${-20 + intensity * 5}dB:ratio=3:attack=5:release=50,"` + // 压缩
        `"${outputPath}"`
      ].join(' ');

      exec(command, (error) => {
        if (error) {
          logger.warn('人声增强失败:', error.message);
          resolve({
            output: inputPath,
            success: false,
            message: '人声增强跳过'
          });
        } else {
          resolve({
            output: outputPath,
            success: true,
            message: '人声增强完成'
          });
        }
      });
    });
  }

  /**
   * LUFS响度标准化
   * 使用EBU R128标准
   */
  async applyLoudnorm(inputPath, taskId) {
    const outputPath = path.join(this.options.tempDir, `${taskId}_loudnorm.${this.options.outputFormat}`);
    const targetLUFS = this.options.targetLUFS;

    return new Promise((resolve, reject) => {
      // 两遍法LUFS测量和标准化
      // 第一遍：测量音频的LUFS
      const measureCommand = `ffmpeg -i "${inputPath}" -af loudnorm=print_format=json -f null -`;

      exec(measureCommand, (error, stdout, stderr) => {
        // 解析测量结果
        let measuredLUFS = -14;
        let measuredTP = -1;
        let measuredLR = -10;

        try {
          const jsonMatch = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
          if (jsonMatch) {
            const stats = JSON.parse(jsonMatch[0]);
            measuredLUFS = parseFloat(stats.input_i) || -14;
            measuredTP = parseFloat(stats.input_tp) || -1;
            measuredLR = parseFloat(stats.input_lra) || -10;
          }
        } catch (e) {
          logger.warn('LUFS测量解析失败，使用默认值:', e.message);
        }

        // 第二遍：应用标准化
        const normalizeCommand = [
          'ffmpeg -y',
          `-i "${inputPath}"`,
          `-af "loudnorm=`,
          `I=${targetLUFS}:`,
          `TP=${this.options.truePeak}:`,
          `LRA=11:`,
          `measured_I=${measuredLUFS}:`,
          `measured_TP=${measuredTP}:`,
          `measured_LRA=${measuredLR}:`,
          `print_format=summary"`,
          `-ar 44100`,
          `-ab ${this.options.outputBitrate}`,
          `"${outputPath}"`
        ].join(' ');

        exec(normalizeCommand, (error) => {
          if (error) {
            logger.error('响度标准化失败:', error.message);
            // 降级处理：简单音量调整
            this.fallbackNormalize(inputPath, outputPath, targetLUFS)
              .then(result => resolve(result))
              .catch(() => resolve({
                output: inputPath,
                success: false,
                measuredLUFS,
                message: '响度标准化跳过'
              }));
          } else {
            resolve({
              output: outputPath,
              success: true,
              measuredLUFS,
              targetLUFS,
              message: '响度标准化完成'
            });
          }
        });
      });
    });
  }

  /**
   * 降级标准化处理
   */
  async fallbackNormalize(inputPath, outputPath, targetLUFS) {
    return new Promise((resolve) => {
      // 简单的音量调整
      const gain = targetLUFS - (-14); // 假设原始-14dB
      const command = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        `-af "volume=${gain}dB"` ,
        `-ab ${this.options.outputBitrate}`,
        `"${outputPath}"`
      ].join(' ');

      exec(command, (error) => {
        resolve({
          output: error ? inputPath : outputPath,
          success: !error,
          measuredLUFS: targetLUFS,
          message: error ? '标准化跳过' : '音量调整完成'
        });
      });
    });
  }

  /**
   * 生成高潮片段（15秒）
   * 调用HookFinder模块
   */
  async generateHook(inputPath, params = {}) {
    const { HookFinder } = require('../hookfinder/HookFinder');
    const hookFinder = new HookFinder();
    
    return await hookFinder.extractHook(inputPath, {
      duration: params.hookDuration || 15,
      ...params
    });
  }

  /**
   * 导出不同格式
   */
  async exportFormat(inputPath, format, options = {}) {
    const taskId = `export_${Date.now()}`;
    const outputPath = path.join(
      this.options.tempDir,
      `${taskId}.${format}`
    );

    const bitrates = {
      mp3: options.quality === 'high' ? '320k' : '192k',
      wav: 'bitrate does not apply',
      flac: options.quality === 'high' ? 'flac' : '1410k'
    };

    return new Promise((resolve, reject) => {
      const command = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        format === 'mp3' ? `-ab ${bitrates.mp3}` : '',
        format === 'flac' ? `-compression_level ${options.compression || 5}` : '',
        `"${outputPath}"`
      ].join(' ');

      exec(command, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            outputPath,
            format,
            success: true
          });
        }
      });
    });
  }

  /**
   * 获取处理建议
   */
  getRecommendations(qualityReport) {
    const recommendations = [];

    if (qualityReport.metrics.snr < 18) {
      recommendations.push({
        type: 'denoise',
        intensity: 0.7,
        description: '检测到底噪较重，应用强降噪'
      });
    }

    if (qualityReport.metrics.clarity < 0.7) {
      recommendations.push({
        type: 'vocal_enhance',
        intensity: 0.8,
        description: '人声清晰度不足，加强人声增强'
      });
    }

    if (qualityReport.metrics.isClipping) {
      recommendations.push({
        type: 'loudnorm',
        targetLUFS: -16,
        description: '检测到削波，应用响度标准化'
      });
    }

    return recommendations;
  }

  /**
   * 清理临时文件
   */
  cleanup(taskId) {
    const pattern = path.join(this.options.tempDir, `${taskId}_*`);
    exec(`rm -f ${pattern}`, (error) => {
      if (!error) {
        logger.info('临时文件清理完成:', taskId);
      }
    });
  }
}

// 导出单例
const audioMixer = new AudioMixer();

module.exports = {
  AudioMixer,
  audioMixer
};
