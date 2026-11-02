/* Native modal order, shared by Modal, Drawer, Peek and ConfirmDialog through useDialog.
 * DOM order is not top-layer order: a sibling opened later is above the earlier dialog. */
const dialogs: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
export function topModalDialog() {
  for (let index = dialogs.length - 1; index >= 0; index -= 1) {
    const dialog = dialogs[index];
    if (dialog?.open && dialog.isConnected) return dialog;
  }
}
export function subscribeModalLayer(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function registerModalLayer(dialog: HTMLDialogElement) {
  const previous = dialogs.indexOf(dialog);
  if (previous !== -1) dialogs.splice(previous, 1);
  dialogs.push(dialog);
  notify();
  return () => {
    const index = dialogs.indexOf(dialog);
    if (index === -1) return;
    dialogs.splice(index, 1);
    notify();
  };
}
