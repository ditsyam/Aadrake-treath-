import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Search,
  ShieldAlert,
  GitCommitHorizontal,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import type {
  FindingStatus,
  PipelineStage,
  RepositoryProject,
  Severity,
  VulnerabilityFinding,
} from '../types/aardvark';
import { ThreatHeatmap } from './ThreatHeatmap';

interface PipelineOverviewProps {
  repo: RepositoryProject;
  repositories: RepositoryProject[];
  onSelectRepo: (repoId: string) => void;
  onSelectStage: (stage: PipelineStage) => void;
  onInspectFinding: (findingId: string, targetStage: PipelineStage) => void;
  onOpenScanComposer: () => void;
}

const SEVERITY_TEXT: Record<Severity, string> = {
  Critical: 'text-red-700 font-semibold',
  High: 'text-amber-700 font-semibold',
  Medium: 'text-slate-700 font-medium',
  Low: 'text-slate-500 font-medium',
};

const STATUS_TEXT: Record<FindingStatus, string> = {
  Confirmed: 'text-red-700 font-medium',
  'Pending Validation': 'text-amber-700 font-medium',
  'False Positive': 'text-slate-500',
  Patched: 'text-emerald-700 font-medium',
};

export const PipelineOverview: React.FC<PipelineOverviewProps> = ({
  repo,
  repositories,
  onSelectRepo,
  onSelectStage,
  onInspectFinding,
  onOpenScanComposer,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | FindingStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = useMemo(() => {
    const confirmed = repo.findings.filter((f) => f.status === 'Confirmed').length;
    const patched = repo.findings.filter((f) => f.status === 'Patched').length;
    const filteredFp = repo.findings.filter((f) => f.status === 'False Positive').length;
    return {
      vectors: repo.threatModel.attackVectors.length,
      commits: repo.commits.length,
      confirmed,
      patched,
      filteredFp,
    };
  }, [repo]);

  const filteredFindings = useMemo(() => {
    return repo.findings.filter((f) => {
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.filePath.toLowerCase().includes(q) ||
        f.cweId.toLowerCase().includes(q) ||
        f.commitSha.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [repo.findings, statusFilter, searchQuery]);

  const stageCards: {
    id: PipelineStage;
    step: string;
    title: string;
    summary: string;
    stat: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'analysis',
      step: 'Stage 01',
      title: 'Repository Analysis',
      summary: 'Full-repository threat model mapping security objectives, assets, and trust boundaries.',
      stat: `${metrics.vectors} attack vectors mapped`,
      icon: ShieldAlert,
    },
    {
      id: 'scanning',
      step: 'Stage 02',
      title: 'Commit Scanning',
      summary: 'Inspects commit history and incoming diffs against the threat model with code annotations.',
      stat: `${metrics.commits} commits inspected`,
      icon: GitCommitHorizontal,
    },
    {
      id: 'validation',
      step: 'Stage 03',
      title: 'Sandboxed Validation',
      summary: 'Triggers candidate findings in an isolated sandbox to confirm exploitability and cut noise.',
      stat: `${metrics.confirmed} confirmed · ${metrics.filteredFp} filtered`,
      icon: FlaskConical,
    },
    {
      id: 'patching',
      step: 'Stage 04',
      title: 'Codex Patching',
      summary: 'Attaches Codex-generated, Aardvark-verified patches for human review and one-click fixes.',
      stat: `${metrics.patched} patched · ${metrics.confirmed} ready`,
      icon: Wrench,
    },
  ];

  const handleRowClick = (finding: VulnerabilityFinding) => {
    if (finding.status === 'False Positive') {
      onInspectFinding(finding.id, 'validation');
    } else if (finding.status === 'Confirmed') {
      onInspectFinding(finding.id, 'scanning');
    } else {
      onInspectFinding(finding.id, 'patching');
    }
  };

  return (
    <div className="space-y-8">
      {/* Repository Intro Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="max-w-3xl space-y-2">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="font-mono">{repo.owner}/{repo.name}</span>
            <span aria-hidden="true">·</span>
            <span>{repo.language}</span>
            <span aria-hidden="true">·</span>
            <span>Branch {repo.defaultBranch}</span>
            <span aria-hidden="true">·</span>
            <span>Head {repo.threatModel.lastAnalyzedCommit}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Autonomous Security Pipeline
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {repo.summary}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onSelectStage('analysis')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            View Threat Model
          </button>
          <button
            type="button"
            onClick={onOpenScanComposer}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            Scan New Commit
          </button>
        </div>
      </section>

      {/* 4-Stage Pipeline Chain */}
      <section aria-label="Four-stage security pipeline">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Multi-Stage Pipeline Architecture
          </h2>
          <span className="text-xs text-slate-500">Select a stage to inspect or run live</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stageCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectStage(card.id)}
                className="group text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:bg-slate-50/50 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{card.step}</span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{card.summary}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium tabular-nums">{card.stat}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4-Column Tabular Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Threat Vectors Mapped</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics.vectors}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {repo.threatModel.securityObjectives.length} security objectives
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Commits Scanned</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics.commits}
          </div>
          <div className="mt-1 text-xs text-slate-500">History + commit hooks</div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Confirmed Exploitable</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-red-700 tabular-nums">
            {metrics.confirmed}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {metrics.filteredFp} false positives filtered
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Patches Applied</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {metrics.patched}
          </div>
          <div className="mt-1 text-xs text-slate-500">Codex-generated &amp; verified</div>
        </div>
      </section>

      {/* Cross-Repository Severity Threat Heatmap */}
      <ThreatHeatmap
        repositories={repositories}
        activeRepoId={repo.id}
        onSelectRepo={onSelectRepo}
      />

      {/* Findings Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Vulnerability Findings Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any finding to review line annotations, sandbox exploit traces, or apply its patch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter file, CWE, or SHA..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 w-52"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['All', 'Confirmed', 'Patched', 'False Positive'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="text-sm font-medium text-slate-900">No matching findings</div>
            <p className="text-xs text-slate-500">
              Adjust your search filter or scan a new commit diff to inspect incoming code changes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Finding</th>
                  <th className="py-2.5 px-4">File &amp; Commit</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Validation State</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredFindings.map((finding) => (
                  <tr
                    key={finding.id}
                    onClick={() => handleRowClick(finding)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-5">
                      <div className="font-medium text-slate-900">{finding.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{finding.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{finding.cweId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-slate-700">{finding.filePath}</div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {finding.commitSha}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-xs ${SEVERITY_TEXT[finding.severity]}`}>
                      {finding.severity}
                    </td>
                    <td className={`py-3 px-4 text-xs ${STATUS_TEXT[finding.status]}`}>
                      {finding.status}
                    </td>
                    <td
                      className="py-3 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => onInspectFinding(finding.id, 'scanning')}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Annotations
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectFinding(finding.id, 'validation')}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Sandbox
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectFinding(finding.id, 'patching')}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          {finding.patch.applied ? 'Patched' : 'Review Patch'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
