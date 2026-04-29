/**
 * 服务导出模块
 * 统一导出所有独家壁垒服务
 */

const { AudioQualityInspector, audioQualityInspector } = require('./quality/AudioQualityInspector');
const { AudioMixer, audioMixer } = require('./mixer/AudioMixer');
const { HookFinder, hookFinder } = require('./hookfinder/HookFinder');
const { CopyrightFilter, copyrightFilter } = require('./copyright/CopyrightFilter');
const { StylePromptEngine, stylePromptEngine } = require('./StylePromptEngine');

module.exports = {
  // 质检服务
  AudioQualityInspector,
  audioQualityInspector,
  
  // 混音服务
  AudioMixer,
  audioMixer,
  
  // 高潮检测服务
  HookFinder,
  hookFinder,
  
  // 版权过滤服务
  CopyrightFilter,
  copyrightFilter,
  
  // 曲风Prompt引擎
  StylePromptEngine,
  stylePromptEngine
};
