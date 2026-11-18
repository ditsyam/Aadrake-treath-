import React, { useState } from 'react';
import {
  GitCommitHorizontal,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import type {
  CommitRecord,
  PipelineStage,
  RepositoryProject,
  VulnerabilityFinding,
} from '../types/aardvark';

interface CommitScanningStageViewProps {
  repo: RepositoryProject;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onNavigateStage: (stage: PipelineStage) => void;
  onCommitScanned: (
    repoId: string,
    commitRecord: CommitRecord,
    finding?: VulnerabilityFinding
  ) => void;
  composerOpen: boolean;
  onToggleComposer: (open: boolean) => void;
}

export const CommitScanningStageView: React.FC<CommitScanningStageViewProps> = ({
  repo,
  selectedFindingId,
  onSelectFinding,
  onNavigateStage,
  onCommitScanned,
  composerOpen,
  onToggleComposer,
}) => {
  const activeFinding =
    repo.findings.find((f) => f.id === selectedFindingId) ?? repo.findings[0] ?? null;

  const firstSample = repo.sampleIncomingCommits[0];
  const [commitMessage, setCommitMessage] = useState(
    firstSample?.commitMessage ?? 'feat(api): add request handler'
  );
  const [author, setAuthor] = useState(firstSample?.author ?? 'developer');
  const [filePath, setFilePath] = useState(firstSample?.filePath ?? 'src/routes/handler.ts');
  const [diffContent, setDiffContent] = useState(firstSample?.diffContent ?? '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cleanNotice, setCleanNotice] = useState<string | null>(null);

  const loadSample = (sampleId: string) => {
    const sample = repo.sampleIncomingCommits.find((s) => s.id === sampleId);
    if (!sample) return;
    setCommitMessage(sample.commitMessage);
    setAuthor(sample.author);
    setFilePath(sample.filePath);
    setDiffContent(sample.diffContent);
    setCleanNotice(null);
    setScanError(null);
  };

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setScanError(null);
    setCleanNotice(null);

    try {
      const response = await fetch('/api/aardvark/scan-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: `${repo.owner}/${repo.name}`,
          language: repo.language,
          threatModelSummary: `${repo.threatModel.summary} Objectives: ${repo.threatModel.securityObjectives
            .map((o) => o.title)
            .join('; ')}`,
          commitMessage,
          author,
          filePath,
          diffContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Commit scan failed');
      }
      onCommitScanned(repo.id, data.commitRecord, data.finding);
      if (!data.hasVulnerability) {
        setCleanNotice(data.cleanSummary || 'No vulnerabilities detected against threat model.');
      } else {
        onToggleComposer(false);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to scan commit');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Stage 02 · Commit Scanning</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{repo.commits.length} scanned commits</span>
            <span aria-hidden="true">·</span>
            <span>Threat-model aware diff inspection</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Commit History &amp; Annotated Findings
          </h1>
          <p className="text-sm text-slate-600">
            Inspects historical commits on initial connection and every new commit against the repository threat model, annotating vulnerable lines for human review.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleComposer(!composerOpen)}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          {composerOpen ? 'Hide Commit Scanner' : 'Scan New Commit'}
        </button>
      </section>

      {/* Live Commit Scan Composer */}
      {composerOpen && (
        <form
          onSubmit={handleRunScan}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Inspect New Commit Against Threat Model
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Runs Stage 2 annotation, Stage 3 sandbox validation, and Stage 4 Codex patch synthesis.
              </p>
            </div>
            {repo.sampleIncomingCommits.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">Presets:</span>
                {repo.sampleIncomingCommits.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample.id)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    {sample.filePath.split('/').pop()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {scanError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {cleanNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{cleanNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-700">Commit Message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">File Path</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Commit Code / Diff Payload
            </label>
            <textarea
              rows={8}
              value={diffContent}
              onChange={(e) => setDiffContent(e.target.value)}
              placeholder="Paste source code or unified diff introduced in this commit..."
              className="w-full px-3 py-2.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700 leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onToggleComposer(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Scanning Commit & Threat Model...' : 'Run Commit Scan'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Split Workspace: Commit Timeline + Annotated Code */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Commit History & Findings */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Scanned Commit Timeline
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {repo.commits.length} commits
              </span>
            </div>
            <div className="divide-y divide-slate-200">
              {repo.commits.map((commit) => {
                const linkedFinding = repo.findings.find((f) => f.commitSha === commit.sha);
                const isSelected = linkedFinding && activeFinding?.id === linkedFinding.id;
                return (
                  <div
                    key={commit.sha}
                    onClick={() => {
                      if (linkedFinding) onSelectFinding(linkedFinding.id);
                    }}
                    className={`p-4 space-y-1.5 transition-colors ${
                      linkedFinding ? 'cursor-pointer hover:bg-slate-50' : ''
                    } ${isSelected ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-900 inline-flex items-center gap-1.5">
                        <GitCommitHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        {commit.sha}
                      </span>
                      <span className="text-slate-500">{commit.scanType}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 leading-snug">
                      {commit.message}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-between pt-0.5">
                      <span>{commit.author}</span>
                      <span
                        className={
                          commit.status === 'Issues Found'
                            ? 'text-red-700 font-medium'
                            : commit.status === 'False Positive Filtered'
                            ? 'text-slate-500'
                            : 'text-emerald-700 font-medium'
                        }
                      >
                        {commit.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Step-by-Step Explanation & Annotated Code Viewer */}
        <div className="xl:col-span-8 space-y-5">
          {!activeFinding ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                No vulnerability findings in this repository
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Scan a new commit diff above to inspect line-by-line code annotations against the threat model.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                      <span className="font-mono">{activeFinding.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{activeFinding.cweId}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          activeFinding.severity === 'Critical'
                            ? 'text-red-700 font-semibold'
                            : activeFinding.severity === 'High'
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {activeFinding.severity} Severity
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeFinding.status}</span>
                    </div>
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      {activeFinding.title}
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {activeFinding.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigateStage('validation')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                    >
                      <span>Sandbox Trace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateStage('patching')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
                    >
                      <span>Review Patch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Threat Model Alignment */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Threat Model Alignment: </span>
                  {activeFinding.threatModelAlignment}
                </div>

                {/* Step-by-Step Explanation */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Step-by-Step Vulnerability Walkthrough
                  </h3>
                  <ol className="space-y-2">
                    {activeFinding.stepByStepExplanation.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
                        <span className="font-mono text-slate-500 tabular-nums shrink-0 mt-0.5">
                          0{idx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Annotated Source Code Viewer */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-slate-800">
                    {activeFinding.filePath}
                  </span>
                  <span className="font-mono text-slate-500">
                    Commit {activeFinding.commitSha}
                  </span>
                </div>

                <div className="overflow-x-auto divide-y divide-slate-100 font-mono text-xs">
                  {activeFinding.codeLines.map((line) => {
                    const lineAnnotations = activeFinding.annotations.filter(
                      (a) => a.lineNumber === line.lineNumber
                    );
                    const isVulnerable =
                      line.kind === 'vulnerable' ||
                      activeFinding.vulnerableLines.includes(line.lineNumber);
                    const isAdded = line.kind === 'added';

                    return (
                      <React.Fragment key={line.lineNumber}>
                        <div
                          className={`flex items-stretch ${
                            isVulnerable
                              ? 'bg-red-50/70'
                              : isAdded
                              ? 'bg-amber-50/50'
                              : 'bg-white'
                          }`}
                        >
                          <div className="w-12 py-1.5 px-3 text-right text-slate-400 select-none border-r border-slate-200 tabular-nums shrink-0">
                            {line.lineNumber}
                          </div>
                          <pre className="py-1.5 px-4 text-slate-900 whitespace-pre overflow-x-auto flex-1">
                            {line.content || ' '}
                          </pre>
                        </div>

                        {lineAnnotations.map((ann) => (
                          <div
                            key={`${ann.lineNumber}-${ann.stepIndex}`}
                            className="bg-slate-50 border-y border-slate-200 px-5 py-3 font-sans"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                              <span className="font-mono text-red-700 tabular-nums">
                                Step {ann.stepIndex} · Line {ann.lineNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{ann.title}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {ann.explanation}
                            </p>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
