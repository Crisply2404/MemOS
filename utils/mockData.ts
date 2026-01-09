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
    originalText: `[TIMESTAMP 2023-10-27T10:00:00] User asked about the "Project Phoenix" deadline.
    [TIMESTAMP 2023-10-27T10:01:00] System replied deadline is Q4.
    [TIMESTAMP 2023-10-27T10:02:00] User mentioned a delay in the frontend module.
    [TIMESTAMP 2023-10-27T10:05:00] User requested to move the deadline to Jan 2024.
    [TIMESTAMP 2023-10-27T10:06:00] Manager approved request via email reference #442.`,
    condensedText: `User delayed "Project Phoenix" deadline to Jan 2024 due to frontend module issues. Change approved by Manager (Ref #442).`,
    tokenUsageOriginal: 145,
    tokenUsageCondensed: 28
  };
};