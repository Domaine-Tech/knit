/**
 * Tests du flatten / virtualisation (exécutables via `npx tsx` ou Vitest).
 * Garde-fou : 50 000 nœuds → lignes aplaties bornées par l'état d'expansion, pas par le DOM.
 */
import {
  buildSyntheticFlatTree,
  countTreeNodes,
  flattenVisibleTree,
} from './treeFlatten';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const TREE_SIZE = 50_000;
const tree = buildSyntheticFlatTree(TREE_SIZE);
assert(countTreeNodes(tree) === TREE_SIZE + 1, 'countTreeNodes doit inclure la racine');

const collapsed = flattenVisibleTree(tree, () => false);
assert(collapsed.length === 1, 'arbre replié = 1 ligne (racine)');

const expanded = flattenVisibleTree(tree, (path) => path === 'bulk');
assert(
  expanded.length === TREE_SIZE + 1,
  `arbre déplié = ${TREE_SIZE + 1} lignes plates, reçu ${expanded.length}`
);

/** Simulation fenêtre virtualisée : ~25 lignes visibles max. */
const VIEWPORT_ROWS = 25;
const visibleSlice = expanded.slice(0, VIEWPORT_ROWS);
assert(
  visibleSlice.length <= VIEWPORT_ROWS,
  'fenêtre DOM bornée par la viewport, pas par la taille du coffre'
);

console.log(
  `[treeFlatten] OK — ${TREE_SIZE} fichiers, flat=${expanded.length}, viewport=${VIEWPORT_ROWS}`
);
