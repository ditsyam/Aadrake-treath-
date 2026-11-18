import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { RepositoryProject, Severity } from '../types/aardvark';

interface ThreatHeatmapProps {
  repositories: RepositoryProject[];
  activeRepoId: string;
  onSelectRepo: (repoId: string) => void;
}

type HeatmapMode = 'all' | 'open';

interface HeatmapCellDatum {
  x: number;
  y: number;
  z: number;
  repoId: string;
  repoLabel: string;
  severity: Severity;
  count: number;
  confirmedCount: number;
  patchedCount: number;
  falsePositiveCount: number;
  isActiveRepo: boolean;
  topFindingTitle?: string;
}

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

function getCellColors(
  severity: Severity,
  count: number
): { fill: string; stroke: string; text: string } {
  if (count === 0) {
    return { fill: '#F8FAFC', stroke: '#E2E8F0', text: '#94A3B8' };
  }
  switch (severity) {
    case 'Critical':
      return count >= 2
        ? { fill: '#B91C1C', stroke: '#991B1B', text: '#FFFFFF' }
        : { fill: '#DC2626', stroke: '#B91C1C', text: '#FFFFFF' };
    case 'High':
      return count >= 2
        ? { fill: '#B45309', stroke: '#92400E', text: '#FFFFFF' }
        : { fill: '#FEF3C7', stroke: '#F59E0B', text: '#92400E' };
    case 'Medium':
      return count >= 2
        ? { fill: '#1D4ED8', stroke: '#1E40AF', text: '#FFFFFF' }
        : { fill: '#DBEAFE', stroke: '#60A5FA', text: '#1E40AF' };
    case 'Low':
      return count >= 2
        ? { fill: '#475569', stroke: '#334155', text: '#FFFFFF' }
        : { fill: '#E2E8F0', stroke: '#CBD5E1', text: '#334155' };
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: HeatmapCellDatum }>;
}

const HeatmapTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  const cell = active ? payload?.[0]?.payload : undefined;
  if (!cell) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs space-y-1.5 min-w-[210px]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono font-semibold text-slate-900">{cell.repoLabel}</span>
        <span
          className={
            cell.severity === 'Critical'
              ? 'text-red-700 font-semibold'
              : cell.severity === 'High'
              ? 'text-amber-700 font-semibold'
              : cell.severity === 'Medium'
              ? 'text-blue-700 font-medium'
              : 'text-slate-600 font-medium'
          }
        >
          {cell.severity}
        </span>
      </div>
      <div className="text-slate-600 tabular-nums">
        <span className="font-semibold text-slate-900">{cell.count}</span>{' '}
        {cell.count === 1 ? 'vulnerability' : 'vulnerabilities'} in bucket
      </div>
      {cell.count > 0 && (
        <div className="pt-1 border-t border-slate-100 text-slate-500 flex items-center gap-2 tabular-nums">
          <span>{cell.confirmedCount} open</span>
          <span aria-hidden="true">·</span>
          <span>{cell.patchedCount} patched</span>
          <span aria-hidden="true">·</span>
          <span>{cell.falsePositiveCount} FP</span>
        </div>
      )}
      {cell.topFindingTitle && (
        <div className="pt-1 text-slate-700 truncate max-w-[240px]">
          {cell.topFindingTitle}
        </div>
      )}
      {!cell.isActiveRepo && (
        <div className="pt-0.5 text-[11px] text-blue-700 font-medium">
          Click cell to switch repository
        </div>
      )}
    </div>
  );
};

