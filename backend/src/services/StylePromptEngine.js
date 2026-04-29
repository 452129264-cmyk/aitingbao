/**
 * 曲风深度差异化引擎
 * 
 * 功能：
 * - 每种曲风有严格的音乐规则
 * - 通过Suno API的prompt参数精确控制
 * 
 * 曲风规则：
 * - 伤感：极简钢琴 + 烟嗓人声 + 慢节奏 + 弱鼓点 + 大量留白
 * - 洗脑：强鼓点 + 短句重复 + BPM 120-130 + 4小节循环 + 抓耳hook
 * - 古风：五声音阶(宫商角徵羽) + 清冷编曲 + 笛/古筝音色 + 文言化歌词
 */

const logger = require('../utils/logger');

class StylePromptEngine {
  constructor() {
    // 曲风规则定义
    this.styleRules = {
      // 伤感风格
      伤感: {
        name: '伤感',
        emoji: '😢',
        description: '情感深沉的伤感音乐',
        
        // 音乐规则
        rules: {
          tempo: { min: 55, max: 75, target: 65 }, // 慢节奏 BPM
          key: ['C Minor', 'A Minor', 'E Minor', 'D Minor'], // 小调
          timeSignature: '4/4',
          dynamics: 'piano to mezzo-piano', // 弱到中等
          instruments: {
            primary: ['Piano', 'Acoustic Guitar', 'Strings'],
            secondary: ['Soft Pad', 'Gentle Organ'],
            avoid: ['Heavy Drums', 'Electric Guitar Distortion', 'Brass Section']
          },
          vocalStyle: {
            timbre: 'breathy, melancholic, emotive', // 烟嗓、忧郁、情感
            techniques: ['vibrato', 'falsetto moments', 'subtle dynamics'],
            range: 'mid-range focus'
          },
          arrangement: {
            intro: { length: '8-16 bars', style: 'minimal, piano motif' },
            verse: 'sparse, lots of space',
            chorus: 'builds slightly, but maintains restraint',
            outro: 'fade out or piano coda'
          },
          lyrics: {
            themes: ['heartbreak', 'loss', 'nostalgia', 'longing', 'regret'],
            mood: 'poignant, reflective',
            structure: 'verses with emotional hook'
          },
          mixing: {
            reverb: 'generous', // 大量混响
            compression: 'light',
            eq: 'roll off highs, warm low-mids'
          }
        },
        
        // Suno Prompt模板
        promptTemplate: {
          positive: '{style_description}, {vocal_style}, {instrumental}, {emotion}, {tempo_bpm}, minor key, {lyrics_theme}',
          negative: 'upbeat, happy, party, aggressive, loud drums, heavy metal, distorted guitar, brass',
          examples: [
            'melancholic piano ballad, breathy female vocals, slow 65 BPM, A minor, emotional heartbreak lyrics, soft strings background',
            'sad acoustic song, melancholic male vocal, gentle fingerpicking guitar, 60 BPM, introspective lyrics about lost love',
            'emotional piano-driven ballad, soft ethereal vocals, minor key, reverb-heavy, nostalgic atmosphere'
          ]
        }
      },
      
      // 洗脑风格
      洗脑: {
        name: '洗脑',
        emoji: '🧠',
        description: '易于传播的洗脑旋律',
        
        rules: {
          tempo: { min: 120, max: 130, target: 125 }, // 快节奏 BPM
          key: ['C Major', 'G Major', 'D Major', 'F Major'], // 大调
          timeSignature: '4/4',
          dynamics: 'consistent loudness', // 恒定响度
          instruments: {
            primary: ['Synth Lead', '808 Bass', 'Kicks', 'Hi-hats'],
            secondary: ['Claps', 'Build-up Synths', 'Drop Fill'],
            avoid: ['Acoustic Guitar solo', 'Slow Piano', 'Classical Strings']
          },
          vocalStyle: {
            timbre: 'catchy, confident, energetic',
            techniques: ['short phrases', 'repeated hooks', 'call and response'],
            range: 'mid to high'
          },
          arrangement: {
            intro: { length: '4 bars', style: 'build-up with riser' },
            verse: '16 bars with minimal elements',
            preChorus: 'build with layered elements',
            chorus: 'full drop, 4-bar hook repeated',
            structure: 'ABABCB or verse-chorus-verse-chorus-bridge-chorus'
          },
          lyrics: {
            themes: ['celebration', 'confidence', 'love', 'party', 'catchy phrases'],
            mood: 'uplifting, energetic',
            structure: 'short memorable lines, repeated hook 3+ times'
          },
          mixing: {
            sidechain: 'heavy sidechain on bass and pads',
            mastering: 'loud, clean, streaming-optimized'
          }
        },
        
        promptTemplate: {
          positive: '{style_description}, catchy {vocal_style}, {instrumental}, {tempo_bpm}, major key, upbeat energy, memorable hook, {lyrics_theme}',
          negative: 'slow tempo, sad, minor key, complex arrangement, long instrumental breaks, acoustic',
          examples: [
            'catchy pop hook, energetic female vocal, synth and 808 beat, 125 BPM, major key, "oh oh oh" vocal hook, party anthem',
            'dance pop beat, catchy male vocal, 808 bass, hi-hats, 128 BPM, memorable hook, C major, club banger',
            'TikTok viral beat, repeated vocal phrase, punchy drums, synth lead, 120 BPM, confident delivery, short catchy chorus'
          ]
        }
      },
      
      // 古风风格
      古风: {
        name: '古风',
        emoji: '🏯',
        description: '中国传统音乐元素',
        
        rules: {
          tempo: { min: 70, max: 95, target: 82 }, // 中慢节奏
          key: ['D Pentatonic', 'G Pentatonic', 'A Pentatonic', '宫调', '商调', '角调', '徵调', '羽调'], // 五声音阶
          timeSignature: '4/4 or 6/8',
          dynamics: 'soft to medium, dynamic contrast',
          instruments: {
            primary: ['Guqin/Pipa', 'Guzheng', 'Bamboo Flute', 'Erhu'],
            secondary: ['Piano (minimal)', 'Soft Strings', 'Wind Chimes'],
            avoid: ['Electric Guitar', 'Drum Kit', 'Synth Bass', 'Western Brass']
          },
          vocalStyle: {
            timbre: 'clear, ethereal, classical Chinese singing technique',
            techniques: ['lean voice', 'breath control', 'ornamental runs'],
            range: 'mid-range with falsetto for ornamentation'
          },
          arrangement: {
            intro: { length: '4-8 bars', style: 'instrumental with flute or guzheng' },
            verse: 'sparse accompaniment',
            chorus: 'add strings for emotional build',
            outro: 'instrumental fade or final vocal phrase'
          },
          lyrics: {
            themes: ['mountains and waters', 'moonlight', 'lonely traveler', 'ancient poetry', 'love across time'],
            mood: 'serene, wistful, poetic',
            structure: 'classical Chinese poetic structure, 5 or 7 characters per line',
            language: '古风文言/半文言'
          },
          mixing: {
            reverb: 'hall reverb, natural space',
            eq: 'preserve high frequencies of instruments',
            effects: 'subtle chorus on vocals, no harsh processing'
          }
        },
        
        promptTemplate: {
          positive: '{style_description}, {vocal_style}, traditional Chinese instruments, pentatonic scale, {tempo_bpm} BPM, classical Chinese atmosphere, {lyrics_theme}',
          negative: 'modern drums, electric guitar, synth bass, heavy bass, Western pop structure, rap',
          examples: [
            'ancient Chinese style, ethereal female vocal, guzheng and bamboo flute, pentatonic scale, 80 BPM, moonlit garden atmosphere, classical Chinese poetry lyrics',
            'traditional Chinese ballad, guqin and erhu, poetic lyrics about mountains and rivers, soft female vocal, serene mood, 85 BPM',
            'wuxia epic style, powerful male vocal with classical technique, Chinese orchestra elements, guzheng lead, 90 BPM, heroic atmosphere'
          ]
        }
      },
      
      // 流行风格
      流行: {
        name: '流行',
        emoji: '🎤',
        description: '当代流行音乐',
        
        rules: {
          tempo: { min: 90, max: 120, target: 105 },
          key: ['C Major', 'G Major', 'D Major', 'A Major', 'E Major'],
          timeSignature: '4/4',
          dynamics: 'controlled dynamics, chorus louder than verse',
          instruments: {
            primary: ['Synth Pads', 'Drums', 'Bass', 'Guitar'],
            secondary: ['Strings', 'Piano', 'Build-up Elements']
          },
          vocalStyle: {
            timbre: 'clean, modern, radio-ready',
            techniques: ['breathy chorus', 'chest voice verse'],
            range: 'accessible range'
          },
          arrangement: {
            intro: '4-8 bars',
            structure: 'verse-pre chorus-chorus-verse-chorus-bridge-chorus'
          },
          lyrics: {
            themes: ['love', 'relationships', 'self-expression', 'current life'],
            structure: 'relatable, hook-driven'
          },
          mixing: {
            loudness: '-14 LUFS streaming standard',
            separation: 'clean mix, elements not masking'
          }
        },
        
        promptTemplate: {
          positive: 'modern pop, clean {vocal_style}, synth and drum production, {tempo_bpm} BPM, major key, {lyrics_theme}',
          negative: 'aggressive, metal, classical, jazz'
        }
      },
      
      // 民谣风格
      民谣: {
        name: '民谣',
        emoji: '🎸',
        description: '原声民谣音乐',
        
        rules: {
          tempo: { min: 80, max: 110, target: 95 },
          key: ['G Major', 'D Major', 'A Major', 'E Minor'],
          timeSignature: '4/4',
          dynamics: 'intimate, conversational',
          instruments: {
            primary: ['Acoustic Guitar', 'Harmonica', 'Fiddle'],
            secondary: ['Soft Piano', 'Light Percussion']
          },
          vocalStyle: {
            timbre: 'authentic, storytelling voice',
            techniques: ['conversational', 'minimal vibrato']
          },
          lyrics: {
            themes: ['storytelling', 'everyday life', 'travel', 'relationships'],
            structure: 'narrative verses'
          }
        },
        
        promptTemplate: {
          positive: 'acoustic folk, storytelling {vocal_style}, guitar driven, {tempo_bpm} BPM, heartfelt lyrics',
          negative: 'electronic, heavy drums, auto-tune'
        }
      },
      
      // 电子风格
      电子: {
        name: '电子',
        emoji: '🎹',
        description: '电子舞曲/电子音乐',
        
        rules: {
          tempo: { min: 100, max: 150, target: 128 },
          key: ['C Minor', 'F Minor', 'D Minor'],
          timeSignature: '4/4',
          dynamics: 'consistent, powerful drops',
          instruments: {
            primary: ['Synth Leads', 'Bass Synths', 'Drum Machines', 'Effects'],
            secondary: ['Vocoder', 'Processed Vocals']
          },
          arrangement: {
            structure: 'intro-build-drop-breakdown-drop-outro'
          },
          mixing: {
            loudness: '-8 to -6 LUFS for clubs',
            sidechain: 'essential'
          }
        },
        
        promptTemplate: {
          positive: 'electronic dance music, powerful synths, heavy bass, {tempo_bpm} BPM, {style_variant}',
          negative: 'acoustic, classical, country'
        }
      }
    };

    // 性别声音配置
    this.vocalGenderConfig = {
      m: {
        name: 'male',
        templates: {
          伤感: 'melancholic male vocal, deep warm tone, emotive',
          洗脑: 'confident male vocal, energetic delivery',
          古风: 'classical male vocal, traditional Chinese technique',
          流行: 'warm male voice, radio-ready',
          民谣: 'authentic male singer-songwriter voice',
          电子: 'electronic male vocal with effects'
        }
      },
      f: {
        name: 'female',
        templates: {
          伤感: 'breathy female vocal, ethereal, emotional depth',
          洗脑: 'energetic female vocal, catchy hook delivery',
          古风: 'clear female vocal, ancient Chinese style',
          流行: 'clean female voice, pop-ready',
          民谣: 'gentle female folk voice',
          电子: 'powerful female vocal with processing'
        }
      }
    };
  }

