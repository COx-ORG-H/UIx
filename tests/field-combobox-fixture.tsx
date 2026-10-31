import { createRoot } from 'react-dom/client';
import { memo, useState } from 'react';
import { Field } from '../packages/react/src/components/Field.js';
import { Combobox } from '../packages/react/src/components/Combobox.js';

const options = [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }];
const MemoCombobox = memo(Combobox);
function App() {
  const [value, setValue] = useState('');
  return <>
  <span id="extra">Extra guidance</span>
  <Field label="Category" required error={value ? undefined : 'Choose a category'} hint="Select one" help="Choose one option">
    <Combobox id="wrapper" label="Category" emptyLabel="No options" options={options} aria-describedby="extra" value={value} onValueChange={setValue} />
  </Field>
  <Field label="Explicit" htmlFor="explicit-input"><Combobox id="explicit-wrapper" inputId="explicit-input" label="Explicit" emptyLabel="No options" options={options} /></Field>
  <Field label="For only" htmlFor="for-input"><Combobox label="For only" emptyLabel="No options" options={options} /></Field>
  <Field label="Memoized" required><MemoCombobox label="Memoized" emptyLabel="No options" options={options} /></Field>
</>;
}
createRoot(document.getElementById('root')!).render(<App />);
