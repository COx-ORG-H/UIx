/* A11Y-3 — keyboard-operability tests (jsdom + user-event). Covers native activation
   (Space/Enter on Button), the Modal's keyboard-reachable controls + Esc-to-close wiring,
   focus order into a form, and a reduced-motion smoke check. jsdom has no layout, so these
   assert the semantics/wiring that make keyboard use possible, not pixel focus rings. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Modal, Field, Input } from '../index.js';

describe('Button activation', () => {
  it('fires onClick on Enter and Space when focused', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('Modal keyboard operability', () => {
  it('exposes a labelled, keyboard-activatable close control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="Delete ticket" onClose={onClose} footer={<Button>Confirm</Button>}>
        <p>Body</p>
      </Modal>
    );
    const close = screen.getByRole('button', { name: 'Close dialog' });
    close.focus();
    expect(close).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalled();
  });

  it('wires the dialog close event to onClose (Esc path)', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Delete ticket" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );
    // Native <dialog> Escape fires a `close` event; React maps onClose to it. Dispatch it directly
    // (jsdom doesn't implement native Esc-to-cancel) to prove the wiring a keyboard user relies on.
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('focus order', () => {
  it('Tab moves through a form in DOM order', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Field label="First" htmlFor="a"><Input id="a" /></Field>
        <Field label="Second" htmlFor="b"><Input id="b" /></Field>
      </form>
    );
    await user.tab();
    expect(screen.getByLabelText('First')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Second')).toHaveFocus();
  });
});

describe('reduced motion', () => {
  it('renders motion-bearing markup without crashing when reduce is preferred', () => {
    // Force prefers-reduced-motion: reduce; the components honour it in CSS, so the JS render
    // must be unaffected (the ping element stays; the CSS media query stills the animation).
    window.matchMedia = ((query: string) =>
      ({
        matches: /prefers-reduced-motion:\s*reduce/.test(query),
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    const { container } = render(<Button>Still works</Button>);
    expect(container.querySelector('.uix-btn')).toBeInTheDocument();
  });
});
