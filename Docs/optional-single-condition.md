# Optional single condition

`maxConditions={1}` lets a controlled RuleBuilder represent zero or one condition.
It hides Add at capacity and enforces the same bound on the append operation.
The default remains unlimited. Existing input above the limit stays editable and
removable; it is never truncated or emitted merely because it was rendered.
The limit counts condition leaves throughout the tree, including new nested groups.
Zero capacity hides add actions. Fractional limits are rounded down; negative or
NaN limits act as zero. Infinity keeps the unlimited default.

```tsx
const [value, setValue] = useState<RuleDefinition>({
  when: { id: 'root', combinator: 'and', conditions: [] },
  then: [],
});
<RuleBuilder
  value={value}
  onChange={setValue}
  fields={[{ id: 'priority', label: 'Priorität' }]}
  operators={[{ id: 'eq', label: 'ist' }]}
  maxConditions={1}
  conditionsOnly
  combinator="and"
  hideCombinator
  allowGroups={false}
  maxDepth={1}
  checks={{ emptyGroup: false }}
  labels={germanLabels}
/>
```

Use the complete German label set in
`packages/tokens/docs/rule-builder-labels.js`, or set the equivalent group once
with `UixLabelsProvider`. A nullable consumer maps zero conditions to `null`
and one condition back to its existing stored object; this API changes no schema.

The executable specimen is `tests/optional-condition/harness.tsx`. It imports
the actual component source, following the browser lane's tokens-only build convention,
and shows optional, pre-existing over-limit, read-only and default multi-condition cases.
The isolated packed-consumer smoke separately renders the public export at zero/one
conditions and checks its declarations with React 18/19. To run the browser cases:

```sh
npm run build:all
npx playwright test tests/a11y/optional-condition.spec.mjs
```

The keyboard walk in German:

1. Focus **Bedingung hinzufügen**, press Enter: exactly one condition appears.
   Add leaves the screen and tab order; focus moves to **Feld**.
2. Edit **Wert für Priorität**. The controlled value contains one condition.
3. Focus **Bedingung entfernen**, press Space: the rule becomes empty and
   focus returns to **Bedingung hinzufügen**.
4. Repeat with the pointer. A read-only rule offers neither mutation action.
5. In the over-limit specimen, edit the second stored value and remove the first
   condition. The remaining value is retained and Add stays absent at one row.
6. The default specimen still adds several conditions.

The static gallery shows explicitly read-only previews so it presents no unwired
mutation controls. The browser specimen runs the actual interactive component in
light/dark, at desktop and 320 px, with reduced motion.
