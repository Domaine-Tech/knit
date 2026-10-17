/**
 * Types relatifs à la pile d'annulation et à l'historique d'actions de Knit
 */

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  createdAt: number;
}
