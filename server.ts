import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(err: unknown, res: express.Response): void {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  const lower = message.toLowerCase();
  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('not configured')) {
    res.status(403).json({
      error: 'Gemini API authentication failed. Please verify GEMINI_API_KEY in Settings > Secrets.',
      detail: message,
    });
    return;
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    res.status(429).json({
      error: 'API quota exhausted. Check your API billing or quota in Settings > Secrets.',
      detail: message,
    });
    return;
  }
  res.status(500).json({
    error: 'Aardvark pipeline execution failed.',
    detail: message,
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Stage 1: Repository Analysis -> Threat Model
  app.post('/api/aardvark/analyze', async (req, res) => {
    try {
      const { repoName, language, architectureNotes, codeContext, commitSha } = req.body as {
        repoName?: string;
        language?: string;
        architectureNotes?: string;
        codeContext?: string;
        commitSha?: string;
      };

      if (!repoName || !codeContext) {
        res.status(400).json({ error: 'Repository name and code context are required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this repository and produce an engineering-grade security Threat Model for Aardvark.
Repository: ${repoName}
Primary Language: ${language || 'TypeScript'}
Architecture Notes: ${architectureNotes || 'Web service / API backend'}
Commit Reference: ${commitSha || 'HEAD'}

Source Context:
${codeContext}

Return a structured threat model capturing security objectives, sensitive assets & trust boundaries, and concrete attack vectors.`,
        config: {
          systemInstruction:
            'You are Aardvark Analysis Engine. Produce concise, technically accurate threat models reflecting the repository design, trust boundaries, and security objectives.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              architectureOverview: { type: Type.STRING },
              securityObjectives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    criticality: { type: Type.STRING },
                  },
                  required: ['id', 'title', 'description', 'criticality'],
                },
              },
              assets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    entryPoint: { type: Type.STRING },
                    trustBoundary: { type: Type.STRING },
                    ownerModule: { type: Type.STRING },
                  },
                  required: ['id', 'name', 'type', 'entryPoint', 'trustBoundary', 'ownerModule'],
                },
              },
              attackVectors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    vectorName: { type: Type.STRING },
                    targetBoundary: { type: Type.STRING },
                    cweCategory: { type: Type.STRING },
                    mitigationExpectation: { type: Type.STRING },
                    riskLevel: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'vectorName',
                    'targetBoundary',
                    'cweCategory',
                    'mitigationExpectation',
                    'riskLevel',
                  ],
                },
              },
            },
            required: [
              'summary',
              'architectureOverview',
              'securityObjectives',
              'assets',
              'attackVectors',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        threatModel: {
          ...parsed,
          lastAnalyzedCommit: commitSha || 'a1b2c3d',
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  // Stages 2, 3, 4: Commit Scanning against Threat Model -> Sandbox Validation -> Codex Patch
  app.post('/api/aardvark/scan-commit', async (req, res) => {
    try {
      const {
        repoName,
        language,
        threatModelSummary,
        commitMessage,
        author,
        filePath,
        diffContent,
      } = req.body as {
        repoName?: string;
        language?: string;
        threatModelSummary?: string;
        commitMessage?: string;
        author?: string;
        filePath?: string;
        diffContent?: string;
      };

      if (!diffContent || !filePath) {
        res.status(400).json({ error: 'File path and code or diff content are required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Run Aardvark's multi-stage pipeline on the following commit diff.
Repository: ${repoName || 'custom/repository'}
Language: ${language || 'TypeScript'}
Threat Model Context: ${threatModelSummary || 'Standard web API trust boundaries, tenant isolation, input sanitization, and secret protection.'}
Commit Message: ${commitMessage || 'feat: update request handler'}
Author: ${author || 'developer'}
File Path: ${filePath}

Code / Commit Diff:
${diffContent}

Instructions:
1. Commit Scanning: Inspect the diff against the repository threat model. If a real security vulnerability exists, explain it step-by-step and anchor line-level annotations to the 1-indexed lines of the provided snippet. If the code is secure, set hasVulnerability to false and explain why it satisfies the threat model.
2. Validation: Design an isolated sandboxed environment reproduction, exact payload, execution trace lines, and determine whether exploitability is confirmed (confirmedExploitable: true/false).
3. Patching: Generate a clean Codex-style remediation patch as structured diffLines (type: 'context' | 'removed' | 'added') and list Aardvark post-patch verification checks confirming no regressions.`,
        config: {
          systemInstruction:
            'You are Aardvark, an autonomous multi-stage security pipeline (Commit Scanning, Sandboxed Validation, Codex Patching). Be precise, low-false-positive, and technically rigorous.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasVulnerability: { type: Type.BOOLEAN },
              cleanSummary: { type: Type.STRING },
              finding: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  cweId: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  vulnerableLines: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  summary: { type: Type.STRING },
                  threatModelAlignment: { type: Type.STRING },
                  stepByStepExplanation: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  annotations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        lineNumber: { type: Type.INTEGER },
                        stepIndex: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                      },
                      required: ['lineNumber', 'stepIndex', 'title', 'explanation'],
                    },
                  },
                  validation: {
                    type: Type.OBJECT,
                    properties: {
                      environmentSpec: {
                        type: Type.OBJECT,
                        properties: {
                          runtime: { type: Type.STRING },
                          isolation: { type: Type.STRING },
                          networkPolicy: { type: Type.STRING },
                          seedState: { type: Type.STRING },
                        },
                        required: ['runtime', 'isolation', 'networkPolicy', 'seedState'],
                      },
                      reproductionSteps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      payload: { type: Type.STRING },
                      executionTrace: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      outcome: { type: Type.STRING },
                      confirmedExploitable: { type: Type.BOOLEAN },
                      durationMs: { type: Type.INTEGER },
                    },
                    required: [
                      'environmentSpec',
                      'reproductionSteps',
                      'payload',
                      'executionTrace',
                      'outcome',
                      'confirmedExploitable',
                      'durationMs',
                    ],
                  },
                  patch: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING },
                      diffLines: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: { type: Type.STRING },
                            oldLine: { type: Type.INTEGER },
                            newLine: { type: Type.INTEGER },
                            content: { type: Type.STRING },
                          },
                          required: ['type', 'content'],
                        },
                      },
                      aardvarkVerificationChecks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            checkName: { type: Type.STRING },
                            detail: { type: Type.STRING },
                            passed: { type: Type.BOOLEAN },
                          },
                          required: ['checkName', 'detail', 'passed'],
                        },
                      },
                    },
                    required: ['summary', 'diffLines', 'aardvarkVerificationChecks'],
                  },
                },
                required: [
                  'title',
                  'cweId',
                  'severity',
                  'vulnerableLines',
                  'summary',
                  'threatModelAlignment',
                  'stepByStepExplanation',
                  'annotations',
                  'validation',
                  'patch',
                ],
              },
            },
            required: ['hasVulnerability', 'cleanSummary'],
          },
        },
      });

      const result = JSON.parse((response.text ?? '{}').trim());
      const sha = Math.random().toString(16).substring(2, 9);
      const rawLines = diffContent.split('\n');
      const codeLines = rawLines.map((line: string, idx: number) => {
        const lineNum = idx + 1;
        const isVuln = result.finding?.vulnerableLines?.includes(lineNum);
        const trimmed = line.trimStart();
        const kind = isVuln
          ? 'vulnerable'
          : trimmed.startsWith('+') && !trimmed.startsWith('+++')
          ? 'added'
          : trimmed.startsWith('-') && !trimmed.startsWith('---')
          ? 'removed'
          : 'context';
        return {
          lineNumber: lineNum,
          content: line,
          kind,
        };
      });

      if (!result.hasVulnerability || !result.finding) {
        res.json({
          hasVulnerability: false,
          cleanSummary: result.cleanSummary || 'No threat-model violations detected in commit diff.',
          commitRecord: {
            sha,
            message: commitMessage || 'feat: commit scan',
            author: author || 'engineer',
            timestamp: new Date().toISOString(),
            filesChanged: 1,
            scanType: 'Commit Hook',
            status: 'Clean',
            findingsCount: 0,
          },
        });
        return;
      }

      const confirmed = Boolean(result.finding.validation?.confirmedExploitable);
      const normalizedSeverity = ['Critical', 'High', 'Medium', 'Low'].includes(result.finding.severity)
        ? result.finding.severity
        : 'High';

      const finding = {
        id: `ADV-${sha.toUpperCase()}`,
        title: result.finding.title,
        cweId: result.finding.cweId,
        severity: normalizedSeverity,
        status: confirmed ? 'Confirmed' : 'False Positive',
        commitSha: sha,
        filePath,
        vulnerableLines: result.finding.vulnerableLines || [],
        summary: result.finding.summary,
        threatModelAlignment: result.finding.threatModelAlignment,
        stepByStepExplanation: result.finding.stepByStepExplanation || [],
        codeLines,
        annotations: result.finding.annotations || [],
        validation: {
          ...result.finding.validation,
          validatedAt: new Date().toISOString(),
        },
        patch: {
          patchId: `CDX-${sha.toUpperCase()}`,
          engine: 'Codex + Aardvark Verify',
          summary: result.finding.patch?.summary || 'Applied remediation patch.',
          diffLines: result.finding.patch?.diffLines || [],
          aardvarkVerificationChecks: result.finding.patch?.aardvarkVerificationChecks || [],
          applied: false,
        },
      };

      res.json({
        hasVulnerability: true,
        cleanSummary: result.cleanSummary || '',
        commitRecord: {
          sha,
          message: commitMessage || 'feat: commit scan',
          author: author || 'engineer',
          timestamp: new Date().toISOString(),
          filesChanged: 1,
          scanType: 'Commit Hook',
          status: confirmed ? 'Issues Found' : 'False Positive Filtered',
          findingsCount: confirmed ? 1 : 0,
        },
        finding,
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  // Stage 3: Re-run or test custom payload in isolated sandbox
  app.post('/api/aardvark/validate', async (req, res) => {
    try {
      const { title, filePath, codeSnippet, customPayload } = req.body as {
        title?: string;
        filePath?: string;
        codeSnippet?: string;
        customPayload?: string;
      };

      if (!codeSnippet || !title) {
        res.status(400).json({ error: 'Finding title and code snippet are required for sandbox validation.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Execute Aardvark Stage 3 Sandboxed Validation on this potential vulnerability.
Finding: ${title}
File: ${filePath || 'unknown'}
Test Payload Override: ${customPayload || 'Synthesize minimal deterministic proof-of-concept trigger payload'}

Code under test:
${codeSnippet}

Determine realistically whether the payload triggers the vulnerability inside an isolated sandbox, and produce exact reproduction steps, trace lines, and outcome.`,
        config: {
          systemInstruction:
            'You are Aardvark Sandboxed Validation Engine. Accurately distinguish true exploitability from defensive guards to eliminate false positives.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              environmentSpec: {
                type: Type.OBJECT,
                properties: {
                  runtime: { type: Type.STRING },
                  isolation: { type: Type.STRING },
                  networkPolicy: { type: Type.STRING },
                  seedState: { type: Type.STRING },
                },
                required: ['runtime', 'isolation', 'networkPolicy', 'seedState'],
              },
              reproductionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              payload: { type: Type.STRING },
              executionTrace: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              outcome: { type: Type.STRING },
              confirmedExploitable: { type: Type.BOOLEAN },
              durationMs: { type: Type.INTEGER },
            },
            required: [
              'environmentSpec',
              'reproductionSteps',
              'payload',
              'executionTrace',
              'outcome',
              'confirmedExploitable',
              'durationMs',
            ],
          },
        },
      });

      const validation = JSON.parse((response.text ?? '{}').trim());
      res.json({
        validation: {
          ...validation,
          validatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  // Stage 4: Regenerate Codex-style patch with optional human guidance
  app.post('/api/aardvark/regenerate-patch', async (req, res) => {
    try {
      const { title, cweId, filePath, codeSnippet, guidance } = req.body as {
        title?: string;
        cweId?: string;
        filePath?: string;
        codeSnippet?: string;
        guidance?: string;
      };

      if (!codeSnippet || !title) {
        res.status(400).json({ error: 'Finding details and code snippet are required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Synthesize an updated Codex-generated security patch and run Aardvark post-patch verification checks.
Vulnerability: ${title} (${cweId || 'CWE'})
File: ${filePath || 'source'}
Engineer Guidance: ${guidance || 'Provide the cleanest, idiomatic defensive fix preserving existing API behavior.'}

Vulnerable Code:
${codeSnippet}`,
        config: {
          systemInstruction:
            'You are the Codex + Aardvark Patching Engine. Generate minimal, production-safe diffs and verify them against security invariants.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              diffLines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    oldLine: { type: Type.INTEGER },
                    newLine: { type: Type.INTEGER },
                    content: { type: Type.STRING },
                  },
                  required: ['type', 'content'],
                },
              },
              aardvarkVerificationChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    checkName: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                  },
                  required: ['checkName', 'detail', 'passed'],
                },
              },
            },
            required: ['summary', 'diffLines', 'aardvarkVerificationChecks'],
          },
        },
      });

      const patchData = JSON.parse((response.text ?? '{}').trim());
      res.json({
        patch: {
          patchId: `CDX-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
          engine: 'Codex + Aardvark Verify',
          summary: patchData.summary,
          diffLines: patchData.diffLines || [],
          aardvarkVerificationChecks: patchData.aardvarkVerificationChecks || [],
          applied: false,
        },
      });
    } catch (err) {
      handleGeminiError(err, res);
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        ws: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (isHmrDisabled) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }

    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Aardvark server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Aardvark server:', err);
  process.exit(1);
});
