import { useEffect, useRef, useState } from 'react';
import { vaultStore } from '../stores/vaultStore';
import type { GraphData } from '../types';
import { buildLocalGraph, stepForce } from '../utils/graphUtils';

const MAX_FORCE_STEPS = 180;

/**
 * Charge le graphe local (centre + backlinks) et anime le force-layout (RAF plafonné).
 */
export function useLocalGraphData(centerPath: string, isDebugActive: boolean) {
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const forceStepsRef = useRef(0);
  const [forceStepsRemaining, setForceStepsRemaining] = useState(0);
  const isDebugActiveRef = useRef(isDebugActive);

  useEffect(() => {
    isDebugActiveRef.current = isDebugActive;
  }, [isDebugActive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bl = await vaultStore.getBacklinks(centerPath);
      if (cancelled) return;
      setBacklinks(bl);
      const contents: Record<string, string> = {};
      try {
        contents[centerPath] = await vaultStore.readFile(centerPath);
      } catch {
        contents[centerPath] = '';
      }
      for (const p of bl) {
        try {
          contents[p] = await vaultStore.readFile(p);
        } catch {
          contents[p] = '';
        }
      }
      setData(buildLocalGraph(centerPath, contents, bl));
    })();
    return () => {
      cancelled = true;
    };
  }, [centerPath]);

  useEffect(() => {
    let frame = 0;
    let steps = 0;
    forceStepsRef.current = MAX_FORCE_STEPS;
    if (isDebugActiveRef.current) setForceStepsRemaining(MAX_FORCE_STEPS);
    const tick = () => {
      steps += 1;
      const remaining = Math.max(0, MAX_FORCE_STEPS - steps);
      forceStepsRef.current = remaining;
      if (isDebugActiveRef.current && (remaining === 0 || steps % 10 === 0)) {
        setForceStepsRemaining(remaining);
      }
      if (steps > MAX_FORCE_STEPS) return;
      setData((prev) => {
        if (prev.nodes.length === 0) return prev;
        const clone: GraphData = {
          nodes: prev.nodes.map((n) => ({ ...n })),
          edges: prev.edges,
        };
        stepForce(clone, centerPath);
        return clone;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [centerPath, backlinks]);

  return { data, backlinks, forceStepsRef, forceStepsRemaining };
}
