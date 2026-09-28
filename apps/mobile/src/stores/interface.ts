import { create } from "zustand";
type Toast = { message: string; actionLabel?: string; action?: () => void };
export const useInterface = create<{
  captureOpen: boolean;
  toast: Toast | null;
  openCapture: () => void;
  closeCapture: () => void;
  notify: (toast: Toast) => void;
  dismiss: () => void;
}>((set) => ({
  captureOpen: false,
  toast: null,
  openCapture: () => set({ captureOpen: true }),
  closeCapture: () => set({ captureOpen: false }),
  notify: (toast) => set({ toast }),
  dismiss: () => set({ toast: null }),
}));
