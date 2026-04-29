/**
 * 敏感词过滤中间件
 */

const SENSITIVE_WORDS = [
  '习近平', '毛主席', '反华', '颠覆', '分裂',
  '法轮', '轮功', '邪教', '反动', '反革命',
  '台独', '藏独', '疆独', '港独', '暴恐',
  '色情', '黄色', '裸体', '淫秽', '情色',
  '性爱', '做爱', '嫖娼', '卖淫', '援交',
  '约炮', '一夜情', '性服务', '裸聊',
  '杀人', '自杀', '自残', '砍人', '血腥',
  '暴力的', '恐怖', '爆炸', '炸弹', '枪击',
  '砍杀', '行凶', '报复社会', '灭门',
  '毒品', '大麻', '冰毒', '海洛因', '摇头丸',
  'K粉', '可卡因', '鸦片', '迷药', '麻醉剂',
  '枪支', '弹药', '管制刀具',
  '歧视', '侮辱', '诽谤', '人身攻击',
  '低能', '弱智', '脑残', '白痴', '废柴',
  '加微信', '加VX', '加Q', '代购', '微商',
  '免费领取', '扫码', '红包', '刷单',
  '赌博', '博彩', '彩票预测', '黑客', '诈骗',
  '传销', '非法', '违规', '侵权'
];

/**
 * 过滤文本
 */
function filterText(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  for (const word of SENSITIVE_WORDS) {
    if (result.includes(word)) {
      result = result.split(word).join('*'.repeat(word.length));
    }
  }
  return result;
}

/**
 * 检查文本是否含敏感词
 */
function checkSensitive(text) {
  if (!text || typeof text !== 'string') return { hasSensitive: false, words: [] };
  
  const found = [];
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) {
      found.push(word);
    }
  }
  return { hasSensitive: found.length > 0, words: found };
}

/**
 * Express中间件：验证请求体中的文本字段
 */
function sensitiveWordFilter(fields = ['prompt', 'title', 'style']) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value && typeof value === 'string') {
        const check = checkSensitive(value);
        if (check.hasSensitive) {
          return res.status(400).json({
            code: 400,
            success: false,
            message: `内容包含敏感词"${check.words[0]}"，请修改后重试`,
            field: field
          });
        }
        // 过滤替换
        req.body[field] = filterText(value);
      }
    }
    next();
  };
}

module.exports = {
  filterText,
  checkSensitive,
  sensitiveWordFilter
};
