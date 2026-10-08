/* Second half of the tensor-gaps harness (see harness.tsx):
 *
 *   #chips     HAR-1632  a removable filter chip that anchors its editor by ref; link chips
 *   #files     HAR-1630  FileUpload and AttachmentList in a 288 px rail, an 80-character name
 *   #callouts  HAR-1614  Alert (long title, actions, dismiss), Note, StatusPill sizes
 *   #dialogs   HAR-1614  PromptDialog multiline + destructive + error
 *   #hover     HAR-1614  Popover openOnHover (a user card)
 *   #loading   HAR-1606  Spinner sizes, Meter tones, Heartbeat / LiveIndicator
 *   #view-menu HAR-1601  ViewMenu density options with German labels in a 304 px panel
 */
import { useRef, useState } from 'react';
import {
  Alert, Attachment, AttachmentList, Button, Chip, ChipGroup, FileUpload, Heartbeat, LiveIndicator, Meter, Note, Popover,
  PromptDialog, Spinner, StatusPill, UixLabelsProvider, ViewMenu,
} from '../../packages/react/src/index.js';
import type { FileUploadItem } from '../../packages/react/src/index.js';

/** 80 characters with no space, hyphen or dot to break at, like a generated export name. */
export const LONG_NAME = `${'Quartalsbericht_Finanzen_und_Controlling_2026_Q3_final_final_v7_ueberarbeitet'.slice(0, 76)}.pdf`;

