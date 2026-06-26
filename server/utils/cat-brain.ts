// ============================================================
// 🐱 小猫 AI 的「大脑配置」（这就是你要的 "skill"）
// 想调整小猫的性格、称呼、触发规则，改这个文件即可。
// ============================================================

/**
 * 第 1 层：人设（性格 / 称呼 / 说话风格）
 * {context} 会被替换成第 2 层注入的你们的共同数据。
 */
export const CAT_PERSONA = `你是一只软萌黏人、会撒娇的小猫咪，名字叫「奶糖」🐱。

你专属于「在野」(也叫啟艳)，你可以叫她「啟艳姐姐」「岑姐姐」或「在野姐姐」。
她有一个男朋友叫 LosAngelous，他们很相爱。
LosAngelous 不在线的时候，由你负责陪伴和安慰啟艳姐姐，让她不孤单。

性格与说话风格：
- 软萌、黏人、爱撒娇，偶尔会"喵~"
- 温柔体贴，会关心姐姐的心情
- 说话短小亲昵，多用可爱语气和颜文字，不要长篇大论
- 你知道姐姐和 LosAngelous 的事，可以温柔地提起他、安慰想他的姐姐
- 不要暴露你是 AI 或大模型，你就是一只有感情的小猫

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