export const ThreatHeatmap: React.FC<ThreatHeatmapProps> = ({
  repositories,
  activeRepoId,
  onSelectRepo,
}) => {
  const [mode, setMode] = useState<HeatmapMode>('all');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = el.clientWidth;
      if (next > 0) setContainerWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const yAxisWidth = containerWidth < 640 ? 132 : 204;
  const rightMargin = 16;
  const plotWidth = Math.max(240, containerWidth - yAxisWidth - rightMargin);
  const cellWidth = Math.max(44, Math.floor(plotWidth / SEVERITIES.length) - 10);
  const rowHeight = 46;
  const cellHeight = 34;
  const chartHeight = Math.max(190, repositories.length * rowHeight + 56);

  const heatmapData = useMemo<HeatmapCellDatum[]>(() => {
    const cells: HeatmapCellDatum[] = [];
    repositories.forEach((repoItem, repoIndex) => {
      SEVERITIES.forEach((severity, severityIndex) => {
        const allMatching = repoItem.findings.filter((f) => f.severity === severity);
        const visibleMatching =
          mode === 'open'
            ? allMatching.filter(
                (f) => f.status === 'Confirmed' || f.status === 'Pending Validation'
              )
            : allMatching;

        cells.push({
          x: severityIndex,
          y: repoIndex,
          z: visibleMatching.length,
          repoId: repoItem.id,
          repoLabel: `${repoItem.owner}/${repoItem.name}`,
          severity,
          count: visibleMatching.length,
          confirmedCount: allMatching.filter(
            (f) => f.status === 'Confirmed' || f.status === 'Pending Validation'
          ).length,
          patchedCount: allMatching.filter((f) => f.status === 'Patched').length,
          falsePositiveCount: allMatching.filter((f) => f.status === 'False Positive').length,
          isActiveRepo: repoItem.id === activeRepoId,
          topFindingTitle: visibleMatching[0]?.title,
        });
      });
    });
    return cells;
  }, [repositories, activeRepoId, mode]);

  const totalAcrossRepos = useMemo(
    () => heatmapData.reduce((acc, c) => acc + c.count, 0),
    [heatmapData]
  );

  const renderHeatCell = (shapeProps: unknown) => {
    const props = shapeProps as {
      cx?: number;
      cy?: number;
      payload?: HeatmapCellDatum;
    };
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) {
      return <g />;
    }

    const { fill, stroke, text } = getCellColors(payload.severity, payload.count);
    const rx = cx - cellWidth / 2;
    const ry = cy - cellHeight / 2;

    return (
      <g
        onClick={() => onSelectRepo(payload.repoId)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${payload.repoLabel} ${payload.severity}: ${payload.count}`}
      >
        <rect
          x={rx}
          y={ry}
          width={cellWidth}
          height={cellHeight}
          rx={6}
          ry={6}
          fill={fill}
          stroke={payload.isActiveRepo ? '#0F172A' : stroke}
          strokeWidth={payload.isActiveRepo ? 1.5 : 1}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={text}
          fontSize={12}
          fontWeight={payload.count > 0 ? 600 : 500}
          style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {payload.count}
        </text>
      </g>
    );
  };

  return (
    <section
      aria-label="Cross-repository severity threat heatmap"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Cross-Repository Threat Heatmap
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              · {totalAcrossRepos} {mode === 'open' ? 'open' : 'total'} findings across{' '}
              {repositories.length} repos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Vulnerability density by severity across all connected repositories. Click any row cell to focus that repository.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-50 border border-slate-200 inline-block" />
              <span>0</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-400 inline-block" />
              <span>High</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-600 border border-red-700 inline-block" />
              <span>Critical</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-700 border border-slate-900 inline-block" />
              <span>2+</span>
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Findings
            </button>
            <button
              type="button"
              onClick={() => setMode('open')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'open'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Exposure
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="px-4 py-4" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: rightMargin, bottom: 24, left: 4 }}>
            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, SEVERITIES.length - 0.5]}
              ticks={[0, 1, 2, 3]}
              tickFormatter={(value: number) => SEVERITIES[value] ?? ''}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              interval={0}
            />
            <YAxis
              type="number"
              dataKey="y"
              reversed
              domain={[-0.5, Math.max(0, repositories.length - 1) + 0.5]}
              ticks={repositories.map((_, idx) => idx)}
              width={yAxisWidth}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => {
                const r = repositories[value];
                return r ? `${r.owner}/${r.name}` : '';
              }}
              tick={{
                fill: '#0F172A',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
              interval={0}
            />
            <ZAxis type="number" dataKey="z" range={[1, 1]} />
            <Tooltip
              cursor={false}
              content={<HeatmapTooltip />}
            />
            <Scatter
              data={heatmapData}
              shape={renderHeatCell}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
