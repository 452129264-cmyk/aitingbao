const axios = require('axios');
const logger = require('../utils/logger');
const LOCAL_MUSIC_API_BASE = process.env.LOCAL_MUSIC_API_BASE || 'https://1236950bk62ia.vicp.fun';

function replaceLocalhostUrl(audioUrl) {
  if (!audioUrl) return audioUrl;
  const publicHost = LOCAL_MUSIC_API_BASE.replace('https://','').replace('http://','');
  return audioUrl.replace(/http:\/\/localhost:7860/gi, 'https://'+publicHost)
                  .replace(/http:\/\/127\.0\.0\.1:7860/gi, 'https://'+publicHost);
}

class LocalMusicService {
  constructor() { this.baseUrl = LOCAL_MUSIC_API_BASE; this.timeout = 120000; }
  async healthCheck() { try { const r = await axios.get(this.baseUrl+'/docs',{timeout:5000}); return r.status===200; } catch(e) { return false; } }
  async generateMusic({ prompt, duration = 30 }) {
    if (!prompt||prompt.trim().length<2) return {success:false,message:'请输入至少2个字符'};
    const p = prompt.trim().substring(0,500);
    try {
      const r = await axios.post(this.baseUrl+'/api/generate?prompt='+encodeURIComponent(p)+'&duration='+duration,{},{timeout:this.timeout,headers:{'Content-Type':'application/json'}});
      if (r.data&&r.data.status==='success') {
        const audioUrl = replaceLocalhostUrl(r.data.audio_url);
        return {success:true,taskId:'local_'+Date.now(),audioUrl,prompt:r.data.prompt,duration:r.data.duration,message:'本地音乐生成成功'};
      }
      return {success:false,message:r.data?.message||'本地音乐生成失败'};
    } catch(e) {
      if (e.code==='ECONNREFUSED') return {success:false,message:'本地音乐服务不可访问'};
      if (e.code==='ETIMEDOUT'||e.message.includes('timeout')) return {success:false,message:'本地音乐生成超时'};
      return {success:false,message:'本地音乐生成失败: '+e.message};
    }
  }
}
module.exports = new LocalMusicService();
