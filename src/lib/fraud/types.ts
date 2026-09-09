export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction = 'ALLOW' | 'MONITOR' | 'REVIEW' | 'BLOCK';

export interface FraudReason {
  ruleId: string;
  points: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  at: string;
}

export interface FraudAssessment {
  score: number; // 0-100 clamped
  level: RiskLevel;
  reasons: FraudReason[];
  recommendedAction: RecommendedAction;
}

export function levelForScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function actionForLevel(level: RiskLevel): RecommendedAction {
  if (level === 'CRITICAL') return 'BLOCK';
  if (level === 'HIGH') return 'REVIEW';
  if (level === 'MEDIUM') return 'MONITOR';
  return 'ALLOW';
}
