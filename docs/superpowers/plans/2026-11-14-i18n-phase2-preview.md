# i18n Phase 2 — File Previews (Module 22, FilePreviewContent + ZoomablePreview + PdfPages + MermaidDiagram + ImagePreview)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the file-preview surfaces — the preview body and header, error boundary, zoom controls, PDF pages (native and PDF.js paths), image and Mermaid previews — into Simplified and Traditional Chinese.

**Architecture:** Add a `preview` dictionary domain (68 keys). Interactive function components get `const t = useT()`; the class component `FilePreviewBoundary` and the module-level CodeMirror annotation extension factory read the module-level `t`, so their notifications and gutter-marker titles resolve the locale at call time. The annotation-limit notice formats its number with `getCurrentLocale()` instead of a hardcoded `"en-US"`.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate file names, paths, `PDF`/`HTML`/`Mermaid` proper nouns, CSS class names, lazy-chunk names (`file-preview`, `pdf-pages`), or the numeric `100%`/zoom labels.

---

### Task 1: Add the `preview` dictionary domain

- [x] Keys: header actions (copy, refresh, source mode, diagram/preview labels, changes toggle, close, new-workspace-here), region aria labels, empty/loading/unsupported states, per-media notices (image, PDF, audio, binary, HTML sandbox and oversize), truncation and line-match banners, annotation-limit notices, review-comment gutter title, error-boundary fallback, zoom controls (zoom in/out, fit, actual size, fullscreen, pan hint, toolbar/viewport aria), Mermaid states, PDF pages navigation (previous/next, page range, error states).
- [x] zh-Hans and zh-Hant sync (檔案預覽/重新整理預覽/原始碼/全螢幕/音訊/二進位檔/字元 Hant).

### Task 2: Migrate FilePreviewContent.tsx and FilePreviewBoundary.tsx

- [x] Preview body: header buttons, mode toggle, changes/file regions, every state banner and media notice use `useT`.
- [x] The annotation extension factory (outside React) uses the module-level `t` for the too-long notice and gutter marker title; the limit number formats via `getCurrentLocale()`.
- [x] The class-component boundary fallback uses the module-level `t`.

### Task 3: Migrate ZoomablePreview, PdfPreview/PdfPages, ImagePreview, MermaidDiagram, LazyFilePreviewContent

- [x] Zoom controls (including `Fit`, `Actual size`, fullscreen pair, pan hint) and the `{label}`-prefixed toolbar/viewport aria labels.
- [x] PDF: iframe title, loading/error states, page navigation; `PDF: {name}`/`PDF preview: {name}` translate; PDF.js and native-viewer paths share the keys.
- [x] Image: loading, undecodable notice, `{name}` aria; Mermaid: rendering/empty/failed/show-source; the lazy Suspense fallback mirrors the real header.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes.
- [x] ZoomablePreview test passes; the FilePreviewRecovery DOM suite keeps its pre-existing local preload failure (CI runs it).
- [x] Diff-vs-main literal audit: 37 removed literals, all present in `en.ts`; skip regex gained CSS-class names and `en-US`.
- [x] Three-dictionary check: 2095 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- File names and paths, `PDF`/`HTML`/`Mermaid` proper nouns, CSS classes, lazy-chunk names, zoom percentage labels, CodeMirror's built-in search panel phrases (external library UI).
