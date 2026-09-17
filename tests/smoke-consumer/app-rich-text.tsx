// Typed consumer of the RTE-01 subpaths, checked after the optional peers are installed.
import { useState } from 'react';
import { RichTextEditor, RichTextEditorFallback, roundTripMarkdown, emojiImageFileName } from '@tensor_1/react/rich-text';
import type { RichTextEditorProps, RichTextLabels } from '@tensor_1/react/rich-text';
import { Markdown } from '@tensor_1/react/markdown';
import { EmojiPicker, ReactionBar } from '@tensor_1/react/emoji';
import type { EmojiPickerLabels, ReactionBarLabels, ReactionSummary } from '@tensor_1/react/emoji';

const labels: Partial<RichTextLabels> = { bold: 'Fett', characterCount: '{count} von {max} Zeichen' };
const pickerLabels: Partial<EmojiPickerLabels> = { search: 'Emoji suchen' };
const reactionLabels: Partial<ReactionBarLabels> = { reactedWith: '{names} hat mit {emoji} reagiert' };
const reactions: ReactionSummary[] = [{ emoji: '👍', count: 1, reactedByMe: true, names: ['Ana'] }];

export function Editor(props: Pick<RichTextEditorProps, 'features'>) {
  const [value, setValue] = useState('**Hi** ✅');
  return (
    <>
      <RichTextEditor
        value={value}
        onChange={setValue}
        features={props.features}
        headingLevels={[3]}
        labels={labels}
        emojiImageBaseUrl="/static/emoji"
        variant="composer"
        toolbarEnd={<button type="button">Send</button>}
        resolveImageSrc={(src) => (src.startsWith('/') ? src : null)}
        onUploadImage={async (file) => ({ src: `/i/${file.name}`, alt: file.name })}
        aria-label="Body"
      />
      <RichTextEditorFallback value={value} onChange={setValue} aria-label="Body" />
      <Markdown resolveImageSrc={() => null}>{value}</Markdown>
      <ReactionBar reactions={reactions} onToggle={() => {}} labels={reactionLabels} emojiImageBaseUrl="/static/emoji" />
      <EmojiPicker onSelect={() => {}} locale="de" labels={pickerLabels} trigger={<button type="button">😀</button>} />
    </>
  );
}

export const gate: Promise<boolean> = roundTripMarkdown('# x').then((md) => md === '# x' && emojiImageFileName('👍') === '1f44d.png');
