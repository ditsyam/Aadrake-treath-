import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, Layers, AlertTriangle } from 'lucide-react';
import type { RepositoryProject, Severity, ThreatModel } from '../types/aardvark';

interface AnalysisStageViewProps {
  repo: RepositoryProject;
  onUpdateThreatModel: (repoId: string, newThreatModel: ThreatModel) => void;
}

const RISK_TEXT: Record<Severity, string> = {
  Critical: 'text-red-700 font-semibold',
  High: 'text-amber-700 font-semibold',
  Medium: 'text-slate-700 font-medium',
  Low: 'text-slate-500 font-medium',
};

export const AnalysisStageView: React.FC<AnalysisStageViewProps> = ({
  repo,
  onUpdateThreatModel,
}) => {
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [architectureNotes, setArchitectureNotes] = useState(
    repo.threatModel.architectureOverview
  );
  const [codeContext, setCodeContext] = useState(
    repo.findings.map((f) => `// ${f.filePath}\n${f.codeLines.map((l) => l.content).join('\n')}`).join('\n\n')
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { threatModel } = repo;

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/aardvark/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: `${repo.owner}/${repo.name}`,
          language: repo.language,
          architectureNotes,
          codeContext,
          commitSha: threatModel.lastAnalyzedCommit,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to analyze repository');
      }
      onUpdateThreatModel(repo.id, data.threatModel);
      setShowReanalyze(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Repository analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stage Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="max-w-3xl space-y-2">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Stage 01 · Repository Analysis</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Commit {threatModel.lastAnalyzedCommit}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Updated {new Date(threatModel.analyzedAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Repository Threat Model
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{threatModel.summary}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowReanalyze((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{showReanalyze ? 'Close Analyzer' : 'Re-analyze Repository'}</span>
        </button>
      </section>

      {/* Interactive Re-analysis Panel */}
      {showReanalyze && (
        <form
          onSubmit={handleRunAnalysis}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Update Repository Context &amp; Regenerate Threat Model
            </h2>
            <span className="text-xs text-slate-500">Full-repository architectural pass</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Architecture &amp; Deployment Notes
            </label>
            <textarea
              rows={2}
              value={architectureNotes}
              onChange={(e) => setArchitectureNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Repository Source Context
            </label>
            <textarea
              rows={7}
              value={codeContext}
              onChange={(e) => setCodeContext(e.target.value)}
              className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowReanalyze(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isAnalyzing ? 'Analyzing Repository...' : 'Generate Threat Model'}
            </button>
          </div>
        </form>
      )}

      {/* Architecture Overview & Security Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Layers className="w-4 h-4 text-blue-700" />
            <h2 className="font-display text-base font-semibold">System Design &amp; Boundaries</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {threatModel.architectureOverview}
          </p>
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Protected Assets</div>
              <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                {threatModel.assets.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Tracked Threat Vectors</div>
              <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                {threatModel.attackVectors.length}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Security Objectives
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {threatModel.securityObjectives.map((obj) => (
              <div key={obj.id} className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{obj.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{obj.criticality} Objective</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{obj.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{obj.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assets & Trust Boundaries Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Assets &amp; Trust Boundaries
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sensitive state and privilege transitions monitored during commit scanning.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Asset</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Entry Point</th>
                <th className="py-2.5 px-4">Trust Boundary</th>
                <th className="py-2.5 px-6">Module</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {threatModel.assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="py-3 px-6 font-medium text-slate-900">{asset.name}</td>
                  <td className="py-3 px-4 text-slate-600">{asset.type}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{asset.entryPoint}</td>
                  <td className="py-3 px-4 text-slate-700">{asset.trustBoundary}</td>
                  <td className="py-3 px-6 font-mono text-slate-500">{asset.ownerModule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Threat Vectors Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Identified Attack Vectors &amp; Expected Mitigations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Vector</th>
                <th className="py-2.5 px-4">Target Boundary</th>
                <th className="py-2.5 px-4">CWE</th>
                <th className="py-2.5 px-4">Risk</th>
                <th className="py-2.5 px-6">Mitigation Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {threatModel.attackVectors.map((vec) => (
                <tr key={vec.id} className="hover:bg-slate-50">
                  <td className="py-3 px-6 font-medium text-slate-900">{vec.vectorName}</td>
                  <td className="py-3 px-4 text-slate-600">{vec.targetBoundary}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{vec.cweCategory}</td>
                  <td className={`py-3 px-4 ${RISK_TEXT[vec.riskLevel]}`}>{vec.riskLevel}</td>
                  <td className="py-3 px-6 text-slate-600 max-w-md">{vec.mitigationExpectation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
