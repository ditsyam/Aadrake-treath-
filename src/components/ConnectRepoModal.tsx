import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import type { RepositoryProject } from '../types/aardvark';

interface ConnectRepoModalProps {
  open: boolean;
  onClose: () => void;
  onRepoConnected: (newRepo: RepositoryProject) => void;
}

const TEMPLATE_PRESETS = [
  {
    label: 'Express File Export API',
    owner: 'acme',
    name: 'invoice-exporter',
    language: 'TypeScript',
    summary: 'Internal invoice PDF generator and customer document download microservice.',
    filePath: 'src/routes/download.ts',
    code: `import express from "express";
import path from "node:path";
import fs from "node:fs";

const app = express();

app.get("/api/invoices/download", (req, res) => {
  const filename = String(req.query.file || "");
  const targetPath = path.join("/var/data/invoices", filename);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.sendFile(targetPath);
});`,
  },
  {
    label: 'Python Admin GraphQL Proxy',
    owner: 'acme',
    name: 'partner-sync-worker',
    language: 'Python',
    summary: 'Background service executing partner webhook transformations and XML imports.',
    filePath: 'app/importers/xml_parser.py',
    code: `import xml.etree.ElementTree as ET
from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/partners/import")
async def import_partner_feed(request: Request):
    raw_xml = await request.body()
    tree = ET.fromstring(raw_xml.decode("utf-8"))
    records = [elem.text for elem in tree.findall(".//account_id")]
    return {"imported_count": len(records)}`,
  },
  {
    label: 'Mastercard MCP Server',
    owner: 'acme',
    name: 'mastercard-mcp-server',
    language: 'TypeScript',
    summary: 'MCP stdio server wrapping @mastercard/developers-agent-toolkit/mcp for AI agent tool execution.',
    filePath: 'src/index.ts',
    code: `import { MastercardDevelopersAgentToolkit } from "@mastercard/developers-agent-toolkit/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(\`Missing required environment variable: \${name}\`);
  }
  return value;
}

async function main() {
  const server = new MastercardDevelopersAgentToolkit({
    consumerKey: requireEnv("MASTERCARD_CONSUMER_KEY"),
    keyStorePath: requireEnv("MASTERCARD_KEYSTORE_PATH"),
    environment: process.env.MASTERCARD_ENV === "production" ? "production" : "sandbox",
  });
  const transport = new StdioServerTransport();
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    process.off("SIGINT", onSigInt);
    process.off("SIGTERM", onSigTerm);
    console.error(\`Received \${signal}; shutting down Mastercard Developers MCP Server...\`);

    const results = await Promise.allSettled([server.close(), transport.close()]);
    const rejected = results.find((r) => r.status === "rejected");
    if (rejected && rejected.status === "rejected") {
      console.error("Error during MCP shutdown:", rejected.reason);
      process.exit(1);
    }
    process.exit(0);
  };

  const onSigInt = () => void shutdown("SIGINT");
  const onSigTerm = () => void shutdown("SIGTERM");

  process.once("SIGINT", onSigInt);
  process.once("SIGTERM", onSigTerm);
  transport.onerror = (error) => console.error("Transport error:", error);
  transport.onclose = () => void shutdown("transport-close");

  try {
    await server.connect(transport);
    console.error("Mastercard Developers MCP Server running on stdio");
  } catch (error) {
    process.off("SIGINT", onSigInt);
    process.off("SIGTERM", onSigTerm);
    await transport.close().catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});`,
  },
];

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({
  open,
  onClose,
  onRepoConnected,
}) => {
  const [owner, setOwner] = useState('acme');
  const [name, setName] = useState('invoice-exporter');
  const [language, setLanguage] = useState('TypeScript');
  const [summary, setSummary] = useState(TEMPLATE_PRESETS[0].summary);
  const [filePath, setFilePath] = useState(TEMPLATE_PRESETS[0].filePath);
  const [codeSnippet, setCodeSnippet] = useState(TEMPLATE_PRESETS[0].code);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const applyPreset = (presetIndex: number) => {
    const p = TEMPLATE_PRESETS[presetIndex];
    setOwner(p.owner);
    setName(p.name);
    setLanguage(p.language);
    setSummary(p.summary);
    setFilePath(p.filePath);
    setCodeSnippet(p.code);
    setErrorMsg(null);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setProgressStep('Stage 01: Analyzing repository & generating threat model...');
      const analyzeRes = await fetch('/api/aardvark/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: `${owner}/${name}`,
          language,
          architectureNotes: summary,
          codeContext: `// ${filePath}\n${codeSnippet}`,
          commitSha: 'initial',
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || analyzeData.detail || 'Repository analysis failed');
      }

      setProgressStep('Stages 02–04: Scanning history, validating in sandbox & preparing patch...');
      const scanRes = await fetch('/api/aardvark/scan-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: `${owner}/${name}`,
          language,
          threatModelSummary: analyzeData.threatModel.summary,
          commitMessage: 'chore: initial repository history baseline scan',
          author: 'aardvark-init',
          filePath,
          diffContent: codeSnippet,
        }),
      });
      const scanData = await scanRes.json();
      if (!scanRes.ok) {
        throw new Error(scanData.error || scanData.detail || 'History scan failed');
      }

      const newRepo: RepositoryProject = {
        id: `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Date.now().toString().slice(-4)}`,
        owner: owner.trim() || 'acme',
        name: name.trim(),
        language,
        defaultBranch: 'main',
        connectedAt: new Date().toISOString(),
        summary,
        threatModel: {
          ...analyzeData.threatModel,
          lastAnalyzedCommit: scanData.commitRecord.sha,
        },
        commits: [
          {
            ...scanData.commitRecord,
            scanType: 'History Scan',
          },
        ],
        findings: scanData.finding ? [scanData.finding] : [],
        sampleIncomingCommits: [],
      };

      onRepoConnected(newRepo);
      setProgressStep(null);
      onClose();
    } catch (err) {
      setProgressStep(null);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect repository');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Connect Repository to Aardvark
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Builds initial threat model and runs a full baseline history scan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(progressStep)}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConnect} className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Quick templates:</span>
            <div className="flex items-center gap-2">
              {TEMPLATE_PRESETS.map((preset, idx) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(idx)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {progressStep && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
              <span>{progressStep}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Owner / Org</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Repository Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Primary Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              System Architecture &amp; Security Context
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Primary File Path</label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Repository Source Snippet for History Scan
            </label>
            <textarea
              rows={7}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(progressStep)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(progressStep)}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {progressStep ? 'Running Pipeline...' : 'Connect & Run Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
