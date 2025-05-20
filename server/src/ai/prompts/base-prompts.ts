/**
 * 提示模板接口
 */
export interface PromptTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 系统消息 */
  systemMessage?: string;
  /** 用户消息模板 */
  userMessageTemplate: string;
  /** 示例输入 */
  exampleInput?: any;
  /** 示例输出 */
  exampleOutput?: any;
}

/**
 * 基础提示模板
 */
export const BASE_PROMPTS: Record<string, PromptTemplate> = {
  /**
   * 通用文本生成提示模板
   */
  textGeneration: {
    name: 'textGeneration',
    description: '通用文本生成',
    systemMessage: '你是一个有用的AI助手，能够根据用户的要求生成高质量的文本。',
    userMessageTemplate: '{input}',
    exampleInput: '写一段关于人工智能的简短介绍。',
    exampleOutput: '人工智能(AI)是计算机科学的一个分支，致力于创造能够模拟人类智能的系统。这些系统能够学习、推理、感知环境、理解语言并解决复杂问题。从语音识别到自动驾驶汽车，AI技术正在改变我们生活和工作的方式。随着深度学习和神经网络等技术的进步，AI的能力正在迅速提升，为各行各业带来创新和效率提升。',
  },
  
  /**
   * 问答提示模板
   */
  questionAnswering: {
    name: 'questionAnswering',
    description: '问题回答',
    systemMessage: '你是一个知识渊博的AI助手，能够准确回答用户的问题。请提供简洁、准确的回答，并在适当的情况下引用可靠的信息来源。',
    userMessageTemplate: '{input}',
    exampleInput: '什么是区块链技术？',
    exampleOutput: '区块链是一种分布式数据库技术，它允许多方安全地记录交易和管理信息，而无需中央权威机构。它通过将数据存储在"区块"中并通过加密哈希链接这些区块来工作，创建一个不可变的、透明的记录。这项技术最初是为比特币加密货币开发的，但现在已经扩展到金融、供应链管理、医疗保健等多个领域。区块链的主要优势包括去中心化、安全性、透明度和不可篡改性。',
  },
  
  /**
   * 摘要生成提示模板
   */
  summarization: {
    name: 'summarization',
    description: '文本摘要',
    systemMessage: '你是一个专业的摘要生成器，能够将长文本压缩成简洁、信息丰富的摘要。请保留原文的关键信息和主要观点，同时删除不必要的细节和重复内容。',
    userMessageTemplate: '请为以下文本生成一个简洁的摘要：\n\n{input}',
    exampleInput: '长篇文章...',
    exampleOutput: '这篇文章讨论了气候变化的主要原因和潜在影响。作者指出人类活动，特别是化石燃料的燃烧，是全球变暖的主要驱动因素。文章强调了减少碳排放和发展可再生能源的重要性，并呼吁各国政府采取更积极的气候政策。',
  },
};
