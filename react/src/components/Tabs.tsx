import { createContext, useContext } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

interface TabsContextValue {
  value?: string;
  onChange?: (value: string) => void;
}

const TabsCtx = createContext<TabsContextValue>({});

export interface TabsProps {
  variant?: 'line' | 'enclosed' | 'pill';
  value?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}

export function Tabs({ variant = 'line', value, onChange, children, className }: TabsProps) {
  return (
    <TabsCtx.Provider value={{ value, onChange }}>
      <div role="tablist" className={cx('uix-tabs', `uix-tabs--${variant}`, className)}>
        {children}
      </div>
    </TabsCtx.Provider>
  );
}

export interface TabProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  value: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function Tab({ value, children, disabled, className, onClick, ...props }: TabProps) {
  const ctx = useContext(TabsCtx);
  const selected = ctx.value === value;
  return (
    <button
      role="tab"
      className={cx('uix-tab', className)}
      aria-selected={selected}
      disabled={disabled}
      onClick={(e) => {
        ctx.onChange?.(value);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
