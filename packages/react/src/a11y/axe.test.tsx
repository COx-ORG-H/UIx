/* A11Y-3 — jest-axe over rendered React components (jsdom). Asserts zero WCAG 2.1 A/AA
   violations for the form primitives and the Modal. Scoped to the same rule tags as the
   styleguide axe gate, so this extends that coverage to the React wrappers plain axe misses. */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Field, Input, Select, Textarea, Checkbox, Button, Modal } from '../index.js';

const AXE = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
};

describe('form primitives', () => {
  it('a labelled form has no violations', async () => {
    const { container } = render(
      <form aria-label="Edit user">
        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue="user">
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </Select>
        </Field>
        <Field label="Bio" htmlFor="bio">
          <Textarea id="bio" name="bio" />
        </Field>
        <Field label="Email me updates" htmlFor="notify">
          <Checkbox id="notify" name="notify" />
        </Field>
        <Button type="submit">Save</Button>
      </form>
    );
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('Modal', () => {
  it('an open, titled modal has no violations', async () => {
    const { container } = render(
      <Modal open title="Delete ticket" onClose={() => {}} footer={<Button>Confirm</Button>}>
        <p>This action cannot be undone.</p>
      </Modal>
    );
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});
