import { Decoration } from '@codemirror/view';

export interface DecItem {
  from: number;
  to: number;
  deco: Decoration;
  isLine?: boolean;
}

/** Remplacement vide standard CodeMirror 6 (fidélité métrique 100%). */
export const emptyReplace = Decoration.replace({});

export interface BlockScanResult {
  handled: boolean;
  nextLine: number;
  lineDecorations: DecItem[];
  rangeDecorations: DecItem[];
}

export interface LineScanResult {
  lineDecorations: DecItem[];
  rangeDecorations: DecItem[];
  /** Si true, la ligne a déjà été consommée (continue). */
  skipRest: boolean;
  activeCalloutType: string | null;
}
