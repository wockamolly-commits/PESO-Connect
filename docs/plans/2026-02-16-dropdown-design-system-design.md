# Dropdown Design System — Design Document

**Date:** 2026-02-16
**Status:** Approved (refined)

## Goal

Replace default browser `<select>` styling across PESO-Connect with a unified, glassmorphic dropdown aesthetic. Two-layer approach: CSS utility for simple selects, enhanced React component for rich dropdowns.

## Decisions

- **No new dependencies.** Pure CSS animations. No Framer Motion, no Headless UI.
- **Full keyboard/accessibility support** from the start (ArrowUp/Down, Enter/Space, Escape, type-ahead, ARIA roles).
- **All-at-once migration** — all 7 files in one pass.

## Approach: Hybrid (CSS + Component)

### Layer 1: `.input-select` CSS Utility

Added to `src/index.css` inside `@layer components`.

- Extends existing `.input-field` base (same border, focus ring, rounded-xl)
- `appearance: none` to remove native browser chevron
- Custom inline SVG background-image: thin chevron-down (Lucide-style, 1.5px stroke)
- `pr-10` padding, `background-position: right 12px center`
- `bg-white/50` semi-transparent background, `cursor-pointer`

Dark variant `.input-select-dark` for admin panel:
- `bg-slate-800`, `border-slate-700`, `text-slate-200`
- White chevron SVG, indigo focus ring

### Layer 2: `<Select>` Component

Location: `src/components/common/Select.jsx` (replaces existing `CustomDropdown.jsx`)

**Props:**
- `options`: `[{ value, label, icon?, description? }]`
- `value`, `onChange(value)`, `placeholder`, `icon` (leading Lucide icon)
- `disabled`, `className`

**Trigger:** `<button>` with `bg-white/50 backdrop-blur-sm`, `border-2 border-gray-200`, `rounded-xl`. Focus: `border-primary-400 ring-4 ring-primary-100`. Rotating chevron (180deg CSS transition).

**Panel:** `bg-white/95 backdrop-blur-md`, `shadow-xl`, `rounded-xl`, `border border-white/50`. Scale-in CSS animation: `scale(0.95) -> scale(1)` + `opacity 0 -> 1` over 150ms ease-out. `max-height: 240px` with `overflow-y: auto`.

**Options:** Hover `bg-gray-50`. Selected: `bg-primary-50 text-primary-700` + check icon. Support for optional `description` (small gray text) and `icon` (Lucide icon on left).

**Keyboard:**
- ArrowDown/Up: move highlight (wraps)
- Enter/Space: select highlighted, close
- Escape: close without selecting
- Type-ahead: jump to first matching label

**Accessibility:**
- `role="listbox"` on panel, `role="option"` on items
- `aria-expanded`, `aria-activedescendant`, `aria-selected`
- Trigger is a native `<button>` for focus

## Migration Map

| File | Select(s) | Treatment |
|---|---|---|
| JobseekerProfileEdit.jsx | Gender, Civil Status, Education, Relocate, Language | `.input-select` |
| EmployerProfileEdit.jsx | Employer Type, Company Size | `.input-select` |
| Step4Education.jsx | Highest Education | `.input-select` |
| PostJob.jsx | Education Level | `.input-select` |
| JobListings.jsx | Category, Type filters | `.input-select` |
| MyListings.jsx | Status dropdown | `.input-select` |
| admin/SearchAndFilters.jsx | Education Level | `.input-select-dark` |

**Showcase migration:** `Register.jsx` role selector — currently uses `CustomDropdown` with icons/descriptions, migrates to the new `<Select>` component.

## Deletions

- `src/components/CustomDropdown.jsx` — replaced by `src/components/common/Select.jsx`
- All imports of `CustomDropdown` updated to `Select` from new path

## Dependencies

None added. Pure CSS animations. Zero new packages.
