import type { RepositoryProject } from '../types/aardvark';

export const INITIAL_REPOSITORIES: RepositoryProject[] = [
  {
    id: 'mastercard-mcp-server',
    owner: 'acme',
    name: 'mastercard-mcp-server',
    language: 'TypeScript',
    defaultBranch: 'main',
    connectedAt: '2026-11-18T04:28:00Z',
    summary:
      'Model Context Protocol (MCP) stdio server wrapping @mastercard/developers-agent-toolkit/mcp for AI host tool execution against Mastercard Developers APIs.',
    threatModel: {
      summary:
        'MCP tool-bridge boundary. Untrusted prompt-derived tool arguments cross from an external LLM host over stdin JSON-RPC into authenticated Mastercard API client calls.',
      architectureOverview:
        'Node.js CLI process communicating via StdioServerTransport over stdin/stdout JSON-RPC while logging diagnostics strictly to stderr and dispatching signed Mastercard API requests.',
      lastAnalyzedCommit: 'c7a19e4',
      analyzedAt: '2026-11-18T04:30:00Z',
      securityObjectives: [
        {
          id: 'OBJ-1',
          title: 'Least-Privilege MCP Tool & Environment Scoping',
          description:
            'MastercardDevelopersAgentToolkit must explicitly bind validated credentials, environment mode (sandbox vs production), and an allowlisted subset of read/write tools rather than passing an unconstrained empty configuration.',
          criticality: 'Core',
        },
        {
          id: 'OBJ-2',
          title: 'Clean JSON-RPC Stdio Framing',
          description:
            'Diagnostic logs must never write to stdout so JSON-RPC protocol framing cannot be corrupted by operational output.',
          criticality: 'Standard',
        },
      ],
      assets: [
        {
          id: 'AST-1',
          name: 'Mastercard API Signing Credentials',
          type: 'OAuth 1.0a Consumer Key & P12 Keystore',
          entryPoint: 'src/index.ts',
          trustBoundary: 'Environment Secrets -> Toolkit Initialization',
          ownerModule: 'mcp-bootstrap',
        },
        {
          id: 'AST-2',
          name: 'Mastercard Developers Tool Surface',
          type: 'MCP Registered Tools',
          entryPoint: 'StdioServerTransport (stdin)',
          trustBoundary: 'LLM Host Client -> Mastercard API Dispatch',
          ownerModule: 'agent-toolkit',
        },
      ],
      attackVectors: [
        {
          id: 'VEC-1',
          vectorName: 'Unconstrained Toolkit Config & Unvalidated Credentials',
          targetBoundary: 'Environment Secrets -> Toolkit Initialization',
          cweCategory: 'CWE-1188',
          mitigationExpectation:
            'Pass explicit validated configuration (API spec/tool allowlist, environment, and credentials check) instead of an empty {} object.',
          riskLevel: 'High',
        },
        {
          id: 'VEC-2',
          vectorName: 'Prompt-Injected Destructive Tool Invocation',
          targetBoundary: 'LLM Host Client -> Mastercard API Dispatch',
          cweCategory: 'CWE-284',
          mitigationExpectation:
            'Restrict exposed MCP tools to explicitly approved operations and fail closed if required environment variables are missing.',
          riskLevel: 'High',
        },
      ],
    },
    commits: [
      {
        sha: 'c7a19e4',
        message: 'feat(mcp): initialize MastercardDevelopersAgentToolkit with stdio transport',
        author: 's.park',
        timestamp: '2026-11-18T04:29:00Z',
        filesChanged: 1,
        scanType: 'Commit Hook',
        status: 'Issues Found',
        findingsCount: 1,
      },
    ],
    findings: [
      {
        id: 'ADV-4001',
        title: 'Unconstrained Toolkit Initialization & Missing Credential/Scope Guard',
        cweId: 'CWE-1188',
        severity: 'High',
        status: 'Confirmed',
        commitSha: 'c7a19e4',
        filePath: 'src/index.ts',
        vulnerableLines: [4, 7, 8],
        summary:
          'MastercardDevelopersAgentToolkit({}) is instantiated with an empty configuration object and connected to StdioServerTransport without verifying required credentials or constraining exposed API tool scopes.',
        threatModelAlignment:
          'Violates OBJ-1 (Least-Privilege MCP Tool & Environment Scoping) at Environment Secrets -> Toolkit Initialization and LLM Host Client -> Mastercard API Dispatch.',
        stepByStepExplanation: [
          'Line 4 instantiates MastercardDevelopersAgentToolkit({}) with an empty config object, relying on implicit defaults rather than explicit service/tool allowlists or environment bounds.',
          'main() binds StdioServerTransport immediately without validating required Mastercard API key/keystore environment variables or registering SIGINT/SIGTERM transport teardown.',
          'Note: Line 9 uses console.error(...) rather than console.log(...), which correctly preserves stdout exclusively for JSON-RPC MCP frames (satisfying OBJ-2).',
        ],
        codeLines: [
          { lineNumber: 1, content: 'import { MastercardDevelopersAgentToolkit } from "@mastercard/developers-agent-toolkit/mcp";', kind: 'context' },
          { lineNumber: 2, content: 'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";', kind: 'context' },
          { lineNumber: 3, content: '', kind: 'context' },
          { lineNumber: 4, content: 'const server = new MastercardDevelopersAgentToolkit({});', kind: 'vulnerable' },
          { lineNumber: 5, content: '', kind: 'context' },
          { lineNumber: 6, content: 'async function main() {', kind: 'context' },
          { lineNumber: 7, content: '  const transport = new StdioServerTransport();', kind: 'vulnerable' },
          { lineNumber: 8, content: '  await server.connect(transport);', kind: 'vulnerable' },
          { lineNumber: 9, content: '  console.error("Mastercard Developers MCP Server running on stdio");', kind: 'context' },
          { lineNumber: 10, content: '}', kind: 'context' },
          { lineNumber: 11, content: '', kind: 'context' },
          { lineNumber: 12, content: 'main().catch((error) => {', kind: 'context' },
          { lineNumber: 13, content: '  console.error("Fatal error in main():", error);', kind: 'context' },
          { lineNumber: 14, content: '  process.exit(1);', kind: 'context' },
          { lineNumber: 15, content: '});', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 4,
            stepIndex: 1,
            title: 'Empty Toolkit Configuration Object',
            explanation:
              'Passing {} leaves service specifications, environment targeting, and tool scopes unconfigured; explicit configuration and credential assertions should fail closed at startup.',
          },
          {
            lineNumber: 8,
            stepIndex: 2,
            title: 'Unchecked Transport Startup & Missing Signal Cleanup',
            explanation:
              'Server begins accepting JSON-RPC tool calls over stdin immediately without verifying runtime secrets or closing the transport cleanly on SIGINT/SIGTERM.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Node.js 22.14.0 / MCP SDK Stdio',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-5510)',
            networkPolicy: 'Egress blocked; loopback stdio pipe harness',
            seedState: 'Empty process.env (no Mastercard credentials configured)',
          },
          reproductionSteps: [
            'Spawn MCP server process in isolated sandbox without Mastercard API credentials.',
            'Send JSON-RPC initialize and tools/call request over stdin.',
            'Inspect startup failure behavior, tool exposure, and stdout framing purity.',
          ],
          payload:
            '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"aardvark-probe","version":"1.0"}}}',
          executionTrace: [
            '[sbx] Spawned node src/index.ts with empty config {}',
            '[sbx] stderr: "Mastercard Developers MCP Server running on stdio"',
            '[sbx] stdout received valid JSON-RPC initialize response (stdout framing clean)',
            '[sbx] Server accepted client session despite missing credential & tool-scope configuration',
            '[assert] Unconstrained MCP server bootstrapped without fail-closed env/scope guard -> FINDING CONFIRMED',
          ],
          outcome:
            'Confirmed configuration weakness: MCP server binds stdio and accepts tool sessions with empty {} configuration and unvalidated credentials.',
          confirmedExploitable: true,
          validatedAt: '2026-11-18T04:30:10Z',
          durationMs: 184,
        },
        patch: {
          patchId: 'CDX-5210',
          engine: 'Codex + Aardvark Verify',
          summary:
            'Rewrite main() to validate credentials, initialize transport and server inside the async lifecycle, await server.connect(transport) with cleanup on failure, and handle SIGINT/SIGTERM/stdin shutdown idempotently.',
          diffLines: [
            { type: 'context', oldLine: 1, newLine: 1, content: 'import { MastercardDevelopersAgentToolkit } from "@mastercard/developers-agent-toolkit/mcp";' },
            { type: 'context', oldLine: 2, newLine: 2, content: 'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";' },
            { type: 'context', oldLine: 3, newLine: 3, content: '' },
            { type: 'added', newLine: 4, content: 'function requireEnv(name: string): string {' },
            { type: 'added', newLine: 5, content: '  const value = process.env[name]?.trim();' },
            { type: 'added', newLine: 6, content: '  if (!value) throw new Error(`Missing required environment variable: ${name}`);' },
            { type: 'added', newLine: 7, content: '  return value;' },
            { type: 'added', newLine: 8, content: '}' },
            { type: 'added', newLine: 9, content: '' },
            { type: 'removed', oldLine: 4, content: 'const server = new MastercardDevelopersAgentToolkit({});' },
            { type: 'context', oldLine: 5, newLine: 10, content: '' },
            { type: 'context', oldLine: 6, newLine: 11, content: 'async function main() {' },
            { type: 'added', newLine: 12, content: '  const consumerKey = requireEnv("MASTERCARD_CONSUMER_KEY");' },
            { type: 'added', newLine: 13, content: '  const keyStorePath = requireEnv("MASTERCARD_KEYSTORE_PATH");' },
            { type: 'added', newLine: 14, content: '  const server = new MastercardDevelopersAgentToolkit({' },
            { type: 'added', newLine: 15, content: '    consumerKey,' },
            { type: 'added', newLine: 16, content: '    keyStorePath,' },
            { type: 'added', newLine: 17, content: '    environment: process.env.MASTERCARD_ENV === "production" ? "production" : "sandbox",' },
            { type: 'added', newLine: 18, content: '  });' },
            { type: 'context', oldLine: 7, newLine: 19, content: '  const transport = new StdioServerTransport();' },
            { type: 'added', newLine: 20, content: '  let isShuttingDown = false;' },
            { type: 'added', newLine: 21, content: '' },
            { type: 'added', newLine: 22, content: '  const shutdown = async (signal: string) => {' },
            { type: 'added', newLine: 23, content: '    if (isShuttingDown) return;' },
            { type: 'added', newLine: 24, content: '    isShuttingDown = true;' },
            { type: 'added', newLine: 25, content: '    process.off("SIGINT", onSigInt);' },
            { type: 'added', newLine: 26, content: '    process.off("SIGTERM", onSigTerm);' },
            { type: 'added', newLine: 27, content: '    console.error(`Received ${signal}; shutting down Mastercard MCP Server...`);' },
            { type: 'added', newLine: 28, content: '    const results = await Promise.allSettled([server.close(), transport.close()]);' },
            { type: 'added', newLine: 29, content: '    const failed = results.find((r) => r.status === "rejected");' },
            { type: 'added', newLine: 30, content: '    if (failed && failed.status === "rejected") {' },
            { type: 'added', newLine: 31, content: '      console.error("Error during shutdown:", failed.reason);' },
            { type: 'added', newLine: 32, content: '      process.exit(1);' },
            { type: 'added', newLine: 33, content: '    }' },
            { type: 'added', newLine: 34, content: '    process.exit(0);' },
            { type: 'added', newLine: 35, content: '  };' },
            { type: 'added', newLine: 36, content: '  const onSigInt = () => void shutdown("SIGINT");' },
            { type: 'added', newLine: 37, content: '  const onSigTerm = () => void shutdown("SIGTERM");' },
            { type: 'added', newLine: 38, content: '  process.once("SIGINT", onSigInt);' },
            { type: 'added', newLine: 39, content: '  process.once("SIGTERM", onSigTerm);' },
            { type: 'added', newLine: 40, content: '  transport.onerror = (err) => console.error("Transport error:", err);' },
            { type: 'added', newLine: 41, content: '  transport.onclose = () => void shutdown("transport-close");' },
            { type: 'added', newLine: 42, content: '' },
            { type: 'added', newLine: 43, content: '  try {' },
            { type: 'removed', oldLine: 8, content: '  await server.connect(transport);' },
            { type: 'added', newLine: 44, content: '    await server.connect(transport);' },
            { type: 'context', oldLine: 9, newLine: 45, content: '  console.error("Mastercard Developers MCP Server running on stdio");' },
            { type: 'added', newLine: 46, content: '  } catch (err) {' },
            { type: 'added', newLine: 47, content: '    process.off("SIGINT", onSigInt);' },
            { type: 'added', newLine: 48, content: '    process.off("SIGTERM", onSigTerm);' },
            { type: 'added', newLine: 49, content: '    await transport.close().catch(() => {});' },
            { type: 'added', newLine: 50, content: '    throw err;' },
            { type: 'added', newLine: 51, content: '  }' },
            { type: 'context', oldLine: 10, newLine: 52, content: '}' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'Fail-Closed Startup Without Credentials',
              detail: 'Replayed empty-env sandbox boot; process exited cleanly with explicit Missing required environment variable error before binding stdio.',
              passed: true,
            },
            {
              checkName: 'Graceful SIGINT / SIGTERM Lifecycle Verified',
              detail: 'Sent SIGTERM during active session; server.close() and transport.close() awaited idempotently and exited with code 0.',
              passed: true,
            },
            {
              checkName: 'Stdout JSON-RPC Purity Preserved',
              detail: 'Verified all lifecycle and error logs write exclusively to stderr while transport binds cleanly.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
    ],
    sampleIncomingCommits: [
      {
        id: 'sample-mcp-stdout',
        commitMessage: 'chore(mcp): log incoming tool arguments for debugging',
        author: 's.park',
        filePath: 'src/index.ts',
        diffContent: `async function main() {
  const transport = new StdioServerTransport();
  console.log("Connected transport:", process.env.MASTERCARD_CONSUMER_KEY);
  await server.connect(transport);
}`,
      },
    ],
  },
  {
    id: 'payments-gateway',
    owner: 'acme',
    name: 'payments-gateway',
    language: 'TypeScript',
    defaultBranch: 'main',
    connectedAt: '2026-11-12T09:14:00Z',
    summary:
      'Multi-tenant payment orchestration service handling Stripe/ACH settlement webhooks, idempotent ledger writes, and merchant payout callbacks.',
    threatModel: {
      summary:
        'High-sensitivity financial boundary service. Untrusted external webhook payloads and merchant configuration inputs cross into internal ledger state and outbound callback workers.',
      architectureOverview:
        'Express REST API sitting behind an API gateway, backed by PostgreSQL ledger tables and an asynchronous settlement worker dispatching HTTP callbacks to merchant endpoints.',
      lastAnalyzedCommit: 'f8c2a19',
      analyzedAt: '2026-11-18T03:40:00Z',
      securityObjectives: [
        {
          id: 'OBJ-1',
          title: 'Cryptographic Webhook Authenticity',
          description:
            'Every inbound payment processor webhook must pass constant-time HMAC-SHA256 verification before mutating ledger balances or payout statuses.',
          criticality: 'Core',
        },
        {
          id: 'OBJ-2',
          title: 'Strict Tenant & Ledger Isolation',
          description:
            'Merchant queries and balance adjustments must enforce parameterized SQL predicates scoped by verified tenant_id.',
          criticality: 'Core',
        },
        {
          id: 'OBJ-3',
          title: 'Outbound Egress Containment',
          description:
            'Merchant-configured settlement callback URLs must never resolve to link-local metadata endpoints or RFC1918 internal services.',
          criticality: 'Elevated',
        },
      ],
      assets: [
        {
          id: 'AST-1',
          name: 'Settlement Ledger DB',
          type: 'PostgreSQL Table',
          entryPoint: 'src/routes/ledger.ts',
          trustBoundary: 'API Service -> Ledger Persistence',
          ownerModule: 'ledger-core',
        },
        {
          id: 'AST-2',
          name: 'Webhook Signing Secret',
          type: 'HMAC Key Material',
          entryPoint: 'src/middleware/verifyWebhook.ts',
          trustBoundary: 'Public Internet -> Webhook Ingress',
          ownerModule: 'ingress-auth',
        },
        {
          id: 'AST-3',
          name: 'Cloud Instance Metadata & VPC Services',
          type: 'Internal Network Target',
          entryPoint: 'src/workers/payoutNotifier.ts',
          trustBoundary: 'Worker Egress -> VPC Internal',
          ownerModule: 'payout-worker',
        },
      ],
      attackVectors: [
        {
          id: 'VEC-1',
          vectorName: 'Forged Webhook Signature Acceptance',
          targetBoundary: 'Public Internet -> Webhook Ingress',
          cweCategory: 'CWE-347',
          mitigationExpectation:
            'Reject missing signatures, require timestamp tolerance <= 300s, and compare digests with crypto.timingSafeEqual.',
          riskLevel: 'Critical',
        },
        {
          id: 'VEC-2',
          vectorName: 'Dynamic SQL Order/Filter Injection',
          targetBoundary: 'API Service -> Ledger Persistence',
          cweCategory: 'CWE-89',
          mitigationExpectation:
            'Allowlist sortable columns and bind all user-supplied filter values as positional SQL parameters.',
          riskLevel: 'Critical',
        },
        {
          id: 'VEC-3',
          vectorName: 'Server-Side Request Forgery on Callback Dispatch',
          targetBoundary: 'Worker Egress -> VPC Internal',
          cweCategory: 'CWE-918',
          mitigationExpectation:
            'Resolve DNS prior to socket connection, block private/loopback/link-local CIDRs, and disable HTTP redirects.',
          riskLevel: 'High',
        },
      ],
    },
    commits: [
      {
        sha: 'f8c2a19',
        message: 'feat(webhooks): support dual signature header fallback for legacy partners',
        author: 'm.chen',
        timestamp: '2026-11-18T03:38:00Z',
        filesChanged: 2,
        scanType: 'Commit Hook',
        status: 'Issues Found',
        findingsCount: 1,
      },
      {
        sha: 'd41e90b',
        message: 'perf(ledger): add dynamic sort column on merchant settlement export',
        author: 'r.patel',
        timestamp: '2026-11-17T18:12:00Z',
        filesChanged: 3,
        scanType: 'History Scan',
        status: 'Issues Found',
        findingsCount: 1,
      },
      {
        sha: '9a04c71',
        message: 'feat(payouts): dispatch webhook callback when settlement completes',
        author: 'k.sato',
        timestamp: '2026-11-15T11:04:00Z',
        filesChanged: 4,
        scanType: 'History Scan',
        status: 'Issues Found',
        findingsCount: 1,
      },
      {
        sha: '71b832e',
        message: 'chore(deps): bump pg-pool and enforce idle timeout',
        author: 'm.chen',
        timestamp: '2026-11-14T15:20:00Z',
        filesChanged: 2,
        scanType: 'History Scan',
        status: 'Clean',
        findingsCount: 0,
      },
    ],
    findings: [
      {
        id: 'ADV-1042',
        title: 'Webhook Signature Verification Bypass via Empty Header Fallback',
        cweId: 'CWE-347',
        severity: 'Critical',
        status: 'Confirmed',
        commitSha: 'f8c2a19',
        filePath: 'src/middleware/verifyWebhook.ts',
        vulnerableLines: [12, 13, 14, 15],
        summary:
          'A newly introduced legacy header fallback short-circuits HMAC validation when x-legacy-partner is set without a signature header, allowing unauthenticated settlement forgery.',
        threatModelAlignment:
          'Violates OBJ-1 (Cryptographic Webhook Authenticity) at trust boundary Public Internet -> Webhook Ingress.',
        stepByStepExplanation: [
          'Commit f8c2a19 added a branch checking req.headers["x-legacy-partner"] before validating x-acme-signature.',
          'When x-legacy-partner is present and x-acme-signature is omitted, signature is undefined, causing the early conditional to skip verifyHmacDigest().',
          'Because next() is invoked unconditionally after the conditional block, any forged settlement JSON reaches POST /webhooks/settlement and credits merchant balances.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'import crypto from "node:crypto";', kind: 'context' },
          { lineNumber: 2, content: 'import type { Request, Response, NextFunction } from "express";', kind: 'context' },
          { lineNumber: 3, content: '', kind: 'context' },
          { lineNumber: 4, content: 'export function verifyWebhook(req: Request, res: Response, next: NextFunction) {', kind: 'context' },
          { lineNumber: 5, content: '  const secret = process.env.WEBHOOK_SECRET ?? "";', kind: 'context' },
          { lineNumber: 6, content: '  const signature = req.header("x-acme-signature");', kind: 'context' },
          { lineNumber: 7, content: '  const legacyPartner = req.header("x-legacy-partner");', kind: 'added' },
          { lineNumber: 8, content: '', kind: 'context' },
          { lineNumber: 9, content: '  if (!signature && !legacyPartner) {', kind: 'added' },
          { lineNumber: 10, content: '    return res.status(401).json({ error: "Missing webhook signature" });', kind: 'context' },
          { lineNumber: 11, content: '  }', kind: 'context' },
          { lineNumber: 12, content: '  if (legacyPartner && !signature) {', kind: 'vulnerable' },
          { lineNumber: 13, content: '    // Legacy partners send payload hash inside body metadata', kind: 'vulnerable' },
          { lineNumber: 14, content: '    return next();', kind: 'vulnerable' },
          { lineNumber: 15, content: '  }', kind: 'vulnerable' },
          { lineNumber: 16, content: '  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");', kind: 'context' },
          { lineNumber: 17, content: '  if (signature !== expected) {', kind: 'context' },
          { lineNumber: 18, content: '    return res.status(401).json({ error: "Invalid signature" });', kind: 'context' },
          { lineNumber: 19, content: '  }', kind: 'context' },
          { lineNumber: 20, content: '  return next();', kind: 'context' },
          { lineNumber: 21, content: '}', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 9,
            stepIndex: 1,
            title: 'Permissive Guard Condition',
            explanation:
              'Accepting x-legacy-partner as a substitute for x-acme-signature lets an attacker pass the initial missing-signature check.',
          },
          {
            lineNumber: 14,
            stepIndex: 2,
            title: 'Unauthenticated Bypass to next()',
            explanation:
              'Control returns next() immediately without verifying any cryptographic MAC, granting full settlement webhook access.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Node.js 22.14.0 / Express 4.21',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-8812)',
            networkPolicy: 'Loopback only; external egress blocked',
            seedState: 'PostgreSQL snapshot with merchant_id=m_991 (balance: $0.00)',
          },
          reproductionSteps: [
            'Boot isolated payments-gateway container with WEBHOOK_SECRET configured.',
            'Craft POST /webhooks/settlement with forged body {"merchantId":"m_991","amountCents":500000,"status":"settled"}.',
            'Omit x-acme-signature header and attach arbitrary header x-legacy-partner: true.',
            'Assert HTTP response status and query ledger balance for m_991.',
          ],
          payload:
            'curl -X POST http://127.0.0.1:3000/webhooks/settlement -H "Content-Type: application/json" -H "x-legacy-partner: partner_v1" -d \'{"merchantId":"m_991","amountCents":500000,"status":"settled"}\'',
          executionTrace: [
            '[sbx] POST /webhooks/settlement -> verifyWebhook middleware',
            '[sbx] header x-acme-signature = undefined, x-legacy-partner = "partner_v1"',
            '[sbx] branch (legacyPartner && !signature) matched at verifyWebhook.ts:12 -> next()',
            '[sbx] handler creditMerchantLedger("m_991", 500000) executed',
            '[sbx] HTTP 200 OK {"credited":true,"newBalanceCents":500000}',
            '[assert] Ledger balance mutated from 0 to 500000 without HMAC secret -> EXPLOIT CONFIRMED',
          ],
          outcome: 'Confirmed exploitable: unauthenticated caller credited $5,000.00 to merchant ledger.',
          confirmedExploitable: true,
          validatedAt: '2026-11-18T03:39:12Z',
          durationMs: 412,
        },
        patch: {
          patchId: 'CDX-4901',
          engine: 'Codex + Aardvark Verify',
          summary:
            'Remove unauthenticated legacyPartner bypass, enforce constant-time HMAC comparison via crypto.timingSafeEqual, and require legacy partner signature header verification.',
          diffLines: [
            { type: 'context', oldLine: 5, newLine: 5, content: '  const secret = process.env.WEBHOOK_SECRET ?? "";' },
            { type: 'context', oldLine: 6, newLine: 6, content: '  const signature = req.header("x-acme-signature");' },
            { type: 'removed', oldLine: 7, content: '  const legacyPartner = req.header("x-legacy-partner");' },
            { type: 'context', oldLine: 8, newLine: 7, content: '' },
            { type: 'removed', oldLine: 9, content: '  if (!signature && !legacyPartner) {' },
            { type: 'added', newLine: 8, content: '  if (!signature || !secret) {' },
            { type: 'context', oldLine: 10, newLine: 9, content: '    return res.status(401).json({ error: "Missing webhook signature" });' },
            { type: 'context', oldLine: 11, newLine: 10, content: '  }' },
            { type: 'removed', oldLine: 12, content: '  if (legacyPartner && !signature) {' },
            { type: 'removed', oldLine: 13, content: '    // Legacy partners send payload hash inside body metadata' },
            { type: 'removed', oldLine: 14, content: '    return next();' },
            { type: 'removed', oldLine: 15, content: '  }' },
            { type: 'removed', oldLine: 16, content: '  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");' },
            { type: 'removed', oldLine: 17, content: '  if (signature !== expected) {' },
            { type: 'added', newLine: 11, content: '  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);' },
            { type: 'added', newLine: 12, content: '  const expectedBuf = crypto.createHmac("sha256", secret).update(rawBody).digest();' },
            { type: 'added', newLine: 13, content: '  const providedBuf = Buffer.from(signature, "hex");' },
            { type: 'added', newLine: 14, content: '  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {' },
            { type: 'context', oldLine: 18, newLine: 15, content: '    return res.status(401).json({ error: "Invalid signature" });' },
            { type: 'context', oldLine: 19, newLine: 16, content: '  }' },
            { type: 'context', oldLine: 20, newLine: 17, content: '  return next();' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'Sandbox Exploit Replay',
              detail: 'Replayed x-legacy-partner bypass payload against patched container; returned HTTP 401 and 0 ledger mutations.',
              passed: true,
            },
            {
              checkName: 'Timing-Safe Digest Comparison',
              detail: 'Verified Buffer length check precedes crypto.timingSafeEqual to prevent range errors or timing side-channels.',
              passed: true,
            },
            {
              checkName: 'Threat Model OBJ-1 Alignment',
              detail: 'All paths to POST /webhooks/settlement now require valid HMAC-SHA256 verification.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
      {
        id: 'ADV-1039',
        title: 'SQL Injection via Unvalidated sortBy Query Parameter in Ledger Export',
        cweId: 'CWE-89',
        severity: 'Critical',
        status: 'Confirmed',
        commitSha: 'd41e90b',
        filePath: 'src/routes/ledger.ts',
        vulnerableLines: [9, 10],
        summary:
          'User-controlled req.query.sortBy is interpolated directly into an ORDER BY SQL clause, enabling stacked or boolean-based data exfiltration across merchant tenants.',
        threatModelAlignment:
          'Violates OBJ-2 (Strict Tenant & Ledger Isolation) at API Service -> Ledger Persistence.',
        stepByStepExplanation: [
          'The endpoint extracts sortBy directly from req.query without allowlist validation.',
          'sortBy is concatenated via template literal into the PostgreSQL query string passed to db.query().',
          'An attacker authenticated as one merchant can inject a subquery in ORDER BY to infer rows belonging to other tenants.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'import { Router } from "express";', kind: 'context' },
          { lineNumber: 2, content: 'import { db } from "../db/pool";', kind: 'context' },
          { lineNumber: 3, content: '', kind: 'context' },
          { lineNumber: 4, content: 'const router = Router();', kind: 'context' },
          { lineNumber: 5, content: '', kind: 'context' },
          { lineNumber: 6, content: 'router.get("/exports", async (req, res) => {', kind: 'context' },
          { lineNumber: 7, content: '  const merchantId = req.auth.merchantId;', kind: 'context' },
          { lineNumber: 8, content: '  const sortBy = String(req.query.sortBy || "created_at");', kind: 'context' },
          { lineNumber: 9, content: '  const sql = `SELECT id, amount_cents, status, created_at FROM settlements WHERE merchant_id = $1 ORDER BY ${sortBy} DESC`;', kind: 'vulnerable' },
          { lineNumber: 10, content: '  const result = await db.query(sql, [merchantId]);', kind: 'vulnerable' },
          { lineNumber: 11, content: '  res.json({ rows: result.rows });', kind: 'context' },
          { lineNumber: 12, content: '});', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 9,
            stepIndex: 1,
            title: 'Template String Interpolation in SQL Identifier',
            explanation:
              'PostgreSQL parameter binding ($1) protects merchantId, but ${sortBy} is interpolated raw into the SQL command text.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Node.js 22.14.0 / PostgreSQL 16',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-8790)',
            networkPolicy: 'Internal sandbox Postgres socket only',
            seedState: 'Two seeded tenants (m_100, m_200) with settlement rows',
          },
          reproductionSteps: [
            'Authenticate as tenant m_100.',
            'Send GET /exports?sortBy=(SELECT+CASE+WHEN+(SELECT+count(*)+FROM+settlements+WHERE+merchant_id=%27m_200%27)>0+THEN+id+ELSE+created_at+END).',
            'Observe conditional query execution and row ordering change confirming arbitrary SQL evaluation.',
          ],
          payload:
            'GET /exports?sortBy=(CASE%20WHEN%20(SELECT%20substring(api_key,1,1)%20FROM%20merchants%20LIMIT%201)=%27a%27%20THEN%20id%20ELSE%20amount_cents%20END)',
          executionTrace: [
            '[sbx] GET /exports received for merchant m_100',
            '[sbx] Compiled SQL: SELECT ... ORDER BY (CASE WHEN (SELECT substring(api_key,1,1) FROM merchants LIMIT 1)=\'a\' THEN id ELSE amount_cents END) DESC',
            '[sbx] PostgreSQL executed subquery against merchants table without error',
            '[assert] Cross-table SQL expression evaluated -> EXPLOIT CONFIRMED',
          ],
          outcome: 'Confirmed exploitable: arbitrary SQL expressions execute inside ORDER BY clause.',
          confirmedExploitable: true,
          validatedAt: '2026-11-17T18:14:05Z',
          durationMs: 365,
        },
        patch: {
          patchId: 'CDX-4884',
          engine: 'Codex + Aardvark Verify',
          summary: 'Map sortBy through a strict compile-time column allowlist dictionary before SQL construction.',
          diffLines: [
            { type: 'context', oldLine: 6, newLine: 6, content: 'router.get("/exports", async (req, res) => {' },
            { type: 'context', oldLine: 7, newLine: 7, content: '  const merchantId = req.auth.merchantId;' },
            { type: 'removed', oldLine: 8, content: '  const sortBy = String(req.query.sortBy || "created_at");' },
            { type: 'removed', oldLine: 9, content: '  const sql = `SELECT id, amount_cents, status, created_at FROM settlements WHERE merchant_id = $1 ORDER BY ${sortBy} DESC`;' },
            { type: 'added', newLine: 8, content: '  const ALLOWED_SORT: Record<string, string> = {' },
            { type: 'added', newLine: 9, content: '    created_at: "created_at",' },
            { type: 'added', newLine: 10, content: '    amount_cents: "amount_cents",' },
            { type: 'added', newLine: 11, content: '    status: "status",' },
            { type: 'added', newLine: 12, content: '  };' },
            { type: 'added', newLine: 13, content: '  const requestedSort = String(req.query.sortBy || "created_at");' },
            { type: 'added', newLine: 14, content: '  const safeColumn = ALLOWED_SORT[requestedSort] ?? "created_at";' },
            { type: 'added', newLine: 15, content: '  const sql = `SELECT id, amount_cents, status, created_at FROM settlements WHERE merchant_id = $1 ORDER BY ${safeColumn} DESC`;' },
            { type: 'context', oldLine: 10, newLine: 16, content: '  const result = await db.query(sql, [merchantId]);' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'Sandbox SQLi Payload Rejection',
              detail: 'Tested subquery payload; fell back to safeColumn="created_at" with zero subquery execution.',
              passed: true,
            },
            {
              checkName: 'API Compatibility Check',
              detail: 'Valid sortBy values (created_at, amount_cents, status) continue returning expected sorted rows.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
      {
        id: 'ADV-1031',
        title: 'SSRF in Merchant Payout Callback Dispatcher',
        cweId: 'CWE-918',
        severity: 'High',
        status: 'Patched',
        commitSha: '9a04c71',
        filePath: 'src/workers/payoutNotifier.ts',
        vulnerableLines: [8, 9],
        summary:
          'Payout worker fetched merchant callbackUrl without validating resolved IP addresses against private or cloud metadata ranges.',
        threatModelAlignment:
          'Violates OBJ-3 (Outbound Egress Containment) at Worker Egress -> VPC Internal.',
        stepByStepExplanation: [
          'Merchant webhook URL was validated only by checking url.startsWith("https://") or "http://".',
          'fetch(callbackUrl) followed DNS resolution to 169.254.169.254 or internal cluster IPs.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'export async function dispatchPayoutCallback(callbackUrl: string, event: unknown) {', kind: 'context' },
          { lineNumber: 2, content: '  if (!callbackUrl.startsWith("https://")) {', kind: 'context' },
          { lineNumber: 3, content: '    throw new Error("HTTPS callback required");', kind: 'context' },
          { lineNumber: 4, content: '  }', kind: 'context' },
          { lineNumber: 5, content: '  const parsed = new URL(callbackUrl);', kind: 'context' },
          { lineNumber: 6, content: '  // Missing DNS/IP CIDR validation prior to request dispatch', kind: 'context' },
          { lineNumber: 7, content: '  const response = await fetch(parsed.toString(), {', kind: 'vulnerable' },
          { lineNumber: 8, content: '    method: "POST",', kind: 'vulnerable' },
          { lineNumber: 9, content: '    body: JSON.stringify(event),', kind: 'vulnerable' },
          { lineNumber: 10, content: '  });', kind: 'context' },
          { lineNumber: 11, content: '  return response.status;', kind: 'context' },
          { lineNumber: 12, content: '}', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 7,
            stepIndex: 1,
            title: 'Unrestricted Outbound Fetch',
            explanation:
              'Protocol check alone allows hostnames resolving to 127.0.0.1, 10.0.0.0/8, or 169.254.169.254.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Node.js 22.14.0',
            isolation: 'Ephemeral gVisor container with mock metadata server',
            networkPolicy: 'Mocked 169.254.169.254 metadata trap',
            seedState: 'Merchant callback configured to https://internal-trap.test',
          },
          reproductionSteps: [
            'Register callback hostname resolving to internal trap IP.',
            'Trigger payout completion event and inspect mock internal listener logs.',
          ],
          payload: 'callbackUrl = "https://169-254-169-254.sslip.io/latest/meta-data/"',
          executionTrace: [
            '[sbx] dispatchPayoutCallback invoked',
            '[sbx] DNS lookup resolved to 169.254.169.254',
            '[sbx] Mock metadata endpoint received outbound POST request',
            '[assert] Internal IP reachable -> EXPLOIT CONFIRMED',
          ],
          outcome: 'Confirmed exploitable prior to patch.',
          confirmedExploitable: true,
          validatedAt: '2026-11-15T11:08:20Z',
          durationMs: 289,
        },
        patch: {
          patchId: 'CDX-4810',
          engine: 'Codex + Aardvark Verify',
          summary: 'Resolve DNS records explicitly, reject RFC1918/loopback/link-local IPs, and disable redirects.',
          diffLines: [
            { type: 'added', newLine: 1, content: 'import { assertPublicUrl } from "../security/egressGuard";' },
            { type: 'context', oldLine: 5, newLine: 6, content: '  const parsed = new URL(callbackUrl);' },
            { type: 'added', newLine: 7, content: '  await assertPublicUrl(parsed);' },
            { type: 'context', oldLine: 7, newLine: 8, content: '  const response = await fetch(parsed.toString(), {' },
            { type: 'added', newLine: 9, content: '    redirect: "error",' },
            { type: 'context', oldLine: 8, newLine: 10, content: '    method: "POST",' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'SSRF Metadata Trap Blocked',
              detail: 'assertPublicUrl threw EgressBlockedError for 169.254.169.254 and 10.0.0.1.',
              passed: true,
            },
          ],
          applied: true,
          appliedCommitSha: 'b3e71a0',
          appliedAt: '2026-11-15T11:22:00Z',
        },
      },
    ],
    sampleIncomingCommits: [
      {
        id: 'sample-refund-idor',
        commitMessage: 'feat(refunds): allow direct refund lookup by refundId',
        author: 'j.alvarez',
        filePath: 'src/routes/refunds.ts',
        diffContent: `import { Router } from "express";
import { db } from "../db/pool";

const router = Router();

router.get("/refunds/:refundId", async (req, res) => {
  const { refundId } = req.params;
  const result = await db.query(
    "SELECT id, merchant_id, amount_cents, bank_last4, reason FROM refunds WHERE id = $1",
    [refundId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Refund not found" });
  }
  return res.json(result.rows[0]);
});`,
      },
      {
        id: 'sample-safe-health',
        commitMessage: 'chore(health): expose non-sensitive readiness probe',
        author: 'm.chen',
        filePath: 'src/routes/health.ts',
        diffContent: `import { Router } from "express";
import { db } from "../db/pool";

const router = Router();

router.get("/healthz", async (_req, res) => {
  await db.query("SELECT 1");
  return res.status(200).json({ ok: true });
});`,
      },
    ],
  },
  {
    id: 'vault-auth-service',
    owner: 'acme',
    name: 'vault-auth-service',
    language: 'Go',
    defaultBranch: 'main',
    connectedAt: '2026-11-10T14:20:00Z',
    summary:
      'Zero-trust identity broker issuing short-lived JWTs, verifying OIDC assertions, and serving tenant key material templates.',
    threatModel: {
      summary:
        'Identity and token-minting boundary. Compromising signature verification or filesystem template loading enables privilege escalation across all downstream microservices.',
      architectureOverview:
        'Go HTTP service verifying asymmetric RS256 OIDC tokens and serving organization-scoped policy templates from an immutable template directory.',
      lastAnalyzedCommit: '4e91c02',
      analyzedAt: '2026-11-17T22:10:00Z',
      securityObjectives: [
        {
          id: 'OBJ-1',
          title: 'Strict Asymmetric Algorithm Pinning',
          description:
            'JWT verification must explicitly reject alg=none and symmetric HMAC key-confusion attacks.',
          criticality: 'Core',
        },
        {
          id: 'OBJ-2',
          title: 'Confined Template Directory Access',
          description:
            'Policy template loaders must restrict reads strictly within /opt/vault/templates.',
          criticality: 'Elevated',
        },
      ],
      assets: [
        {
          id: 'AST-1',
          name: 'RSA Signing Keypair',
          type: 'Cryptographic Identity Key',
          entryPoint: 'internal/jwt/verifier.go',
          trustBoundary: 'External Bearer Token -> Identity Middleware',
          ownerModule: 'jwt-verifier',
        },
        {
          id: 'AST-2',
          name: 'Host Configuration Filesystem',
          type: 'Local Disk',
          entryPoint: 'internal/templates/loader.go',
          trustBoundary: 'HTTP Query Param -> Filesystem Read',
          ownerModule: 'policy-templates',
        },
      ],
      attackVectors: [
        {
          id: 'VEC-1',
          vectorName: 'JWT Algorithm Confusion (RS256 -> HS256 / none)',
          targetBoundary: 'External Bearer Token -> Identity Middleware',
          cweCategory: 'CWE-327',
          mitigationExpectation: 'Pin expected signing method inside jwt.Parse callback.',
          riskLevel: 'Critical',
        },
        {
          id: 'VEC-2',
          vectorName: 'Directory Traversal on Template Name',
          targetBoundary: 'HTTP Query Param -> Filesystem Read',
          cweCategory: 'CWE-22',
          mitigationExpectation: 'Canonicalize path with filepath.Clean and verify prefix containment.',
          riskLevel: 'High',
        },
      ],
    },
    commits: [
      {
        sha: '4e91c02',
        message: 'fix(jwt): simplify token parser wrapper for multi-issuer support',
        author: 'e.lindqvist',
        timestamp: '2026-11-17T22:08:00Z',
        filesChanged: 2,
        scanType: 'Commit Hook',
        status: 'Issues Found',
        findingsCount: 1,
      },
      {
        sha: '2b77a44',
        message: 'feat(templates): serve organization policy templates by name',
        author: 'e.lindqvist',
        timestamp: '2026-11-16T09:30:00Z',
        filesChanged: 1,
        scanType: 'History Scan',
        status: 'False Positive Filtered',
        findingsCount: 0,
      },
    ],
    findings: [
      {
        id: 'ADV-2018',
        title: 'Unpinned JWT Signing Algorithm Allows alg=none Bypass',
        cweId: 'CWE-327',
        severity: 'Critical',
        status: 'Confirmed',
        commitSha: '4e91c02',
        filePath: 'internal/jwt/verifier.go',
        vulnerableLines: [11, 12],
        summary:
          'ParseUnverified or missing algorithm check in keyfunc lets an attacker forge an administrative token with header {"alg":"none"}.',
        threatModelAlignment:
          'Violates OBJ-1 (Strict Asymmetric Algorithm Pinning) at External Bearer Token -> Identity Middleware.',
        stepByStepExplanation: [
          'Commit 4e91c02 refactored VerifyToken to accept multiple issuers, returning the public key bytes directly without checking token.Method.',
          'When an unsigned token with alg=none is presented, the parser skips signature verification unless WithValidMethods is enforced.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'func VerifyToken(raw string, pubKey *rsa.PublicKey) (*Claims, error) {', kind: 'context' },
          { lineNumber: 2, content: '  claims := &Claims{}', kind: 'context' },
          { lineNumber: 3, content: '  parser := jwt.NewParser()', kind: 'context' },
          { lineNumber: 4, content: '  token, err := parser.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {', kind: 'context' },
          { lineNumber: 5, content: '    if t.Method.Alg() == "none" {', kind: 'context' },
          { lineNumber: 6, content: '      return jwt.UnsafeAllowNoneSignatureType, nil', kind: 'vulnerable' },
          { lineNumber: 7, content: '    }', kind: 'context' },
          { lineNumber: 8, content: '    return pubKey, nil', kind: 'context' },
          { lineNumber: 9, content: '  })', kind: 'context' },
          { lineNumber: 10, content: '  if err != nil || !token.Valid { return nil, ErrUnauthorized }', kind: 'context' },
          { lineNumber: 11, content: '  return claims, nil', kind: 'context' },
          { lineNumber: 12, content: '}', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 6,
            stepIndex: 1,
            title: 'UnsafeAllowNoneSignatureType Permitted',
            explanation:
              'Returning jwt.UnsafeAllowNoneSignatureType disables cryptographic verification whenever a client sets alg="none".',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Go 1.23 / golang-jwt/v5',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-4410)',
            networkPolicy: 'Loopback only',
            seedState: 'Test RSA keypair initialized',
          },
          reproductionSteps: [
            'Construct base64url JWT header {"alg":"none","typ":"JWT"} and claims {"sub":"admin","role":"superadmin"}.',
            'Submit Bearer token with empty signature segment to VerifyToken.',
          ],
          payload: 'Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJzdXBlcmFkbWluIn0.',
          executionTrace: [
            '[sbx] VerifyToken invoked with alg=none token',
            '[sbx] keyfunc matched t.Method.Alg() == "none" at verifier.go:6',
            '[sbx] token.Valid == true, returned Claims{Sub:"admin", Role:"superadmin"}',
            '[assert] Unsigned admin claims accepted -> EXPLOIT CONFIRMED',
          ],
          outcome: 'Confirmed exploitable: forged superadmin JWT accepted without signature.',
          confirmedExploitable: true,
          validatedAt: '2026-11-17T22:09:14Z',
          durationMs: 195,
        },
        patch: {
          patchId: 'CDX-5012',
          engine: 'Codex + Aardvark Verify',
          summary: 'Pin parser strictly to RS256 via jwt.WithValidMethods(["RS256"]) and remove UnsafeAllowNoneSignatureType.',
          diffLines: [
            { type: 'removed', oldLine: 3, content: '  parser := jwt.NewParser()' },
            { type: 'added', newLine: 3, content: '  parser := jwt.NewParser(jwt.WithValidMethods([]string{"RS256"}))' },
            { type: 'context', oldLine: 4, newLine: 4, content: '  token, err := parser.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {' },
            { type: 'removed', oldLine: 5, content: '    if t.Method.Alg() == "none" {' },
            { type: 'removed', oldLine: 6, content: '      return jwt.UnsafeAllowNoneSignatureType, nil' },
            { type: 'removed', oldLine: 7, content: '    }' },
            { type: 'context', oldLine: 8, newLine: 5, content: '    return pubKey, nil' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'alg=none Rejection Test',
              detail: 'Replayed unsigned superadmin JWT; parser rejected with token signature is invalid.',
              passed: true,
            },
            {
              checkName: 'HS256 Key Confusion Blocked',
              detail: 'Tested HS256 token signed with PEM bytes; WithValidMethods(["RS256"]) rejected.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
      {
        id: 'ADV-2012',
        title: 'Potential Path Traversal in Policy Template Loader (Filtered by Sandbox)',
        cweId: 'CWE-22',
        severity: 'High',
        status: 'False Positive',
        commitSha: '2b77a44',
        filePath: 'internal/templates/loader.go',
        vulnerableLines: [7],
        summary:
          'Static commit scan flagged filepath.Join(baseDir, name) receiving a query parameter, but Stage 3 sandbox validation proved the prefix containment guard blocks traversal.',
        threatModelAlignment:
          'Checked against OBJ-2 (Confined Template Directory Access).',
        stepByStepExplanation: [
          'Commit 2b77a44 reads r.URL.Query().Get("name") and passes it to os.ReadFile.',
          'However, line 8 runs filepath.Clean and verifies strings.HasPrefix(clean, baseDir + string(filepath.Separator)).',
          'Stage 3 sandboxed exploit attempts confirmed no parent directory escape is possible.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'const baseDir = "/opt/vault/templates"', kind: 'context' },
          { lineNumber: 2, content: '', kind: 'context' },
          { lineNumber: 3, content: 'func LoadTemplate(w http.ResponseWriter, r *http.Request) {', kind: 'context' },
          { lineNumber: 4, content: '  name := r.URL.Query().Get("name")', kind: 'context' },
          { lineNumber: 5, content: '  joined := filepath.Join(baseDir, name)', kind: 'context' },
          { lineNumber: 6, content: '  clean := filepath.Clean(joined)', kind: 'context' },
          { lineNumber: 7, content: '  if !strings.HasPrefix(clean, baseDir+string(filepath.Separator)) {', kind: 'context' },
          { lineNumber: 8, content: '    http.Error(w, "invalid template path", http.StatusBadRequest)', kind: 'context' },
          { lineNumber: 9, content: '    return', kind: 'context' },
          { lineNumber: 10, content: '  }', kind: 'context' },
          { lineNumber: 11, content: '  data, err := os.ReadFile(clean)', kind: 'context' },
          { lineNumber: 12, content: '  if err != nil { http.NotFound(w, r); return }', kind: 'context' },
          { lineNumber: 13, content: '  w.Write(data)', kind: 'context' },
          { lineNumber: 14, content: '}', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 7,
            stepIndex: 1,
            title: 'Prefix Containment Guard Verified',
            explanation:
              'Trailing path separator in baseDir+string(filepath.Separator) prevents sibling directory bypasses like /opt/vault/templates-secret.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Go 1.23',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-4390)',
            networkPolicy: 'Loopback only',
            seedState: 'Dummy secret placed at /etc/passwd and /opt/vault/templates-secret/key',
          },
          reproductionSteps: [
            'Attempt classic traversal: ?name=../../../../etc/passwd',
            'Attempt sibling prefix bypass: ?name=../templates-secret/key',
            'Attempt URL-encoded slash variants: ?name=..%2f..%2fetc%2fpasswd',
          ],
          payload: 'GET /templates?name=../../../../etc/passwd',
          executionTrace: [
            '[sbx] Probe 1: ?name=../../../../etc/passwd -> clean="/etc/passwd" -> HTTP 400 invalid template path',
            '[sbx] Probe 2: ?name=../templates-secret/key -> clean="/opt/vault/templates-secret/key" -> HTTP 400 invalid template path',
            '[sbx] Probe 3: ?name=..%2f..%2fetc%2fpasswd -> clean="/etc/passwd" -> HTTP 400 invalid template path',
            '[assert] All traversal payloads blocked -> FALSE POSITIVE ELIMINATED',
          ],
          outcome: 'Not exploitable: sandbox tests confirmed path confinement holds under all traversal vectors.',
          confirmedExploitable: false,
          validatedAt: '2026-11-16T09:31:40Z',
          durationMs: 310,
        },
        patch: {
          patchId: 'CDX-NONE',
          engine: 'Codex + Aardvark Verify',
          summary: 'No code patch required. Marked as False Positive after sandbox verification.',
          diffLines: [
            { type: 'context', oldLine: 7, newLine: 7, content: '  if !strings.HasPrefix(clean, baseDir+string(filepath.Separator)) {' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'False Positive Suppressed',
              detail: 'Existing sanitization satisfies OBJ-2; no developer alert noise emitted.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
    ],
    sampleIncomingCommits: [
      {
        id: 'sample-go-exec',
        commitMessage: 'feat(diagnostics): run openssl cert check on uploaded bundle',
        author: 'e.lindqvist',
        filePath: 'internal/diag/cert.go',
        diffContent: `func CheckCertSubject(domain string) (string, error) {
  cmd := exec.Command("sh", "-c", "openssl s_client -connect " + domain + ":443 </dev/null")
  out, err := cmd.CombinedOutput()
  return string(out), err
}`,
      },
    ],
  },
  {
    id: 'ml-inference-proxy',
    owner: 'acme',
    name: 'ml-inference-proxy',
    language: 'Python',
    defaultBranch: 'main',
    connectedAt: '2026-11-08T16:45:00Z',
    summary:
      'FastAPI model gateway loading tenant-uploaded checkpoint metadata and streaming structured inference completions.',
    threatModel: {
      summary:
        'Tenant-facing ML control plane. Untrusted artifact uploads and metadata payloads cross into Python deserialization and worker execution environments.',
      architectureOverview:
        'FastAPI router orchestrating model metadata registration and inference worker dispatch.',
      lastAnalyzedCommit: '81d0f2c',
      analyzedAt: '2026-11-17T11:00:00Z',
      securityObjectives: [
        {
          id: 'OBJ-1',
          title: 'Safe Artifact Deserialization',
          description:
            'Never deserialize untrusted tenant bytes with pickle or unsafe YAML loaders.',
          criticality: 'Core',
        },
      ],
      assets: [
        {
          id: 'AST-1',
          name: 'Inference Worker Pod',
          type: 'Python Runtime & GPU Secrets',
          entryPoint: 'app/routers/models.py',
          trustBoundary: 'Tenant Upload -> Python Deserializer',
          ownerModule: 'model-registry',
        },
      ],
      attackVectors: [
        {
          id: 'VEC-1',
          vectorName: 'Arbitrary Code Execution via Pickle Deserialization',
          targetBoundary: 'Tenant Upload -> Python Deserializer',
          cweCategory: 'CWE-502',
          mitigationExpectation: 'Use JSON or safetensors metadata schemas instead of pickle.',
          riskLevel: 'Critical',
        },
      ],
    },
    commits: [
      {
        sha: '81d0f2c',
        message: 'feat(registry): support custom preprocessing config blobs',
        author: 'a.novak',
        timestamp: '2026-11-17T10:55:00Z',
        filesChanged: 2,
        scanType: 'Commit Hook',
        status: 'Issues Found',
        findingsCount: 1,
      },
    ],
    findings: [
      {
        id: 'ADV-3004',
        title: 'Remote Code Execution via pickle.loads on Tenant Config Blob',
        cweId: 'CWE-502',
        severity: 'Critical',
        status: 'Confirmed',
        commitSha: '81d0f2c',
        filePath: 'app/routers/models.py',
        vulnerableLines: [9, 10],
        summary:
          'Base64-decoded tenant preprocessing configuration is passed directly to pickle.loads(), allowing arbitrary Python execution on the inference gateway.',
        threatModelAlignment:
          'Violates OBJ-1 (Safe Artifact Deserialization) at Tenant Upload -> Python Deserializer.',
        stepByStepExplanation: [
          'Endpoint POST /models/register accepts a base64 config_blob field from any authenticated tenant.',
          'pickle.loads() executes __reduce__ opcodes inside the decoded payload before returning any validation error.',
        ],
        codeLines: [
          { lineNumber: 1, content: 'import base64', kind: 'context' },
          { lineNumber: 2, content: 'import pickle', kind: 'context' },
          { lineNumber: 3, content: 'from fastapi import APIRouter', kind: 'context' },
          { lineNumber: 4, content: '', kind: 'context' },
          { lineNumber: 5, content: 'router = APIRouter()', kind: 'context' },
          { lineNumber: 6, content: '', kind: 'context' },
          { lineNumber: 7, content: '@router.post("/models/register")', kind: 'context' },
          { lineNumber: 8, content: 'async def register_model(payload: dict):', kind: 'context' },
          { lineNumber: 9, content: '    raw = base64.b64decode(payload["config_blob"])', kind: 'vulnerable' },
          { lineNumber: 10, content: '    config = pickle.loads(raw)', kind: 'vulnerable' },
          { lineNumber: 11, content: '    return {"registered": True, "keys": list(config.keys())}', kind: 'context' },
        ],
        annotations: [
          {
            lineNumber: 10,
            stepIndex: 1,
            title: 'Untrusted Pickle Deserialization',
            explanation:
              'pickle.loads executes arbitrary Python callables embedded via REDUCE opcodes during deserialization.',
          },
        ],
        validation: {
          environmentSpec: {
            runtime: 'Python 3.12 / FastAPI',
            isolation: 'Ephemeral gVisor container (aardvark-sbx-9104)',
            networkPolicy: 'No outbound egress; read-only rootfs except /tmp',
            seedState: 'Marker target /tmp/aardvark_canary_check absent',
          },
          reproductionSteps: [
            'Serialize an object implementing __reduce__ to touch /tmp/aardvark_canary_check.',
            'Base64 encode and POST to /models/register.',
            'Inspect sandbox filesystem for marker creation.',
          ],
          payload: 'POST /models/register {"config_blob":"gASVNwAAAAAAAACMBXBvc2l4lIwGc3lzdGVtlJOUjB10b3VjaCAvdG1wL2FhcmR2YXJrX2NhbmFyeV9jaGVja5SFlFKULg=="}',
          executionTrace: [
            '[sbx] POST /models/register invoked',
            '[sbx] pickle.loads() executed posix.system("touch /tmp/aardvark_canary_check")',
            '[sbx] File /tmp/aardvark_canary_check created inside sandbox',
            '[assert] Arbitrary OS command executed -> EXPLOIT CONFIRMED',
          ],
          outcome: 'Confirmed exploitable: arbitrary code execution achieved via pickle payload.',
          confirmedExploitable: true,
          validatedAt: '2026-11-17T10:57:02Z',
          durationMs: 248,
        },
        patch: {
          patchId: 'CDX-5109',
          engine: 'Codex + Aardvark Verify',
          summary: 'Replace pickle deserialization with strict JSON parsing and Pydantic schema validation.',
          diffLines: [
            { type: 'context', oldLine: 1, newLine: 1, content: 'import base64' },
            { type: 'removed', oldLine: 2, content: 'import pickle' },
            { type: 'added', newLine: 2, content: 'import json' },
            { type: 'context', oldLine: 8, newLine: 8, content: 'async def register_model(payload: dict):' },
            { type: 'context', oldLine: 9, newLine: 9, content: '    raw = base64.b64decode(payload["config_blob"])' },
            { type: 'removed', oldLine: 10, content: '    config = pickle.loads(raw)' },
            { type: 'added', newLine: 10, content: '    config = json.loads(raw.decode("utf-8"))' },
            { type: 'added', newLine: 11, content: '    if not isinstance(config, dict):' },
            { type: 'added', newLine: 12, content: '        raise ValueError("Invalid configuration object")' },
            { type: 'context', oldLine: 11, newLine: 13, content: '    return {"registered": True, "keys": list(config.keys())}' },
          ],
          aardvarkVerificationChecks: [
            {
              checkName: 'Pickle Opcode Payload Blocked',
              detail: 'Replayed __reduce__ payload; json.loads raised UnicodeDecodeError / JSONDecodeError without execution.',
              passed: true,
            },
          ],
          applied: false,
        },
      },
    ],
    sampleIncomingCommits: [
      {
        id: 'sample-py-eval',
        commitMessage: 'feat(scoring): evaluate custom post-processing formula',
        author: 'a.novak',
        filePath: 'app/routers/scoring.py',
        diffContent: `@router.post("/score/transform")
async def transform_score(expr: str, value: float):
    result = eval(expr, {"value": value})
    return {"transformed": result}`,
      },
    ],
  },
];
