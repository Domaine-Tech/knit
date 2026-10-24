import { Decoration } from '@codemirror/view';

export type {
  DecItem,
  BlockScanResult,
  LineScanResult,
} from '../../../../types';

/** Remplacement vide standard CodeMirror 6 (fidélité métrique 100%). */
export const emptyReplace = Decoration.replace({});
