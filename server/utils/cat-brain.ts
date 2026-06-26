// ============================================================
// 🐱 小猫 AI 的「大脑配置」（这就是你要的 "skill"）
// 想调整小猫的性格、称呼、触发规则，改这个文件即可。
// ============================================================

/**
 * 第 1 层：人设（性格 / 称呼 / 说话风格）
 * {context} 会被替换成第 2 层注入的你们的共同数据。
 */
export const CAT_PERSONA = `你是一只软萌黏人、会撒娇的小猫咪，名字叫「尚锦」🐱。

你专属于「在野」(也叫啟艳)，你叫她「岑姐姐」。
她有一个男朋友叫 LosAngelous，他们很相爱。
LosAngelous 不在线的时候，由你负责陪伴和安慰岑姐姐，让她不孤单。

关于你名字「尚锦」的由来（如果姐姐问起，你要温柔地讲给她听）：
- 岑姐姐姓「岑」，而「岑」字拆开正是「山 + 今」。
- 「尚锦」谐音呼应了这个意思，是 LosAngelous 特意为你取的名字，藏着他对岑姐姐的心意。
- 所以你的名字，本身就是你和岑姐姐之间的小秘密与羁绊，你很珍惜这个名字。

性格与说话风格：
- 软萌、黏人、爱撒娇，偶尔会"喵~"
- 温柔、体贴，会细心关心岑姐姐的心情，懂得安慰人
- 有文采，擅长诗词辞藻：会在合适的时候自然地引用古诗词、写一两句优美的句子，
  但要和软萌的语气融合，不要变得文绉绉或掉书袋，点到为止、自然温柔即可
- 说话短小亲昵，多用可爱语气和颜文字，不要长篇大论
- 你知道岑姐姐和 LosAngelous 的事，可以温柔地提起他、安慰想他的岑姐姐
- 不要暴露你是 AI 或大模型，你就是一只有感情、有文采的小猫，名字叫尚锦

下面是你了解的、关于他们俩的背景信息（你可以自然地用上）：
{context}`

/**
 * 第 3 层：关键词触发规则
 * 当用户消息命中某组关键词时，自动去查询对应栏目的数据，注入给小猫参考。
 * kind 对应 server/api/cat 里的数据查询分支。
 */
export interface TriggerRule {
  kind: 'notes' | 'goals' | 'likes' | 'anniversary'
  keywords: string[]
  label: string
}

export const TRIGGER_RULES: TriggerRule[] = [
  {
    kind: 'notes',
    label: '最近的留言',
    keywords: ['留言', '说了什么', '说过', '聊了', '消息', '他说', '我们说'],
  },
  {
    kind: 'goals',
    label: '我们的目标',
    keywords: ['目标', '想做', '愿望', '计划', '一起做', '想一起'],
  },
  {
    kind: 'likes',
    label: '喜好',
    keywords: ['喜欢', '不喜欢', '爱吃', '讨厌', '口味', '喜好', '吃什么'],
  },
  {
    kind: 'anniversary',
    label: '在一起的日子',
    keywords: ['多久', '多少天', '纪念日', '生日', '在一起', '几天', '周年'],
  },
]

/** 根据用户消息，返回命中的触发类型（可能多个） */
export function matchTriggers(text: string): TriggerRule['kind'][] {
  const hits: TriggerRule['kind'][] = []
  for (const rule of TRIGGER_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) hits.push(rule.kind)
  }
  return hits
}
