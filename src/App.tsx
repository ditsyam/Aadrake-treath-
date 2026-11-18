import { useState } from 'react';
import { Menu } from 'lucide-react';
import { INITIAL_REPOSITORIES } from './data/repositories';
import type {
  CommitRecord,
  FindingStatus,
  PatchRemediation,
  PipelineStage,
  RepositoryProject,
  SandboxValidation,
  ThreatModel,
  VulnerabilityFinding,
} from './types/aardvark';
import { Sidebar } from './components/Sidebar';
import { PipelineOverview } from './components/PipelineOverview';
import { AnalysisStageView } from './components/AnalysisStageView';
import { CommitScanningStageView } from './components/CommitScanningStageView';
import { ValidationStageView } from './components/ValidationStageView';
import { PatchingStageView } from './components/PatchingStageView';
import { ConnectRepoModal } from './components/ConnectRepoModal';

const STAGE_TITLES: Record<PipelineStage, string> = {
  overview: 'Pipeline Overview',
  analysis: '01. Analysis',
  scanning: '02. Commit Scanning',
  validation: '03. Validation',
  patching: '04. Patching',
};

export default function App() {
  const [repositories, setRepositories] = useState<RepositoryProject[]>(INITIAL_REPOSITORIES);
  const [activeRepoId, setActiveRepoId] = useState<string>(INITIAL_REPOSITORIES[0].id);
  const [activeStage, setActiveStage] = useState<PipelineStage>('overview');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    INITIAL_REPOSITORIES[0].findings[0]?.id ?? null
  );
  const [scanComposerOpen, setScanComposerOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeRepo =
    repositories.find((r) => r.id === activeRepoId) ?? repositories[0];

  const handleSelectRepo = (repoId: string) => {
    setActiveRepoId(repoId);
    const repo = repositories.find((r) => r.id === repoId);
    setSelectedFindingId(repo?.findings[0]?.id ?? null);
    setScanComposerOpen(false);
  };

  const handleInspectFinding = (findingId: string, targetStage: PipelineStage) => {
    setSelectedFindingId(findingId);
    setActiveStage(targetStage);
    setScanComposerOpen(false);
  };

  const handleOpenScanComposer = () => {
    setActiveStage('scanning');
    setScanComposerOpen(true);
  };

  const handleUpdateThreatModel = (repoId: string, newThreatModel: ThreatModel) => {
    setRepositories((prev) =>
      prev.map((r) => (r.id === repoId ? { ...r, threatModel: newThreatModel } : r))
    );
  };

  const handleCommitScanned = (
    repoId: string,
    commitRecord: CommitRecord,
    finding?: VulnerabilityFinding
  ) => {
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          commits: [commitRecord, ...r.commits],
          findings: finding ? [finding, ...r.findings] : r.findings,
        };
      })
    );
    if (finding) {
      setSelectedFindingId(finding.id);
    }
  };

  const handleUpdateValidation = (
    repoId: string,
    findingId: string,
    validation: SandboxValidation
  ) => {
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          findings: r.findings.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              status: f.patch.applied
                ? 'Patched'
                : validation.confirmedExploitable
                ? 'Confirmed'
                : 'False Positive',
              validation,
            };
          }),
        };
      })
    );
  };

  const handleApplyPatch = (repoId: string, findingId: string) => {
    const remediationSha = Math.random().toString(16).substring(2, 9);
    const appliedAt = new Date().toISOString();
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          findings: r.findings.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              status: 'Patched',
              patch: {
                ...f.patch,
                applied: true,
                appliedCommitSha: remediationSha,
                appliedAt,
              },
            };
          }),
        };
      })
    );
  };

  const handleRevertPatch = (repoId: string, findingId: string) => {
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          findings: r.findings.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              status: f.validation.confirmedExploitable ? 'Confirmed' : 'Pending Validation',
              patch: {
                ...f.patch,
                applied: false,
                appliedCommitSha: undefined,
                appliedAt: undefined,
              },
            };
          }),
        };
      })
    );
  };

  const handleUpdateFindingStatus = (
    repoId: string,
    findingId: string,
    status: FindingStatus
  ) => {
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          findings: r.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
        };
      })
    );
  };

  const handleReplacePatch = (
    repoId: string,
    findingId: string,
    patch: PatchRemediation
  ) => {
    setRepositories((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        return {
          ...r,
          findings: r.findings.map((f) => (f.id === findingId ? { ...f, patch } : f)),
        };
      })
    );
  };

  const handleRepoConnected = (newRepo: RepositoryProject) => {
    setRepositories((prev) => [newRepo, ...prev]);
    setActiveRepoId(newRepo.id);
    setSelectedFindingId(newRepo.findings[0]?.id ?? null);
    setActiveStage(newRepo.findings.length > 0 ? 'scanning' : 'analysis');
    setScanComposerOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        repositories={repositories}
        activeRepoId={activeRepo.id}
        activeStage={activeStage}
        onSelectRepo={handleSelectRepo}
        onSelectStage={(stage) => {
          setActiveStage(stage);
          setScanComposerOpen(false);
        }}
        onOpenConnectModal={() => setConnectModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumbs left, single primary CTA right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                Repositories
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                onClick={() => setActiveStage('overview')}
                className="font-mono text-slate-700 hover:text-slate-900 truncate whitespace-nowrap"
              >
                {activeRepo.owner}/{activeRepo.name}
              </button>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate whitespace-nowrap">
                {STAGE_TITLES[activeStage]}
              </span>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleOpenScanComposer}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Scan New Commit
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-7 max-w-[1280px] w-full mx-auto">
          {activeStage === 'overview' && (
            <PipelineOverview
              repo={activeRepo}
              onSelectStage={setActiveStage}
              onInspectFinding={handleInspectFinding}
              onOpenScanComposer={handleOpenScanComposer}
            />
          )}

          {activeStage === 'analysis' && (
            <AnalysisStageView
              repo={activeRepo}
              onUpdateThreatModel={handleUpdateThreatModel}
            />
          )}

          {activeStage === 'scanning' && (
            <CommitScanningStageView
              repo={activeRepo}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
              onNavigateStage={setActiveStage}
              onCommitScanned={handleCommitScanned}
              composerOpen={scanComposerOpen}
              onToggleComposer={setScanComposerOpen}
            />
          )}

          {activeStage === 'validation' && (
            <ValidationStageView
              repo={activeRepo}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
              onUpdateValidation={handleUpdateValidation}
              onNavigateStage={setActiveStage}
            />
          )}

          {activeStage === 'patching' && (
            <PatchingStageView
              repo={activeRepo}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
              onApplyPatch={handleApplyPatch}
              onRevertPatch={handleRevertPatch}
              onUpdateFindingStatus={handleUpdateFindingStatus}
              onReplacePatch={handleReplacePatch}
            />
          )}
        </main>
      </div>

      <ConnectRepoModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onRepoConnected={handleRepoConnected}
      />
    </div>
  );
}
