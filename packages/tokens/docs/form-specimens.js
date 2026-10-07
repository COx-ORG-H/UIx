/* Shared by the component reference and the form composition. CSS is production UIx. */
// Lucide X, the same glyph as XIcon in @tensor_1/react/icons (HAR-1569): an icon, never a text "×".
const removeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export const tagInputMarkup = `<div class="uix-stack" data-tag-example>
  <label class="uix-field__label" for="example-tags">Project labels</label>
  <div class="uix-taginput">
    <span class="uix-tag">network <button type="button" class="uix-tag__remove" aria-label="Remove network">${removeIcon}</button></span>
    <input id="example-tags" class="uix-taginput__field" placeholder="Add a label" aria-describedby="example-tags-hint">
  </div>
  <p id="example-tags-hint" class="uix-field__hint">Press Enter to add a label. Duplicate labels are ignored.</p>
  <p class="uix-field__hint" role="status" data-tag-status>No changes yet.</p>
</div>`;

export const fileUploadMarkup = `<div class="uix-file-upload" data-file-example>
  <div class="uix-dropzone">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>
    <strong>Choose attachments</strong>
    <span class="uix-file-upload__hint" id="example-file-hint">Local preview only. Files are not uploaded.</span>
    <button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-file-choose aria-describedby="example-file-hint">Choose files</button>
    <input class="uix-visually-hidden" type="file" tabindex="-1" aria-hidden="true" multiple>
  </div>
  <ul class="uix-filelist uix-file-upload__list" data-file-list aria-label="Selected files" hidden></ul>
  <p class="uix-field__hint" role="status" data-file-status>No files selected.</p>
</div>`;

export const initFormSpecimens = (root) => {
  root.querySelectorAll('[data-tag-example]').forEach((example) => {
    const field = example.querySelector('input');
    const status = example.querySelector('[data-tag-status]');
    example.addEventListener('keydown', (event) => {
      if (event.target !== field || event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      const value = field.value.trim();
      if (!value) return;
      const exists = [...example.querySelectorAll('.uix-tag')].some((tag) => tag.firstChild.textContent.trim().toLowerCase() === value.toLowerCase());
      if (exists) { status.textContent = `${value} is already added.`; return; }
      const tag = document.createElement('span');
      tag.className = 'uix-tag';
      tag.append(document.createTextNode(`${value} `));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'uix-tag__remove';
      remove.setAttribute('aria-label', `Remove ${value}`); remove.innerHTML = removeIcon;
      tag.append(remove); field.before(tag); field.value = '';
      status.textContent = `Added ${value}.`;
    });
    example.addEventListener('click', (event) => {
      const button = event.target.closest('.uix-tag__remove');
      if (!button) return;
      const value = button.parentElement.firstChild.textContent.trim();
      button.parentElement.remove(); field.focus(); status.textContent = `Removed ${value}.`;
    });
  });
  root.querySelectorAll('[data-file-example]').forEach((example) => {
    const input = example.querySelector('input[type=file]');
    const zone = example.querySelector('.uix-dropzone');
    const list = example.querySelector('[data-file-list]');
    const status = example.querySelector('[data-file-status]');
    // The button opens the chooser; a click on the empty drop zone does the same (like React FileUpload).
    zone.addEventListener('click', (event) => {
      if (event.target === zone || event.target.closest('[data-file-choose]')) input.click();
    });
    input.addEventListener('change', () => {
      const files = [...input.files];
      list.replaceChildren();
      for (const file of files) {
        const row = document.createElement('li'); row.className = 'uix-filelist__item';
        const name = document.createElement('span'); name.textContent = file.name;
        const size = document.createElement('span'); size.className = 'uix-filelist__size';
        size.textContent = `${new Intl.NumberFormat().format(file.size)} bytes`;
        row.append(name, size); list.append(row);
      }
      list.hidden = files.length === 0;
      status.textContent = files.length ? `${files.length} file(s) selected locally. Nothing uploaded.` : 'No files selected.';
    });
  });
};
