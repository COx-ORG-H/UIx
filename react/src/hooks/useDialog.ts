"use client";

import { useRef, useEffect } from 'react';

export function useDialog(open: boolean): React.RefObject<HTMLDialogElement> {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
    return () => {
      if (el.open) el.close();
    };
  }, [open]);

  return ref;
}
