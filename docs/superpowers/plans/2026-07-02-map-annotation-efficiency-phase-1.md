# Map Annotation Efficiency Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical local query panel, batch maintenance actions, and import-by-name update behavior for the single-map admin editor.

**Architecture:** Keep filtering local to the loaded annotation collection in the admin editor, add narrowly scoped server endpoints for batch field updates and import upsert behavior, and reuse existing map/group/annotation models without introducing new tables. Prefer focused helper types and UI sections over broad refactors.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Turso/libSQL, Leaflet

## Global Constraints

- Keep scope limited to phase-one efficiency features only
- Do not add new database tables
- Batch editing supports only move group, delete, and update one custom field at a time
- Import still handles point annotations only
- Re-import with the same mapped name updates the existing point annotation in the same map
- Keep filtering local in the admin editor; no new server-side query API in this phase

---

### Task 1: Add query model types and local filtering helpers

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/hooks/useAnnotationActions.ts`
- Modify: `src/app/admin/AdminEditor.tsx`

**Interfaces:**
- Consumes: `Annotation`, `FieldTemplate`, existing admin editor local state
- Produces: `AnnotationFilterState`, `FieldFilterRule`, filtered annotations derived from all active conditions

- [ ] Add filter state types to `src/lib/types.ts` for query panel state and field rules.
- [ ] Expand `useAnnotationActions` to accept current field filters and produce filtered annotations based on keyword, types, selected group, and custom-field rules.
- [ ] Update `AdminEditor` state wiring so the list and map both consume the same filtered result set.
- [ ] Run: `npm run lint`
- [ ] Expected: lint passes with the new types and hook usage.

### Task 2: Build the admin query panel UI

**Files:**
- Modify: `src/app/admin/AdminEditor.tsx`
- Optionally create: `src/components/map/AnnotationFilterPanel.tsx`

**Interfaces:**
- Consumes: `AnnotationFilterState`, `FieldTemplate[]`, `Group[]`
- Produces: controlled filter updates and clear-all behavior

- [ ] Add a collapsible query panel in list mode near the existing search area.
- [ ] Support keyword, type multi-select, group single-select, and field rule editors for text/select, number range, and date range fields.
- [ ] Show current hit count and a one-click reset action.
- [ ] Ensure filter changes update the annotation list and map immediately.
- [ ] Run: `npm run lint`
- [ ] Expected: lint passes and no unused UI state remains.

### Task 3: Add batch move/delete/update-field workflows

**Files:**
- Modify: `src/app/admin/AdminEditor.tsx`
- Modify: `src/app/api/annotations/route.ts`
- Modify: `src/lib/server/maps.ts`

**Interfaces:**
- Consumes: selected annotation ids, current field templates, existing group ids
- Produces: batch API payloads for delete, move group, and field update

- [ ] Extend the batch action bar UI to expose move-group and update-field actions in addition to delete.
- [ ] Add a small confirmation flow for each batch action.
- [ ] Extend `/api/annotations` `PUT` handling to support a batch custom-field update operation alongside move-group.
- [ ] Add a server helper to patch or append a custom field value across selected annotations in one request-scoped operation.
- [ ] Run: `npm run lint`
- [ ] Expected: batch actions compile cleanly and existing move behavior still works.

### Task 4: Add import preview summaries and import upsert behavior

**Files:**
- Modify: `src/components/import/ImportDialog.tsx`
- Modify: `src/app/api/annotations/route.ts`
- Modify: `src/lib/server/maps.ts`

**Interfaces:**
- Consumes: mapped import rows, current map id, existing point annotations in that map
- Produces: import preview summary counts and server-side upsert-by-name save behavior

- [ ] Expand import preview derivation to classify rows as create, update, or invalid before submission.
- [ ] Display summary counts in the dialog before the user confirms import.
- [ ] Change the import API path to send enough information for upsert-by-name instead of blind create.
- [ ] Add server logic that, for point imports, looks up an existing point annotation in the same map by `name` and updates it instead of inserting a new row.
- [ ] Preserve the rule that blank incoming values do not overwrite existing values.
- [ ] Run: `npm run lint`
- [ ] Expected: lint passes and import dialog still compiles.

### Task 5: Verify the full admin flow end to end

**Files:**
- Modify: `src/app/admin/AdminEditor.tsx` if fixes are needed
- Modify: any touched helper files if lint or behavior issues are found

**Interfaces:**
- Consumes: the completed phase-one implementation
- Produces: verified, coherent workflow across filtering, batch actions, and import

- [ ] Manually review the main admin editor code paths for list filtering, map rendering, batch actions, and import confirmations.
- [ ] Run: `npm run lint`
- [ ] Expected: exit code 0.
- [ ] Summarize residual risks: large local datasets may need later server-side filtering, and import matching depends on stable `name` values.
