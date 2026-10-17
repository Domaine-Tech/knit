/**
 * Types relatifs aux notifications toasts éphémères de Knit
 */

export type ToastType = 'info' | 'warning' | 'error' | 'success' | 'sync';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  count?: number;
  duration?: number;
  action?: ToastAction;
  createdAt: number;
}
