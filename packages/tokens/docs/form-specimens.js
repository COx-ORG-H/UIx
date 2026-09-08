/* Shared by the component reference and the form composition. CSS is production UIx. */
export const tagInputMarkup = `<div class="uix-stack" data-tag-example>
  <label class="uix-field__label" for="example-tags">Project labels</label>
  <div class="uix-taginput">
    <span class="uix-tag">network <button type="button" class="uix-tag__remove" aria-label="Remove network">×</button></span>
    <input id="example-tags" class="uix-taginput__field" placeholder="Add a label" aria-describedby="example-tags-hint">
  </div>
  <p id="example-tags-hint" class="uix-field__hint">Press Enter to add a label. Duplicate labels are ignored.</p>
  <p class="uix-field__hint" role="status" data-tag-status>No changes yet.</p>
</div>`;

export const fileUploadMarkup = `<div class="uix-stack" data-file-example>
  <label class="uix-dropzone"><strong>Choose attachments</strong>
    <span>Local preview only. Files are not uploaded.</span>
    <input type="file" multiple aria-label="Choose attachments">
  </label>
  <div class="uix-filelist" data-file-list></div>
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
      remove.setAttribute('aria-label', `Remove ${value}`); remove.textContent = '×';
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
    example.querySelector('input').addEventListener('change', (event) => {
      const files = [...event.target.files];
      const list = example.querySelector('[data-file-list]');
      list.replaceChildren();
      for (const file of files) {
        const row = document.createElement('div'); row.className = 'uix-filelist__item';
        const name = document.createElement('span'); name.textContent = file.name;
        const size = document.createElement('span'); size.className = 'uix-filelist__size';
        size.textContent = `${new Intl.NumberFormat().format(file.size)} bytes`;
        row.append(name, size); list.append(row);
      }
      example.querySelector('[data-file-status]').textContent = files.length ? `${files.length} file(s) selected locally. Nothing uploaded.` : 'No files selected.';
    });
  });
};
