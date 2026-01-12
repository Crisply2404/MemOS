import { MemoryNode, MemoryTier, RetrievalContext } from '../types';

export const generateMockMemories = (count: number): MemoryNode[] => {
  const memories: MemoryNode[] = [];
  const tiers = [MemoryTier.L1_SCRATCHPAD, MemoryTier.L2_SEMANTIC, MemoryTier.L3_ENTITY];
  
  for (let i = 0; i < count; i++) {
    // Generate random point in 3D sphere
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1/3) * 4; // radius 4
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Determine tier based on distribution (mostly L2)
    const tierRand = Math.random();
    let tier = MemoryTier.L2_SEMANTIC;
    if (tierRand > 0.8) tier = MemoryTier.L3_ENTITY;
    if (tierRand < 0.1) tier = MemoryTier.L1_SCRATCHPAD;

    memories.push({
      id: `mem-${i}`,
      content: `Simulated memory content chunk ${i} regarding project specifications...`,
      tier,
      importanceScore: Math.random(),
      embedding: [x, y, z],
      timestamp: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24), // last 24h
      namespace: Math.random() > 0.5 ? 'Project_Alpha' : 'User_Preferences'
    });
  }
  return memories;
};

export const getMockRetrieval = (query: string): RetrievalContext => {
  return {
    id: `ret-${Date.now()}`,
    sourceTier: MemoryTier.L2_SEMANTIC,
    similarity: 0.89 + Math.random() * 0.1,
    originalText: `[时间 2023-10-27 10:00:00] 用户询问「Project Aurora」的交付时间。
    [时间 2023-10-27 10:01:00] 系统回复：当前计划是 Q4。
    [时间 2023-10-27 10:02:00] 用户提到前端模块进度延迟。
    [时间 2023-10-27 10:05:00] 用户申请把交付时间调整到 2024 年 1 月。
    [时间 2023-10-27 10:06:00] 负责人邮件确认批准（邮件编号 #442）。`,
    condensedText: `因前端模块延期，用户将「Project Aurora」交付时间从 Q4 调整到 2024 年 1 月，并已获负责人邮件批准（#442）。`,
    tokenUsageOriginal: 145,
    tokenUsageCondensed: 28
  };
};