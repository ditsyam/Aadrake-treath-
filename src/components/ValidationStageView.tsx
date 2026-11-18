import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  ShieldAlert,
  Play,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import type {
  PipelineStage,
  RepositoryProject,
  SandboxValidation,
} from '../types/aardvark';

interface ValidationStageViewProps {
  repo: RepositoryProject;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onUpdateValidation: (
    repoId: string,
    findingId: string,
    validation: SandboxValidation
  ) => void;
  onNavigateStage: (stage: PipelineStage) => void;
}

export const ValidationStageView: React.FC<ValidationStageViewProps> = ({
  repo,
  selectedFindingId,
  onSelectFinding,
  onUpdateValidation,
  onNavigateStage,
}) => {
  const activeFinding =
    repo.findings.find((f) => f.id === selectedFindingId) ?? repo.findings[0] ?? null;

  const [customPayload, setCustomPayload] = useState(activeFinding?.validation.payload ?? '');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeFinding) {
      setCustomPayload(activeFinding.validation.payload);
      setErrorMsg(null);
    }
  }, [activeFinding?.id]);

  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFinding) return;
    setIsValidating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/aardvark/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeFinding.title,
          filePath: activeFinding.filePath,
          codeSnippet: activeFinding.codeLines.map((l) => l.content).join('\n'),
          customPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Sandbox validation failed');
      }
      onUpdateValidation(repo.id, activeFinding.id, data.validation);
      setCustomPayload(data.validation.payload);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Validation request failed');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="max-w-3xl space-y-1.5">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Stage 03 · Sandboxed Validation</span>
            <span aria-hidden="true">·</span>
            <span>False-positive elimination</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Isolated Exploitability Verification
          </h1>
          <p className="text-sm text-slate-600">
            Aardvark attempts to trigger each candidate finding inside an isolated, sandboxed container so only confirmed, high-signal vulnerabilities reach engineers.
          </p>
        </div>

        {activeFinding && (
          <button
            type="button"
            onClick={() => onNavigateStage('patching')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Proceed to Patching</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
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
                      f.validation.confirmedExploitable ? 'text-red-700' : 'text-emerald-700'
                    }
                  >
                    {f.validation.confirmedExploitable ? 'Exploitable' : 'Filtered FP'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!activeFinding ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          No candidate findings available to validate in this repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Outcome, Sandbox Spec, Reproduction Steps */}
          <div className="xl:col-span-5 space-y-5">
            <div
              className={`border rounded-xl p-5 space-y-2 ${
                activeFinding.validation.confirmedExploitable
                  ? 'bg-red-50/60 border-red-200'
                  : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                {activeFinding.validation.confirmedExploitable ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-red-700" />
                    <span className="text-red-800">Exploitability Confirmed in Sandbox</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-emerald-800">
                      False Positive Filtered — Not Exploitable
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">
                {activeFinding.validation.outcome}
              </p>
              <div className="text-xs text-slate-500 font-mono tabular-nums pt-1">
                Duration: {activeFinding.validation.durationMs}ms · Validated{' '}
                {new Date(activeFinding.validation.validatedAt).toLocaleString()}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-700" />
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Isolated Sandbox Environment
                </h2>
              </div>
              <dl className="divide-y divide-slate-200 text-xs">
                <div className="px-5 py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Runtime</dt>
                  <dd className="font-mono text-slate-900 text-right">
                    {activeFinding.validation.environmentSpec.runtime}
                  </dd>
                </div>
                <div className="px-5 py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Isolation</dt>
                  <dd className="font-mono text-slate-900 text-right">
                    {activeFinding.validation.environmentSpec.isolation}
                  </dd>
                </div>
                <div className="px-5 py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Network Policy</dt>
                  <dd className="text-slate-800 text-right">
                    {activeFinding.validation.environmentSpec.networkPolicy}
                  </dd>
                </div>
                <div className="px-5 py-3 flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">Seed State</dt>
                  <dd className="text-slate-800 text-right">
                    {activeFinding.validation.environmentSpec.seedState}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Verification Steps Taken
              </h2>
              <ol className="space-y-2.5">
                {activeFinding.validation.reproductionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <span className="font-mono text-slate-400 tabular-nums shrink-0">
                      0{i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right Column: Payload Tester + Sandbox Execution Trace */}
          <div className="xl:col-span-7 space-y-5">
            <form
              onSubmit={handleRunSandbox}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Sandbox Trigger Payload
                </h2>
                <span className="text-xs text-slate-500">{activeFinding.filePath}</span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <textarea
                rows={3}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full px-3 py-2.5 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                required
              />

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Modify the probe payload to test defensive edge cases in isolation.
                </span>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {isValidating ? 'Executing in Sandbox...' : 'Run Sandbox Validation'}
                  </span>
                </button>
              </div>
            </form>

            {/* Execution Trace */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">Sandbox Execution Trace</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {activeFinding.validation.executionTrace.length} events
                </span>
              </div>
              <div className="p-5 font-mono text-xs space-y-2 overflow-x-auto">
                {activeFinding.validation.executionTrace.map((line, index) => {
                  const isAssert = line.startsWith('[assert]');
                  return (
                    <div
                      key={index}
                      className={`leading-relaxed ${
                        isAssert
                          ? activeFinding.validation.confirmedExploitable
                            ? 'text-red-400 font-medium'
                            : 'text-emerald-400 font-medium'
                          : 'text-slate-300'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