function ChipCases() {
  const chipRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const toggle = () => {
    const el = document.getElementById('status-editor') as (HTMLElement & { togglePopover(): void }) | null;
    el?.togglePopover();
  };
  return (
    <section id="chips">
      <h2>Chip</h2>
      <UixLabelsProvider labels={{ chip: { remove: '{label} entfernen' } }}>
        <ChipGroup label="Active filters">
          {!removed && (
            <Chip
              ref={chipRef}
              onClick={toggle}
              onRemove={() => setRemoved(true)}
              bodyProps={{ id: 'status-chip', 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': 'status-editor' }}
            >
              Status: Offen
            </Chip>
          )}
          <Chip variant="add" onClick={() => setRemoved(false)}>+ Filter</Chip>
        </ChipGroup>
      </UixLabelsProvider>
      <Popover
        id="status-editor"
        role="dialog"
        aria-label="Status filter"
        anchor={chipRef}
        onToggle={(event) => setOpen((event as unknown as { newState: string }).newState === 'open')}
      >
        <Button id="status-apply" size="sm" onClick={() => { toggle(); chipRef.current?.focus(); }}>Apply</Button>
      </Popover>
      <nav aria-label="Record types">
        <ChipGroup>
          <Chip href="#incidents" current>Incidents</Chip>
          <Chip href="#changes">Changes</Chip>
          <Chip pressed onPressedChange={() => {}}>Mine</Chip>
        </ChipGroup>
      </nav>
    </section>
  );
}

const UPLOADS: FileUploadItem[] = [
  { id: '1', name: LONG_NAME, size: 2_400_000, status: 'uploading', progress: 40 },
  { id: '2', name: LONG_NAME.replace('Quartals', 'Jahres'), size: 512_000, status: 'error', error: `Der Server hat ${LONG_NAME} abgelehnt.` },
  { id: '3', name: 'kurz.txt', size: 900, status: 'done' },
];

function FileCases() {
  const [items, setItems] = useState(UPLOADS);
  return (
    <section id="files">
      <h2>FileUpload and Attachment in a 288 px rail</h2>
      <div className="rail" id="upload-rail">
        <FileUpload
          items={items}
          onFilesAdded={() => {}}
          onRemove={(id) => setItems((list) => list.filter((item) => item.id !== id))}
          onRetry={() => {}}
          accept=".pdf"
          sizeBase={1024}
          hint="PDF, bis 20 MB"
        />
      </div>
      <div className="rail" id="attachment-rail">
        <AttachmentList label="Attachments">
          <Attachment name={LONG_NAME} size={2_400_000} sizeBase={1024} href="#file" download meta="Ana Petrović · 6 Oct" onRemove={() => {}} />
          <Attachment name="scan.png" size={1_500_000} type="image/png" status="loading" />
        </AttachmentList>
      </div>
    </section>
  );
}

function CalloutCases() {
  const [shown, setShown] = useState(true);
  const errorRef = useRef<HTMLDivElement>(null);
  return (
    <section id="callouts">
      <h2>Alert, Note and StatusPill</h2>
      {shown && (
        <Alert
          id="announcement"
          tone="info"
          title="Geplante Wartungsarbeiten am Samstag zwischen 02:00 und 04:00 Uhr betreffen alle Mandanten der Plattform"
          actions={<Button size="xs" variant="ghost" id="announcement-details">Details</Button>}
          onDismiss={() => setShown(false)}
          dismissLabel="Hinweis ausblenden"
        >
          Während dieser Zeit ist die Anmeldung nicht möglich.
        </Alert>
      )}
      <Alert id="unbroken" tone="warning" title={`Export ${LONG_NAME} konnte nicht erstellt werden`} />
      <Alert id="form-error" ref={errorRef} tone="danger" tabIndex={-1} title="Could not save">The name is already taken.</Alert>
      <Button id="focus-error" onClick={() => errorRef.current?.focus()}>Save</Button>
      <Note id="plain-note" tone={undefined}>A note with no tone.</Note>
      <p id="pills">
        <StatusPill id="pill-sm" size="sm" tone="success" dot>Operational</StatusPill>{' '}
        <StatusPill id="pill-md" tone="success" dot>Operational</StatusPill>{' '}
        <StatusPill id="pill-lg" size="lg" tone="success" dot>Operational</StatusPill>
      </p>
    </section>
  );
}

function DialogCases() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [reason, setReason] = useState('');
  return (
    <section id="dialogs">
      <h2>PromptDialog</h2>
      <Button id="force-import" onClick={() => { setError(undefined); setOpen(true); }}>Force import</Button>
      <output id="import-reason">{reason}</output>
      <PromptDialog
        open={open}
        title="Force the SAP import"
        description="The existing record is overwritten and the collision is closed."
        inputLabel="Reason"
        submitLabel="Import anyway"
        cancelLabel="Cancel"
        multiline
        destructive
        error={error}
        validate={(value) => (value.trim() ? undefined : 'Give a reason.')}
        onSubmit={(value) => {
          if (value.includes('fail')) { setError('The import service did not answer.'); return; }
          setReason(value);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </section>
  );
}

function HoverCases() {
  const userRef = useRef<HTMLButtonElement>(null);
  return (
    <section id="hover">
      <h2>Popover on hover and focus</h2>
      {/* The card follows its anchor in the DOM, so Tab goes from the name into the card. */}
      <div>
        Assigned to <Button ref={userRef} id="user-chip" variant="ghost" size="sm">Ana Petrović</Button>
        <Popover id="user-card" role="group" aria-label="Ana Petrović" anchor={userRef} openOnHover={{ openDelay: 120, closeDelay: 120 }} placement="bottom-start">
          <p style={{ margin: 0 }}>Service desk · Sarajevo</p>
          <a id="user-profile" href="#profile">Open profile</a>
        </Popover>
        <Button id="hover-next" variant="ghost" size="sm">Next</Button>
      </div>
    </section>
  );
}

function LoadingCases() {
  return (
    <section id="loading">
      <h2>Spinner, Meter and Heartbeat</h2>
      <p>
        <Spinner id="spinner-sm" size="sm" label="Uploading" /> <Spinner id="spinner-md" /> <Spinner id="spinner-lg" size="lg" />
      </p>
      <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
        <Meter id="meter-neutral" tone="neutral" value={42} label="Option A, 42% of votes" />
        <Meter id="meter-accent" tone="accent" value={58} label="Option B, 58% of votes" />
        <Meter id="meter-default" value={30} label="Disk used" />
      </div>
      <p style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <LiveIndicator id="live">Live</LiveIndicator>
        <LiveIndicator id="idle" state="idle">Paused</LiveIndicator>
        <LiveIndicator id="warn" state="warning">Delayed</LiveIndicator>
        <Heartbeat id="beat-danger" state="danger" label="Connection lost" />
      </p>
    </section>
  );
}

function ViewMenuCases() {
  const [density, setDensity] = useState('standard');
  const [wide, setWide] = useState('a');
  return (
    <section id="view-menu">
      <h2>ViewMenu density in a 304 px panel</h2>
      <div style={{ width: 304 }}>
        <ViewMenu
          className="vm-german"
          density={density}
          densityLabel="Zeilenabstand"
          densityOptions={[{ value: 'compact', label: 'Kompakt' }, { value: 'standard', label: 'Standard' }, { value: 'relaxed', label: 'Großzügig' }]}
          onDensityChange={setDensity}
        />
      </div>
      {/* Three options that cannot share one row of a 304 px panel: they wrap as whole options. */}
      <div style={{ width: 304 }}>
        <ViewMenu
          className="vm-long"
          density={wide}
          densityLabel="Darstellung"
          densityOptions={[{ value: 'a', label: 'Außerordentlich kompakt' }, { value: 'b', label: 'Standardabstand' }, { value: 'c', label: 'Besonders großzügig' }]}
          onDensityChange={setWide}
        />
      </div>
    </section>
  );
}

export function MoreCases() {
  return (
    <>
      <ChipCases />
      <FileCases />
      <CalloutCases />
      <DialogCases />
      <HoverCases />
      <LoadingCases />
      <ViewMenuCases />
    </>
  );
}
