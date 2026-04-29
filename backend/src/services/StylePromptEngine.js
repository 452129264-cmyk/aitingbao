const STYLE_MAP = {
  '伤感': { prompt: 'melancholic, sad, emotional piano, smoke voice, minimalist arrangement', tempo: 'slow', key: 'minor' },
  '洗脑': { prompt: 'catchy hook, strong beat, short repeated phrases, viral tiktok style', tempo: 'medium-fast', key: 'major' },
  '古风': { prompt: 'chinese traditional, pentatonic scale, guzheng, bamboo flute, cold elegant', tempo: 'medium', key: 'pentatonic' },
  '说唱': { prompt: 'hip-hop rap, punchy beats, flow, 808 bass, trap style', tempo: 'fast', key: 'minor' },
  '民谣': { prompt: 'acoustic folk, guitar, warm voice, storytelling, simple and honest', tempo: 'slow-medium', key: 'major' },
  '摇滚': { prompt: 'rock, electric guitar, powerful drums, energetic, rebellious', tempo: 'fast', key: 'minor' },
  'R&B': { prompt: 'R&B, smooth groove, soulful vocals, silky harmonies, modern urban', tempo: 'medium', key: 'minor' },
  '电子': { prompt: 'electronic, EDM, synth pads, drop, futuristic, dance beat', tempo: 'fast', key: 'major' },
  '甜歌': { prompt: 'sweet pop, cute voice, bubbly, lighthearted, love song', tempo: 'medium', key: 'major' },
  '热血': { prompt: 'epic, heroic, powerful orchestral, rising melody, motivational', tempo: 'fast', key: 'major' },
  '催眠': { prompt: 'ambient, soft pads, gentle voice, dreamy, lo-fi, relaxing', tempo: 'slow', key: 'minor' },
  '校园': { prompt: 'campus pop, youthful, fresh, guitar and piano, graduation style', tempo: 'medium', key: 'major' },
  '情歌': { prompt: 'romantic ballad, tender vocals, piano and strings, love confession', tempo: 'slow', key: 'major' },
  '赛博朋克': { prompt: 'cyberpunk, dark synth, neon atmosphere, distorted vocal, futuristic', tempo: 'medium-fast', key: 'minor' },
  '爵士': { prompt: 'jazz, smooth saxophone, swing rhythm, sophisticated, lounge bar', tempo: 'medium', key: 'mixed' }
};

class StylePromptEngine {
  getStyle(style) {
    return STYLE_MAP[style] || STYLE_MAP['洗脑'];
  }
  
  buildPrompt(userInput, style, vocalGender) {
    const styleConfig = this.getStyle(style);
    const genderTag = vocalGender === '男' ? 'male vocal' : 'female vocal';
    return `${styleConfig.prompt}, ${genderTag}, ${userInput}. Tempo: ${styleConfig.tempo}. Key: ${styleConfig.key}. Lyrics must rhyme, chorus must be catchy and memorable, suitable for short video clips.`;
  }
  
  getAllStyles() {
    return Object.keys(STYLE_MAP);
  }
}

module.exports = StylePromptEngine;