  /**
   * 生成曲风prompt
   * @param {Object} params - 生成参数
   * @returns {Object} prompt配置
   */
  generatePrompt(params) {
    const {
      style = '流行',
      vocalGender = 'f',
      customStyle = '',
      instrumental = false,
      additionalInstructions = ''
    } = params;

    // 获取曲风规则
    const styleRule = this.styleRules[style] || this.styleRules['流行'];

    // 构建prompt
    const prompt = this.buildPrompt(styleRule, vocalGender, instrumental);
    
    // 添加自定义风格描述
    let finalPrompt = prompt.positive;
    if (customStyle) {
      finalPrompt += `, ${customStyle}`;
    }
    if (additionalInstructions) {
      finalPrompt += `, ${additionalInstructions}`;
    }

    const result = {
      success: true,
      prompt: finalPrompt,
      negativePrompt: prompt.negative,
      metadata: {
        style,
        vocalGender: vocalGender === 'm' ? 'male' : 'female',
        instrumental,
        tempo: styleRule.rules.tempo,
        key: styleRule.rules.key[0],
        instruments: styleRule.rules.instruments.primary,
        vocalStyle: styleRule.vocalStyle.timbre
      },
      tips: this.generateStyleTips(styleRule)
    };

    logger.info('Prompt生成完成', { 
      style, 
      vocalGender, 
      promptLength: finalPrompt.length 
    });

    return result;
  }

