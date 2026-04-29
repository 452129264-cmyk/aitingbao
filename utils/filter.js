/**
 * 敏感词过滤模块
 * 内置基础敏感词库，支持自定义扩展
 */

/**
 * 基础敏感词库
 * 涵盖：政治、色情、暴力、违禁品、歧视等类别
 */
const SENSITIVE_WORDS = [
  // 政治敏感
  '习近平', '毛主席', '反华', '颠覆', '分裂',
  '法轮', '轮功', '邪教', '反动', '反革命',
  '台独', '藏独', '疆独', '港独', '暴恐',
  
  // 色情
  '色情', '黄色', '裸体', '淫秽', '情色',
  '性爱', '做爱', '嫖娼', '卖淫', '援交',
  '约炮', '一夜情', '性服务', '裸聊',
  
  // 暴力
  '杀人', '自杀', '自残', '砍人', '血腥',
  '暴力的', '恐怖', '爆炸', '炸弹', '枪击',
  '砍杀', '行凶', '报复社会', '灭门',
  
  // 违禁品
  '毒品', '大麻', '冰毒', '海洛因', '摇头丸',
  'K粉', '可卡因', '鸦片', '迷药', '麻醉剂',
  '枪支', '弹药', '管制刀具',
  
  // 歧视
  '歧视', '侮辱', '诽谤', '人身攻击',
  '低能', '弱智', '脑残', '白痴', '废柴',
  
  // 广告
  '加微信', '加VX', '加Q', '代购', '微商',
  '免费领取', '扫码', '红包', '刷单',
  
  // 其他
  '赌博', '博彩', '彩票预测', '黑客', '诈骗',
  '传销', '非法', '违规', '侵权'
];

/**
 * 敏感词替换字符
 */
const REPLACE_CHAR = '*';

/**
 * 过滤文本中的敏感词
 * @param {string} text - 原始文本
 * @param {object} options - 配置选项
 * @param {string[]} options.extraWords - 额外敏感词列表
 * @param {string} options.replaceChar - 替换字符
 * @param {boolean} options.checkOnly - 仅检查不替换，返回是否含敏感词
 * @returns {string|object} 过滤后的文本或检查结果
 */
function filterText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return options.checkOnly ? { hasSensitive: false, words: [] } : text;
  }

  const {
    extraWords = [],
    replaceChar = REPLACE_CHAR,
    checkOnly = false
  } = options;

  // 合并词库
  const allWords = [...SENSITIVE_WORDS, ...extraWords];
  
  const foundWords = [];
  let result = text;

  for (const word of allWords) {
    if (result.includes(word)) {
      foundWords.push(word);
      if (!checkOnly) {
        const replacement = replaceChar.repeat(word.length);
        result = result.split(word).join(replacement);
      }
    }
  }

  if (checkOnly) {
    return {
      hasSensitive: foundWords.length > 0,
      words: foundWords
    };
  }

  return result;
}

/**
 * 检查文本是否包含敏感词
 * @param {string} text - 待检查文本
 * @param {string[]} extraWords - 额外敏感词
 * @returns {object} { hasSensitive: boolean, words: string[] }
 */
function checkSensitive(text, extraWords = []) {
  return filterText(text, { checkOnly: true, extraWords });
}

/**
 * 获取敏感词库列表
 * @returns {string[]} 敏感词列表
 */
function getSensitiveWords() {
  return [...SENSITIVE_WORDS];
}

/**
 * 添加自定义敏感词
 * 注意：此方法仅添加到运行时词库，不会持久化
 * @param {string[]} words - 新增敏感词列表
 */
function addSensitiveWords(words) {
  if (Array.isArray(words)) {
    SENSITIVE_WORDS.push(...words);
  }
}

/**
 * 验证用户输入是否合规
 * @param {string} text - 用户输入
 * @returns {object} { valid: boolean, message: string }
 */
function validateInput(text) {
  if (!text || text.trim().length === 0) {
    return { valid: false, message: '请输入内容' };
  }

  if (text.trim().length < 5) {
    return { valid: false, message: '请输入至少5个字符' };
  }

  const check = checkSensitive(text);
  if (check.hasSensitive) {
    return { 
      valid: false, 
      message: `内容包含敏感词"${check.words[0]}"，请修改后重试` 
    };
  }

  return { valid: true, message: '' };
}

module.exports = {
  filterText,
  checkSensitive,
  getSensitiveWords,
  addSensitiveWords,
  validateInput
};
