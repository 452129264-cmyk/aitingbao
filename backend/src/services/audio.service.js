/**
 * 音频处理服务
 * 使用 FFmpeg 进行音频裁剪、格式转换等
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// 设置FFmpeg路径
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// 临时文件目录
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

class AudioService {
  /**
   * 裁剪音频片段
   * @param {string} audioUrl - 原始音频URL
   * @param {number} startTime - 开始时间(秒)
   * @param {number} duration - 持续时间(秒)
   * @returns {Promise<string>} 裁剪后的音频URL
   */
  async clipAudio(audioUrl, startTime = 30, duration = 15) {
    const outputName = `clip_${uuidv4()}.mp3`;
    const outputPath = path.join(TEMP_DIR, outputName);

    return new Promise((resolve, reject) => {
      ffmpeg(audioUrl)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('end', () => {
          logger.info(`Audio clipped: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio clip error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * 转换为WAV格式
   * @param {string} audioUrl - 原始音频URL
   * @returns {Promise<string>} WAV文件路径
   */
  async convertToWav(audioUrl) {
    const outputName = `wav_${uuidv4()}.wav`;
    const outputPath = path.join(TEMP_DIR, outputName);

    return new Promise((resolve, reject) => {
      ffmpeg(audioUrl)
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(44100)
        .on('end', () => {
          logger.info(`Audio converted to WAV: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio convert error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * 获取音频时长
   * @param {string} audioPath - 音频文件路径
   * @returns {Promise<number>} 时长(秒)
   */
  async getDuration(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  /**
   * 合并多个音频
   * @param {string[]} audioPaths - 音频文件路径数组
   * @returns {Promise<string>} 合并后的文件路径
   */
  async mergeAudio(audioPaths) {
    const outputName = `merged_${uuidv4()}.mp3`;
    const outputPath = path.join(TEMP_DIR, outputName);
    const listFile = path.join(TEMP_DIR, `list_${uuidv4()}.txt`);

    // 创建FFmpeg concat文件
    const content = audioPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listFile, content);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputFormat('concat')
        .audioCodec('libmp3lame')
        .on('end', () => {
          fs.unlinkSync(listFile);
          logger.info(`Audio merged: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          fs.unlinkSync(listFile);
          logger.error('Audio merge error:', err.message);
          reject(err);
        })
        .mergeToFile(outputPath, TEMP_DIR);
    });
  }

  /**
   * 调整音频音量
   * @param {string} audioPath - 音频文件路径
   * @param {number} volume - 音量倍数 (1.0 = 原音量)
   * @returns {Promise<string>} 处理后的文件路径
   */
  async adjustVolume(audioPath, volume = 1.0) {
    const outputName = `vol_${uuidv4()}.mp3`;
    const outputPath = path.join(TEMP_DIR, outputName);

    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .audioCodec('libmp3lame')
        .audioFilters(`volume=${volume}`)
        .on('end', () => {
          logger.info(`Audio volume adjusted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio volume adjust error:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(maxAgeMs = 3600000) {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        logger.info(`Temp file cleaned: ${file}`);
      }
    }
  }
}

module.exports = new AudioService();
