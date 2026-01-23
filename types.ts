// Types for the application

export enum MemoryTier {
  L1_SCRATCHPAD = 'L1 Scratchpad (Redis)',
  L2_SEMANTIC = 'L2 Semantic (Vector DB)',
  L3_ENTITY = 'L3 Entity Graph (Neo4j)',
}

export interface MemoryNode {
  id: string;
  content: string;
  tier: MemoryTier;
  importanceScore: number; // 0 to 1
  embedding: [number, number, number]; // 3D coordinates for visualization
  timestamp: number;
  namespace: string;
  clusterId?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

export interface RetrievalContext {
  id: string;
  originalText: string;
  condensedText: string;
  tokenUsageOriginal: number;
  tokenUsageCondensed: number;
  sourceTier: MemoryTier;
  similarity: number;
  contextPackId?: string | null;
  contextPack?: Record<string, unknown>;
}

export interface SystemStats {
  totalMemories: number;
  activeContexts: number;
  tokenSavings: number;
  compressionRatio: number;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  PIPELINE = 'PIPELINE',
  RADAR = 'RADAR',
  RAG_DEBUG = 'RAG_DEBUG',
  AUDIT = 'AUDIT',
  SETTINGS = 'SETTINGS'
}