  /**
   * 构建prompt
   */
  buildPrompt(styleRule, vocalGender, instrumental) {
    const vocalConfig = this.vocalGenderConfig[vocalGender] || this.vocalGenderConfig['f'];
    const vocalStyle = vocalConfig.templates[styleRule.name] || vocalConfig.templates['流行'];
    
    const instruments = styleRule.rules.instruments.primary.join(', ');
    const tempo = styleRule.rules.tempo.target;
    const lyricsThemes = styleRule.rules.lyrics.themes.slice(0, 3).join(', ');

    let positive = styleRule.promptTemplate.positive
      .replace('{style_description}', styleRule.description)
      .replace('{vocal_style}', instrumental ? 'no vocals, instrumental' : vocalStyle)
      .replace('{instrumental}', instrumental ? 'instrumental only' : `with ${instruments}`)
      .replace('{emotion}', styleRule.rules.lyrics.mood)
      .replace('{tempo_bpm}', `${tempo} BPM`)
      .replace('{lyrics_theme}', lyricsThemes)
      .replace('{style_variant}', styleRule.name);

    let negative = styleRule.promptTemplate.negative;

    return { positive, negative };
  }

  /**
   * 生成曲风技巧提示
   */
  generateStyleTips(styleRule) {
    const tips = [];
    
    tips.push({
      category: '节奏',
      tip: `建议BPM: ${styleRule.rules.tempo.min}-${styleRule.rules.tempo.max}`
    });

    tips.push({
      category: '调式',
      tip: `推荐调式: ${styleRule.rules.key.slice(0, 3).join(', ')}`
    });

    tips.push({
      category: '配器',
      tip: `主奏乐器: ${styleRule.rules.instruments.primary.slice(0, 3).join(', ')}`
    });

    tips.push({
      category: '人声',
      tip: `演唱风格: ${styleRule.vocalStyle.timbre}`
    });

    tips.push({
      category: '混音',
      tip: `混音要点: ${styleRule.rules.mixing.reverb ? `混响${styleRule.rules.mixing.reverb}` : '标准混音'}`
    });

    return tips;
  }

