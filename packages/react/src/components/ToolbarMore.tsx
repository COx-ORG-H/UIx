"use client";

import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { MoreHorizontalIcon } from '../icons/components.js';
import { Button } from './Button.js';
import { Menu } from './Menu.js';

export interface ToolbarMoreProps {
  /**
   * The trigger's visible word and the menu's name. Default: the `UixLabelsProvider`
   * `toolbar.more`, then "More".
   */
  label?: string;
  /** `MenuItem`, `MenuItemCheckbox`, `MenuRadioGroup`, `MenuGroup` and `MenuSeparator`. */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * A toolbar's one overflow menu (HAR-3090): a quiet "More" trigger at the end of the row that
 * collects the less frequent actions (group by, export, save as, maximize), so search and the
 * filters lead and nothing else competes with them. It is the kit `Menu`, with its keyboard:
 * ↓/↑, Home/End, type-to-find, Enter/Space, Esc and Tab close, focus back on the trigger. The
 * product decides which actions go in; the kit draws the trigger and names it.
 */
export function ToolbarMore({ label, children, open, onOpenChange, className }: ToolbarMoreProps) {
  const provided = useUixLabels().toolbar?.more;
  const word = label ?? provided ?? 'More';
  return (
    <Menu
      trigger={(
        <Button size="sm" variant="ghost" className={cx('uix-toolbar__more', className)}>
          <MoreHorizontalIcon size="sm" aria-hidden="true" />
          {word}
        </Button>
      )}
      placement="bottom-end"
      label={word}
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {children}
    </Menu>
  );
}
