/* Explicit component-to-specimen contract. Markup remains owned by showcase-data.js. */
export const COMPONENT_SPECIMENS = {
  "button": {
    "route": "examples-form-controls",
    "selector": ".uix-btn"
  },
  "input": {
    "route": "examples-form-controls",
    "selector": ".uix-field"
  },
  "textarea": {
    "route": "examples-form-controls",
    "selector": ".uix-textarea"
  },
  "select": {
    "route": "examples-form-controls",
    "selector": ".uix-select-trigger"
  },
  "checkbox": {
    "route": "examples-form-controls",
    "selector": ".uix-checkbox"
  },
  "radio": {
    "route": "examples-form-controls",
    "selector": ".uix-radio-group"
  },
  "switch": {
    "route": "examples-form-controls",
    "selector": ".uix-switch"
  },
  "slider": {
    "route": "examples-form-controls",
    "selector": ".uix-slider"
  },
  "segmented": {
    "route": "examples-form-controls",
    "selector": ".uix-segmented"
  },
  "combobox": {
    "route": "examples-form-controls",
    "selector": ".uix-combobox",
    "anchor": "#rs-type",
    "container": "[data-uix-richselect]"
  },
  "tag-input": {
    "route": "examples-form-controls",
    "selector": ".uix-taginput"
  },
  "file-upload": {
    "route": "examples-form-controls",
    "selector": ".uix-dropzone"
  },
  "date-range-picker": {
    "route": "examples-date-range-picker",
    "selector": ".uix-date-range-picker"
  },
  "color-picker": {
    "route": "examples-color-picker",
    "selector": ".uix-color-picker"
  },
  "metric-input": {
    "route": "examples-metrics",
    "selector": ".uix-metric-input"
  },
  "form": {
    "route": "examples-form-controls",
    "selector": ".uix-form-grid"
  },
  "app-shell": {
    "route": "examples-navigation",
    "selector": ".uix-shell"
  },
  "sidebar": {
    "route": "examples-navigation",
    "selector": ".uix-sidebar"
  },
  "breadcrumbs": {
    "route": "examples-navigation",
    "selector": ".uix-breadcrumbs"
  },
  "tabs": {
    "route": "examples-navigation",
    "selector": ".uix-tabs"
  },
  "pagination": {
    "route": "examples-navigation",
    "selector": ".uix-pagination"
  },
  "steps": {
    "route": "examples-navigation",
    "selector": ".uix-steps"
  },
  "stepper": {
    "route": "examples-form-controls",
    "selector": ".uix-stepper"
  },
  "page-header": {
    "route": "examples-navigation",
    "selector": ".uix-page-header"
  },
  "command-palette": {
    "route": "examples-navigation",
    "selector": ".uix-cmdk"
  },
  "menu": {
    "route": "examples-navigation",
    "selector": ".uix-menu"
  },
  "nav-favourites": {
    "route": "examples-navigation",
    "selector": ".uix-sidebar"
  },
  "card": {
    "route": "examples-data-display",
    "selector": ".uix-card"
  },
  "table": {
    "route": "examples-data-display",
    "selector": ".uix-table-wrap"
  },
  "table-toolbar": {
    "route": "examples-data-display",
    "selector": ".uix-toolbar"
  },
  "list": {
    "route": "examples-data-display",
    "selector": ".uix-list"
  },
  "description-list": {
    "route": "examples-overlays",
    "selector": ".uix-dl"
  },
  "status-pill": {
    "route": "examples-data-display",
    "selector": ".uix-pill"
  },
  "avatar": {
    "route": "examples-data-display",
    "selector": ".uix-avatar"
  },
  "stat-tile": {
    "route": "examples-data-display",
    "selector": ".uix-stat"
  },
  "progress": {
    "route": "examples-data-display",
    "selector": ".uix-progress"
  },
  "meter": {
    "route": "examples-data-display",
    "selector": ".uix-meter"
  },
  "timeline": {
    "route": "examples-data-display",
    "selector": ".uix-timeline"
  },
  "tree": {
    "route": "examples-data-display",
    "selector": ".uix-tree"
  },
  "calendar": {
    "route": "examples-data-display",
    "selector": ".uix-calendar"
  },
  "chart": {
    "route": "examples-data-display",
    "selector": ".uix-chart"
  },
  "tooltip": {
    "route": "examples-data-display",
    "selector": ".uix-tooltip"
  },
  "states": {
    "route": "examples-data-display",
    "selector": ".uix-empty"
  },
  "alert": {
    "route": "examples-overlays",
    "selector": ".uix-alert"
  },
  "toast": {
    "route": "examples-overlays",
    "selector": ".uix-toast"
  },
  "modal": {
    "route": "examples-overlays",
    "selector": ".uix-dialog",
    "parts": ["[data-uix-open=\"#demo-modal\"]", "#demo-modal"]
  },
  "drawer": {
    "route": "examples-overlays",
    "selector": ".uix-drawer",
    "parts": ["[data-uix-open=\"#demo-drawer\"]", "#demo-drawer"]
  },
  "popover": {
    "route": "examples-overlays",
    "selector": ".uix-popover",
    "parts": ["[popovertarget=\"demo-pop\"]", "#demo-pop"]
  },
  "peek": {
    "route": "examples-overlays",
    "selector": ".uix-peek",
    "parts": ["[data-uix-open-peek]", "#demo-peek"]
  },
  "spinner": {
    "route": "examples-overlays",
    "selector": ".uix-spinner"
  },
  "lightbox": {
    "route": "examples-images",
    "selector": ".uix-lightbox",
    "parts": ["[data-uix-lightbox]", "[data-uix-lightbox-dialog]"]
  },
  "inbox": {
    "route": "examples-crm-itsm",
    "selector": ".uix-inbox"
  },
  "kanban": {
    "route": "examples-crm-itsm",
    "selector": ".uix-kanban"
  },
  "detail-layout": {
    "route": "examples-crm-itsm",
    "selector": ".uix-detail"
  },
  "comments": {
    "route": "examples-crm-itsm",
    "selector": ".uix-comments"
  },
  "composer": {
    "route": "examples-crm-itsm",
    "selector": ".uix-composer"
  },
  "contact-card": {
    "route": "examples-crm-itsm",
    "selector": ".uix-contact"
  },
  "attachment": {
    "route": "examples-crm-itsm",
    "selector": ".uix-attachments"
  },
  "audit-log": {
    "route": "examples-crm-itsm",
    "selector": ".uix-audit"
  },
  "notification-center": {
    "route": "examples-crm-itsm",
    "selector": ".uix-notifs"
  },
  "pipeline": {
    "route": "examples-workflows-pipelines",
    "selector": ".uix-pipeline"
  },
  "sla": {
    "route": "examples-crm-itsm",
    "selector": ".uix-sla"
  },
  "heartbeat": {
    "route": "examples-utility",
    "selector": ".uix-heartbeat"
  },
  "rule-builder": {
    "route": "examples-rule-builder",
    "selector": ".uix-rule-builder"
  },
  "builder-canvas": {
    "route": "examples-builder-canvas",
    "selector": ".uix-builder-canvas"
  },
  "relationship-graph": {
    "route": "examples-relationship-graph",
    "selector": ".uix-relationship-graph"
  },
  "scheduling-calendar": {
    "route": "examples-scheduling-calendar",
    "selector": ".uix-scheduling-calendar"
  },
  "diff-viewer": {
    "route": "examples-diff-viewer",
    "selector": ".uix-diff-viewer"
  },
  "match-review": {
    "route": "examples-match-review",
    "selector": ".uix-match-review"
  },
  "license-position-bar": {
    "route": "examples-metrics",
    "selector": ".uix-license-position"
  },
  "brand-profiles": {
    "route": "examples-brand-profiles",
    "selector": ".uix-brand-profiles"
  },
  "flow": {
    "route": "examples-workflows-pipelines",
    "selector": ".uix-flow"
  },
  "typography": {
    "route": "examples-foundations",
    "selector": ".uix-text-display"
  },
  "prose": {
    "route": "examples-prose",
    "selector": ".uix-prose"
  },
  "editorial-home": {
    "route": "examples-editorial-home",
    "selector": ".uix-featured__stage"
  },
  "labels": {
    "route": "examples-crm-itsm",
    "selector": ".uix-label"
  },
  "reactions": {
    "route": "examples-crm-itsm",
    "selector": ".uix-reactions"
  },
  "media": {
    "route": "examples-images",
    "selector": ".uix-media"
  },
  "kbd": {
    "route": "examples-utility",
    "selector": ".uix-kbd"
  },
  "link": {
    "route": "examples-utility",
    "selector": ".uix-link--quiet"
  },
  "utility-bits": {
    "route": "examples-utility",
    "selector": ".uix-code"
  },
  "view-menu": {
    "route": "examples-workspace",
    "selector": ".uix-view-menu"
  },
  "filter-popover": {
    "route": "examples-data-display",
    "selector": ".uix-filter-popover"
  },
  "saved-view-menu": {
    "route": "examples-data-display",
    "selector": ".uix-saved-views"
  },
  "relative-time": {
    "route": "examples-utility",
    "selector": "[data-uix-relative-time]"
  },
  "confirm-dialog": {
    "route": "examples-overlays",
    "selector": "#demo-confirm",
    "parts": ["[data-uix-open=\"#demo-confirm\"]", "#demo-confirm"]
  },
  "prompt-dialog": {
    "route": "examples-overlays",
    "selector": "#demo-prompt",
    "parts": ["[data-uix-open=\"#demo-prompt\"]", "#demo-prompt"]
  },
  "async-operation-status": {
    "route": "examples-overlays",
    "selector": ".uix-operation"
  },
  "detail-page": {
    "route": "examples-workspace",
    "selector": ".uix-detail-page"
  },
  "related-links": {
    "route": "examples-workspace",
    "selector": ".uix-related-links"
  },
  "toggle-row": {
    "route": "examples-form-controls",
    "selector": ".uix-toggle-row"
  },
  "collapsible-section": {
    "route": "examples-data-display",
    "selector": ".uix-collapsible"
  }
};
