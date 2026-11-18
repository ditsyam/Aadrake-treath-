import React, { useState } from 'react';
import {
  CheckCircle2,
  Wrench,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type {
  FindingStatus,
  PatchRemediation,
  RepositoryProject,
} from '../types/aardvark';

interface PatchingStageViewProps {
  repo: RepositoryProject;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onApplyPatch: (repoId: string, findingId: string) => void;
  onRevertPatch: (repoId: string, findingId: string) => void;
  onUpdateFindingStatus: (repoId: string, findingId: string, status: FindingStatus) => void;
  onReplacePatch: (repoId: string, findingId: string, patch: PatchRemediation) => void;
}

export const PatchingStageView: React.FC<PatchingStageViewProps> = ({
  repo,
  selectedFindingId,
  onSelectFinding,
  onApplyPatch,
  onRevertPatch,
  onUpdateFindingStatus,
  onReplacePatch,
}) => {
  const activeFinding =
    repo.findings.find((f) => f.id === selectedFindingId) ?? repo.findings[0] ?? null;

  const [guidance, setGuidance] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFinding) return;
    setIsRegenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/aardvark/regenerate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeFinding.title,
          cweId: activeFinding.cweId,
          filePath: activeFinding.filePath,
          codeSnippet: activeFinding.codeLines.map((l) => l.content).join('\n'),
          guidance,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Patch regeneration failed');
      }
      onReplacePatch(repo.id, activeFinding.id, data.patch);
      setGuidance('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to regenerate patch');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Stage 04 · Patching</span>
            <span aria-hidden="true">·</span>
            <span>OpenAI Codex synthesis &amp; Aardvark re-scan</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Human Review &amp; One-Click Remediation
          </h1>
          <p className="text-sm text-slate-600">
            Every validated finding includes a Codex-generated, Aardvark-verified patch ready for human review and one-click repository application.
          </p>
        </div>
      </section>

      {/* Finding Selector Strip */}
      {repo.findings.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {repo.findings.map((f) => {
            const isSelected = activeFinding?.id === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFinding(f.id)}
                className={`px-3 py-2 rounded-lg text-left border transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white border-slate-900 text-slate-900'
                    : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <div className="text-xs font-medium flex items-center gap-2">
                  <span className="font-mono">{f.id}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      f.patch.applied
                        ? 'text-emerald-700'
                        : f.status === 'False Positive'
                        ? 'text-slate-500'
                        : 'text-blue-700'
                    }
                  >
                    {f.patch.applied
                      ? 'Patched'
                      : f.status === 'False Positive'
                      ? 'No Patch Needed'
                      : 'Patch Ready'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!activeFinding ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          No findings available for patching.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patch Summary & Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span className="font-mono">{activeFinding.patch.patchId}</span>
                <span aria-hidden="true">·</span>
                <span>{activeFinding.patch.engine}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeFinding.filePath}</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {activeFinding.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeFinding.patch.summary}
              </p>
              {activeFinding.patch.applied && (
                <div className="pt-1 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Patch applied to {repo.defaultBranch} · Remediation commit{' '}
                    <span className="font-mono">{activeFinding.patch.appliedCommitSha}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {activeFinding.status !== 'False Positive' && !activeFinding.patch.applied && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFindingStatus(repo.id, activeFinding.id, 'False Positive')
                    }
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                  >
                    Mark False Positive
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyPatch(repo.id, activeFinding.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Approve &amp; Apply Patch</span>
                  </button>
                </>
              )}

              {activeFinding.patch.applied && (
                <button
                  type="button"
                  onClick={() => onRevertPatch(repo.id, activeFinding.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert Patch</span>
                </button>
              )}
            </div>
          </div>

          {/* Code Diff Viewer */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-slate-800">
                {activeFinding.filePath}
              </span>
              <span className="text-slate-500">Unified Remediation Diff</span>
            </div>

            <div className="overflow-x-auto font-mono text-xs divide-y divide-slate-100">
              {activeFinding.patch.diffLines.map((line, index) => {
                const bg =
                  line.type === 'removed'
                    ? 'bg-red-50/80 text-red-950'
                    : line.type === 'added'
                    ? 'bg-emerald-50/80 text-emerald-950'
                    : 'bg-white text-slate-800';
                const symbol =
                  line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' ';
                return (
                  <div key={index} className={`flex items-stretch ${bg}`}>
                    <div className="w-11 py-1.5 px-2 text-right text-slate-400 border-r border-slate-200 tabular-nums select-none shrink-0">
                      {line.oldLine ?? ''}
                    </div>
                    <div className="w-11 py-1.5 px-2 text-right text-slate-400 border-r border-slate-200 tabular-nums select-none shrink-0">
                      {line.newLine ?? ''}
                    </div>
                    <div className="w-6 py-1.5 text-center select-none font-semibold shrink-0">
                      {symbol}
                    </div>
                    <pre className="py-1.5 pr-4 whitespace-pre overflow-x-auto flex-1">
                      {line.content || ' '}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aardvark Post-Patch Verification & Regenerate Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Aardvark Post-Patch Security Verification
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {activeFinding.patch.aardvarkVerificationChecks.map((chk, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-3">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        chk.passed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900">{chk.checkName}</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{chk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleRegenerate}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Request Alternative Patch
              </h3>
              <p className="text-xs text-slate-600">
                Provide architectural constraints to synthesize and re-verify an alternative patch.
              </p>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <textarea
                rows={3}
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="e.g. Enforce strict Zod schema validation and return HTTP 400..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              />

              <button
                type="submit"
                disabled={isRegenerating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>
                  {isRegenerating ? 'Synthesizing & Scanning Patch...' : 'Regenerate Patch'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
