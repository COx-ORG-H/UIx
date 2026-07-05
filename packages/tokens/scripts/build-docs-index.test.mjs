/* Unit tests for build-docs-index.mjs. Run: node --test scripts/build-docs-index.test.mjs (zero deps).
   Asserts the api-extractor parser extracts Button + Table (the DOCS-2 proof components) correctly. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApiMd, slugify } from './build-docs-index.mjs';

// A minimal api-extractor-format fixture pinned to the real block shape.
const FIXTURE = `## API Report File for "@tensor_1/react"

\`\`\`ts
import { ButtonHTMLAttributes } from 'react';
import { TableHTMLAttributes } from 'react';

// @public (undocumented)
export const Button: react.ForwardRefExoticComponent<ButtonProps & react.RefAttributes<HTMLButtonElement>>;

// @public (undocumented)
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    // (undocumented)
    children?: ReactNode;
    // (undocumented)
    icon?: boolean;
    // (undocumented)
    size?: 'sm' | 'md' | 'lg';
    // (undocumented)
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
}

// @public
export function CellStrong(input: HTMLAttributes<HTMLSpanElement>): react.JSX.Element;

// @public (undocumented)
export function Table(input: TableProps): react.JSX.Element;

// @public (undocumented)
export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
    // (undocumented)
    density?: TableDensity;
    fixed: boolean;
    // (undocumented)
    zebra?: boolean;
}
\`\`\`
`;

test('parseApiMd: extracts Button with its props + extends', () => {
  const { components } = parseApiMd(FIXTURE);
  const button = components.find((c) => c.name === 'Button');
  assert.ok(button, 'Button should be parsed');
  assert.equal(button.slug, 'button');
  assert.equal(button.extends, 'ButtonHTMLAttributes<HTMLButtonElement>');
  const names = button.props.map((p) => p.name);
  assert.deepEqual(names, ['children', 'icon', 'size', 'variant']);
  const variant = button.props.find((p) => p.name === 'variant');
  assert.equal(variant.optional, true);
  assert.equal(variant.type, "'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link'");
});

test('parseApiMd: extracts Table and distinguishes optional vs required props', () => {
  const { components } = parseApiMd(FIXTURE);
  const table = components.find((c) => c.name === 'Table');
  assert.ok(table, 'Table should be parsed');
  assert.equal(table.extends, 'TableHTMLAttributes<HTMLTableElement>');
  const fixed = table.props.find((p) => p.name === 'fixed');
  assert.equal(fixed.optional, false, 'fixed has no ? so it is required');
  assert.equal(fixed.type, 'boolean');
  const density = table.props.find((p) => p.name === 'density');
  assert.equal(density.optional, true);
  assert.equal(density.type, 'TableDensity');
});

test('parseApiMd: components without a NameProps interface carry empty props', () => {
  const { components } = parseApiMd(FIXTURE);
  const cell = components.find((c) => c.name === 'CellStrong');
  assert.ok(cell, 'CellStrong should be listed as a component');
  assert.deepEqual(cell.props, []);
  assert.equal(cell.extends, null);
});

test('parseApiMd: preserves export order and skips comment lines', () => {
  const { components } = parseApiMd(FIXTURE);
  assert.deepEqual(components.map((c) => c.name), ['Button', 'CellStrong', 'Table']);
});

test('slugify matches docs.js rule', () => {
  assert.equal(slugify('Status Pill'), 'status-pill');
  assert.equal(slugify('Table'), 'table');
});
