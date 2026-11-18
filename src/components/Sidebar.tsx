import React from 'react';
import {
  FolderGit2,
  ShieldAlert,
  GitCommitHorizontal,
  FlaskConical,
  Wrench,
  LayoutGrid,
  Plus,
  X,
} from 'lucide-react';
import type { PipelineStage, RepositoryProject } from '../types/aardvark';

interface SidebarProps {
  repositories: RepositoryProject[];
  activeRepoId: string;
  activeStage: PipelineStage;
  onSelectRepo: (repoId: string) => void;
  onSelectStage: (stage: PipelineStage) => void;
  onOpenConnectModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const STAGE_ITEMS: {
  id: PipelineStage;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'overview',
    label: 'Pipeline Overview',
    sublabel: 'End-to-end posture',
    icon: LayoutGrid,
  },
  {
    id: 'analysis',
    label: '01. Analysis',
    sublabel: 'Threat model',
    icon: ShieldAlert,
  },
  {
    id: 'scanning',
    label: '02. Commit Scanning',
    sublabel: 'Diffs & annotations',
    icon: GitCommitHorizontal,
  },
  {
    id: 'validation',
    label: '03. Validation',
    sublabel: 'Sandbox exploits',
    icon: FlaskConical,
  },
  {
    id: 'patching',
    label: '04. Patching',
    sublabel: 'Codex remediation',
    icon: Wrench,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  repositories,
  activeRepoId,
  activeStage,
  onSelectRepo,
  onSelectStage,
  onOpenConnectModal,
  mobileOpen,
  onCloseMobile,
}) => {
  const activeRepo = repositories.find((r) => r.id === activeRepoId) ?? repositories[0];
  const openConfirmedCount = activeRepo.findings.filter((f) => f.status === 'Confirmed').length;
  const readyPatchCount = activeRepo.findings.filter(
    (f) => f.status === 'Confirmed' && !f.patch.applied
  ).length;

  const getStageCount = (stageId: PipelineStage): string | null => {
    switch (stageId) {
      case 'analysis':
        return String(activeRepo.threatModel.attackVectors.length);
      case 'scanning':
        return String(activeRepo.commits.length);
      case 'validation':
        return String(openConfirmedCount);
      case 'patching':
        return String(readyPatchCount);
      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 w-[264px] shrink-0">
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onSelectStage('overview');
            onCloseMobile();
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Aardvark
        </a>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-7">
        <div>
          <div className="px-2.5 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pipeline Stages</span>
          </div>
          <nav className="space-y-1" aria-label="Pipeline stages">
            {STAGE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeStage === item.id;
              const count = getStageCount(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectStage(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-300' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={`text-xs truncate leading-tight mt-0.5 ${
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    </div>
                  </div>
                  {count !== null && (
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <div className="px-2.5 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Repositories</span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {repositories.length}
            </span>
          </div>
          <div className="space-y-1">
            {repositories.map((repo) => {
              const isSelected = repo.id === activeRepoId;
              const openIssues = repo.findings.filter((f) => f.status === 'Confirmed').length;
              return (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => {
                    onSelectRepo(repo.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 border border-slate-200'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <FolderGit2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {repo.owner}/{repo.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{repo.language}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`tabular-nums ${
                          openIssues > 0 ? 'text-red-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {openIssues} open
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenConnectModal();
              onCloseMobile();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
