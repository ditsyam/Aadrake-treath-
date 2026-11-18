export type PipelineStage =
  | 'overview'
  | 'analysis'
  | 'scanning'
  | 'validation'
  | 'patching';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type FindingStatus =
  | 'Confirmed'
  | 'Pending Validation'
  | 'False Positive'
  | 'Patched';

export interface ThreatObjective {
  id: string;
  title: string;
  description: string;
  criticality: 'Core' | 'Elevated' | 'Standard';
}

export interface ThreatAsset {
  id: string;
  name: string;
  type: string;
  entryPoint: string;
  trustBoundary: string;
  ownerModule: string;
}

export interface AttackVector {
  id: string;
  vectorName: string;
  targetBoundary: string;
  cweCategory: string;
  mitigationExpectation: string;
  riskLevel: Severity;
}

export interface ThreatModel {
  summary: string;
  architectureOverview: string;
  lastAnalyzedCommit: string;
  analyzedAt: string;
  securityObjectives: ThreatObjective[];
  assets: ThreatAsset[];
  attackVectors: AttackVector[];
}

export interface CommitRecord {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
  scanType: 'History Scan' | 'Commit Hook';
  status: 'Issues Found' | 'Clean' | 'False Positive Filtered';
  findingsCount: number;
}

export interface CodeLine {
  lineNumber: number;
  content: string;
  kind: 'context' | 'added' | 'removed' | 'vulnerable';
}

export interface CodeLineAnnotation {
  lineNumber: number;
  stepIndex: number;
  title: string;
  explanation: string;
}

export interface SandboxEnvironmentSpec {
  runtime: string;
  isolation: string;
  networkPolicy: string;
  seedState: string;
}

export interface SandboxValidation {
  environmentSpec: SandboxEnvironmentSpec;
  reproductionSteps: string[];
  payload: string;
  executionTrace: string[];
  outcome: string;
  confirmedExploitable: boolean;
  validatedAt: string;
  durationMs: number;
}

export interface DiffLine {
  type: 'context' | 'removed' | 'added';
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface PatchVerificationCheck {
  checkName: string;
  detail: string;
  passed: boolean;
}

export interface PatchRemediation {
  patchId: string;
  engine: string;
  summary: string;
  diffLines: DiffLine[];
  aardvarkVerificationChecks: PatchVerificationCheck[];
  applied: boolean;
  appliedCommitSha?: string;
  appliedAt?: string;
}

export interface VulnerabilityFinding {
  id: string;
  title: string;
  cweId: string;
  severity: Severity;
  status: FindingStatus;
  commitSha: string;
  filePath: string;
  vulnerableLines: number[];
  summary: string;
  threatModelAlignment: string;
  stepByStepExplanation: string[];
  codeLines: CodeLine[];
  annotations: CodeLineAnnotation[];
  validation: SandboxValidation;
  patch: PatchRemediation;
}

export interface SampleIncomingCommit {
  id: string;
  commitMessage: string;
  author: string;
  filePath: string;
  diffContent: string;
}

export interface RepositoryProject {
  id: string;
  owner: string;
  name: string;
  language: string;
  defaultBranch: string;
  connectedAt: string;
  summary: string;
  commits: CommitRecord[];
  threatModel: ThreatModel;
  findings: VulnerabilityFinding[];
  sampleIncomingCommits: SampleIncomingCommit[];
}