  /**
   * 获取所有曲风列表
   */
  getAllStyles() {
    return Object.entries(this.styleRules).map(([key, rule]) => ({
      id: key,
      name: rule.name,
      emoji: rule.emoji,
      description: rule.description,
      tempo: rule.rules.tempo
    }));
  }

  /**
   * 获取曲风详情
   */
  getStyleDetails(styleName) {
    const rule = this.styleRules[styleName];
    if (!rule) return null;

    return {
      ...rule,
      examples: rule.promptTemplate.examples || []
    };
  }

  /**
   * 验证曲风参数
   */
  validateStyleParams(params) {
    const errors = [];

    if (params.style && !this.styleRules[params.style]) {
      errors.push(`不支持的曲风: ${params.style}`);
    }

    if (params.vocalGender && !['m', 'f'].includes(params.vocalGender)) {
      errors.push('vocalGender必须是 m 或 f');
    }

    if (params.tempo) {
      const t = parseInt(params.tempo);
      if (isNaN(t) || t < 40 || t > 200) {
        errors.push('tempo必须在40-200之间');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 适配多平台分发
   */
  getPlatformAdaptation(styleName, platform) {
    const rule = this.styleRules[styleName];
    if (!rule) return null;

    const adaptations = {
      qqmusic: {
        genre: this.mapToPlatformGenre(styleName, 'qqmusic'),
        tags: [styleName, 'AI生成'],
        description: `${rule.description} - AI智能生成`
      },
      netease: {
        genre: this.mapToPlatformGenre(styleName, 'netease'),
        tags: [styleName, 'AI音乐'],
        description: `${rule.description} | AI生成内容`
      },
      tiktok: {
        hashtags: [`#${styleName}音乐`, '#AI创作', '#原创音乐'],
        description: `${rule.emoji} ${styleName}风格 | AI智能作曲`
      }
    };

    return adaptations[platform] || adaptations.qqmusic;
  }

  /**
   * 映射曲风到平台特定分类
   */
  mapToPlatformGenre(styleName, platform) {
    const genreMap = {
      qqmusic: {
        '伤感': '华语伤感',
        '洗脑': '流行',
        '古风': '古风',
        '流行': '华语流行',
        '民谣': '民谣',
        '电子': '电子'
      },
      netease: {
        '伤感': '华语/民谣',
        '洗脑': '流行',
        '古风': '古风/民乐',
        '流行': '华语流行',
        '民谣': '民谣',
        '电子': '电子'
      }
    };

    return genreMap[platform]?.[styleName] || '华语';
  }
}

// 导出单例
const stylePromptEngine = new StylePromptEngine();

module.exports = {
  StylePromptEngine,
  stylePromptEngine
};
