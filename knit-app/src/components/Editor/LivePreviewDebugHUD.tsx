import React, { useState } from 'react';
import type { LivePreviewDebugStats, VaultProfilingRecommendation } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { useDebugMode } from '../../hooks';

interface LivePreviewDebugHUDProps {
  stats: LivePreviewDebugStats | null;
  onToggle: () => void;
  onRequestMeasure: () => void;
}

export const LivePreviewDebugHUD: React.FC<LivePreviewDebugHUDProps> = ({
  stats,
  onToggle,
  onRequestMeasure,
}) => {
  const [activeTab, setActiveTab] = useState<'none' | 'lines' | 'profiler'>('none');
  const { isBenchmarking, profilingReport, runBenchmark } = useDebugMode();

  const mismatches = stats?.mismatches || [];
  const hasErrors = mismatches.length > 0;

  const handleCopyReport = () => {
    if (!stats) return;
    const linesReport = stats.lines
      .map((l) => {
        const status = l.isMismatch ? '[ERREUR]' : '[OK]';
        return `L${l.lineNum.toString().padEnd(4)} | LineTop: ${l.lineTop.toString().padEnd(4)}px | GutterTop: ${l.gutterTop.toString().padEnd(4)}px | Delta: ${(l.delta > 0 ? `+${l.delta}` : l.delta).toString().padEnd(5)}px | ${status} | "${l.textSnippet}"`;
      })
      .join('\n');

    const widgetsReport = stats.widgets
      .map((w) => `  - ${w.type}: DOM Height = ${w.domHeight}px, OffsetTop = ${w.offsetTop}px`)
      .join('\n');

    let profilerReportText = '';
    if (profilingReport) {
      profilerReportText = `
=== PROFILAGE DU COFFRE & INDEXATION ===
Stockage: ${profilingReport.storageLabel}
Documents: ${profilingReport.markdownFilesCount} Markdown (${profilingReport.totalFilesCount} au total)
Temps total: ${profilingReport.totalTimeMs} ms (${profilingReport.throughputDocsPerSec} docs/s)
Arborescence: ${profilingReport.treeWalkMs} ms | Autocomplétion: ${profilingReport.suggestIndexMs} ms
Tâches: ${profilingReport.tasksCollectMs} ms | Tags: ${profilingReport.tagsCollectMs} ms
Latence I/O échantillon: ${profilingReport.sampleIoReadMs} ms / doc
`;
    }

    const fullReport = `=== RAPPORT DE DIAGNOSTIC LIVE PREVIEW KNIT ===
Date: ${new Date(stats.timestamp).toLocaleString()}
Lignes totales: ${stats.totalLines} | Lignes visibles: ${stats.visibleLines}
Décalages détectés: ${mismatches.length}

WIDGETS ACTIFS:
${widgetsReport || '  Aucun widget actif'}

DÉTAILS DES LIGNES VISIBLES:
${linesReport}
${profilerReportText}
`;

    navigator.clipboard.writeText(fullReport).then(() => {
      toast.success('Rapport copié', 'Le rapport géométrique et de profilage complet a été copié.');
    });
  };

  const handleDumpConsole = () => {
    if (window.__KNIT_DEBUG__?.dumpReport) {
      window.__KNIT_DEBUG__.dumpReport();
      toast.info('Inspecteur Console', 'Rapport affiché dans la console développeur (F12).');
    }
  };

  const handleRunBenchmark = async () => {
    try {
      toast.info('Profilage en cours', 'Mesure des temps d\'accès disque/réseau et indexation...');
      const rep = await runBenchmark();
      toast.success('Benchmark terminé', `${rep.markdownFilesCount} docs indexés en ${rep.totalTimeMs}ms (${rep.throughputDocsPerSec} docs/s)`);
    } catch (err) {
      toast.error('Erreur benchmark', String(err));
    }
  };

  return (
    <div className="knit-live-debug-hud">
      <div className="knit-debug-hud-header">
        <div className="knit-debug-hud-title">
          <DuotoneIcon name="bug" size={13} style={{ color: 'var(--knit-primary)' }} />
          <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Mode Debug Global</span>

          {stats && (
            <span className={`knit-debug-hud-badge ${hasErrors ? 'is-error' : 'is-ok'}`}>
              {hasErrors ? (
                <>
                  <DuotoneIcon name="close" size={11} style={{ color: '#EF4444' }} />
                  <span>
                    {mismatches.length} décalage{mismatches.length > 1 ? 's' : ''} (Max Δ :{' '}
                    {mismatches[0]?.delta > 0 ? `+${mismatches[0]?.delta}` : mismatches[0]?.delta}px à L{mismatches[0]?.lineNum})
                  </span>
                </>
              ) : (
                <>
                  <DuotoneIcon name="check" size={11} style={{ color: '#10B981' }} />
                  <span>100% Pixel-Perfect (0 décalage)</span>
                </>
              )}
            </span>
          )}

          {stats && (
            <span style={{ fontSize: '11px', color: 'var(--knit-text-muted)', marginLeft: 4 }}>
              ({stats.visibleLines} visibles / {stats.totalLines} lignes)
            </span>
          )}
        </div>

        <div className="knit-debug-hud-actions">
          {/* Bouton Profilage Indexation */}
          <button
            onClick={() => setActiveTab((t) => (t === 'profiler' ? 'none' : 'profiler'))}
            className={`knit-debug-btn ${activeTab === 'profiler' ? 'active' : ''}`}
            title="Afficher les métriques de profilage pour grands coffres et partages réseau"
            style={{
              backgroundColor: activeTab === 'profiler' ? 'var(--knit-primary-alpha)' : undefined,
              borderColor: activeTab === 'profiler' ? 'var(--knit-primary)' : undefined,
              color: activeTab === 'profiler' ? 'var(--knit-primary)' : undefined,
            }}
          >
            <DuotoneIcon name="sync" size={12} />
            <span>Profilage Index</span>
          </button>

          {/* Bouton Détails lignes CodeMirror */}
          <button
            onClick={() => setActiveTab((t) => (t === 'lines' ? 'none' : 'lines'))}
            className={`knit-debug-btn ${activeTab === 'lines' ? 'active' : ''}`}
            title="Afficher/masquer la table détaillée des lignes"
            style={{
              backgroundColor: activeTab === 'lines' ? 'var(--knit-primary-alpha)' : undefined,
              borderColor: activeTab === 'lines' ? 'var(--knit-primary)' : undefined,
              color: activeTab === 'lines' ? 'var(--knit-primary)' : undefined,
            }}
          >
            <DuotoneIcon name="table" size={12} />
            <span>Détails lignes</span>
          </button>

          <button
            onClick={onRequestMeasure}
            className="knit-debug-btn"
            title="Forcer un recalcul géométrique complet de CodeMirror"
          >
            <DuotoneIcon name="sync" size={12} />
            <span>Re-mesurer</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="knit-debug-btn"
            title="Copier le rapport complet au format texte"
          >
            <DuotoneIcon name="command" size={12} />
            <span>Copier rapport</span>
          </button>

          <button
            onClick={handleDumpConsole}
            className="knit-debug-btn"
            title="Afficher console.table dans les DevTools"
          >
            <DuotoneIcon name="search" size={12} />
            <span>Console</span>
          </button>

          <button
            onClick={onToggle}
            className="knit-debug-btn"
            title="Fermer le mode debug (Ctrl+Alt+D)"
            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <DuotoneIcon name="close" size={12} />
            <span>Quitter</span>
          </button>
        </div>
      </div>

      {/* Onglet 1 : Profilage Indexation & Benchmark Réseau / Local */}
      {activeTab === 'profiler' && (
        <div className="knit-debug-hud-body" style={{ maxHeight: 320, overflowY: 'auto', padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--knit-text)' }}>
                Diagnostic de Performance d'Indexation (Grands Coffres & Réseau)
              </div>
              <div style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
                Mesure l'I/O disque, la vitesse d'indexation de l'autocomplétion (KnitSuggestIndex) et détecte la latence réseau SMB/NFS.
              </div>
            </div>
            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="knit-debug-btn"
              style={{
                backgroundColor: 'var(--knit-primary)',
                color: '#fff',
                borderColor: 'var(--knit-primary)',
                fontWeight: 600,
                opacity: isBenchmarking ? 0.6 : 1,
              }}
            >
              <DuotoneIcon name="sync" size={12} />
              <span>{isBenchmarking ? 'Mesure en cours...' : 'Lancer Benchmark'}</span>
            </button>
          </div>

          {profilingReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Grille des Métriques Clés */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--knit-surface-hover)',
                    borderRadius: 'var(--knit-radius-sm)',
                    border: '1px solid var(--knit-border)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--knit-text-muted)', textTransform: 'uppercase' }}>Type de stockage</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: profilingReport.storageType === 'local_ssd' ? '#10B981' : '#F59E0B' }}>
                    {profilingReport.storageLabel}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--knit-surface-hover)',
                    borderRadius: 'var(--knit-radius-sm)',
                    border: '1px solid var(--knit-border)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--knit-text-muted)', textTransform: 'uppercase' }}>Temps Index Total</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--knit-primary)' }}>
                    {profilingReport.totalTimeMs} ms
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--knit-surface-hover)',
                    borderRadius: 'var(--knit-radius-sm)',
                    border: '1px solid var(--knit-border)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--knit-text-muted)', textTransform: 'uppercase' }}>Débit d'indexation</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--knit-text)' }}>
                    {profilingReport.throughputDocsPerSec} docs/s
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--knit-surface-hover)',
                    borderRadius: 'var(--knit-radius-sm)',
                    border: '1px solid var(--knit-border)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--knit-text-muted)', textTransform: 'uppercase' }}>Latence I/O unitaire</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: profilingReport.sampleIoReadMs > 10 ? '#EF4444' : 'var(--knit-text)' }}>
                    {profilingReport.sampleIoReadMs} ms / doc
                  </div>
                </div>
              </div>

              {/* Détails par étape */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  padding: '6px 12px',
                  backgroundColor: 'var(--knit-surface-hover)',
                  borderRadius: 'var(--knit-radius-sm)',
                  border: '1px solid var(--knit-border-subtle)',
                }}
              >
                <span><strong>Arborescence:</strong> {profilingReport.treeWalkMs} ms</span>
                <span><strong>Autocomplétion:</strong> {profilingReport.suggestIndexMs} ms ({profilingReport.indexedHeadingsCount} titres)</span>
                <span><strong>Tâches Markdown:</strong> {profilingReport.tasksCollectMs} ms ({profilingReport.indexedTasksCount} tâches)</span>
                <span><strong>Tags:</strong> {profilingReport.tagsCollectMs} ms ({profilingReport.indexedTagsCount} tags)</span>
              </div>

              {/* Recommandations */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--knit-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Recommandations d'optimisation
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profilingReport.recommendations.map((rec: VaultProfilingRecommendation, i: number) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--knit-radius-xs)',
                        borderLeft: `3px solid ${rec.severity === 'urgent' ? '#EF4444' : rec.severity === 'warning' ? '#F59E0B' : '#10B981'}`,
                        backgroundColor: 'var(--knit-surface)',
                        fontSize: 11,
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--knit-text)' }}>{rec.title}</div>
                      <div style={{ color: 'var(--knit-text-secondary)', marginTop: 2 }}>{rec.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--knit-text-muted)', fontSize: 12 }}>
              Aucun profilage enregistré. Cliquez sur « <strong>Lancer Benchmark</strong> » pour analyser la vitesse d'indexation de ce coffre.
            </div>
          )}
        </div>
      )}

      {/* Onglet 2 : Table détaillée des lignes CodeMirror */}
      {activeTab === 'lines' && stats && (
        <div className="knit-debug-hud-body">
          <table className="knit-debug-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Ligne</th>
                <th style={{ width: 80 }}>Line Top</th>
                <th style={{ width: 80 }}>Gutter Top</th>
                <th style={{ width: 80 }}>Hauteur</th>
                <th style={{ width: 80 }}>Delta (Δ)</th>
                <th>Extrait texte</th>
              </tr>
            </thead>
            <tbody>
              {stats.lines.map((l) => (
                <tr key={l.lineNum} className={l.isMismatch ? 'has-error' : ''}>
                  <td>L{l.lineNum}</td>
                  <td>{l.lineTop}px</td>
                  <td>{l.gutterTop}px</td>
                  <td>{l.lineHeight}px</td>
                  <td>{l.delta > 0 ? `+${l.delta}` : l.delta}px</td>
                  <td style={{ color: l.isMismatch ? '#EF4444' : 'inherit' }}>
                    {l.textSnippet || '<ligne vide>'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
