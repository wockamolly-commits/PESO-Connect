# Dropdown Design System — Design Document

**Date:** 2026-02-16
**Status:** Approved

## Goal

Replace default browser `<select>` styling across PESO-Connect with a unified, glassmorphic dropdown aesthetic. Two-layer approach: CSS utility for simple selects, enhanced React component for rich dropdowns.

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

Location: `src/components/common/Select.jsx` (enhanced from existing unused `CustomDropdown.jsx`)

**Props:**
- `options`: `[{ value, label, icon?, description? }]`
- `value`, `onChange`, `placeholder`, `icon` (leading Lucide icon)
- `variant`: `"light"` (default) | `"dark"`
- `disabled`, `className`

**Trigger:** Glassmorphic button with `bg-white/50 backdrop-blur-sm`, rotating chevron.

**Panel:** `bg-white/95 backdrop-blur-md`, `shadow-xl`, `rounded-xl`. Scale-in CSS animation (150ms ease-out). Max-height with scroll. Options show hover states, check icon for selected.

**Keyboard:** ArrowDown/Up navigation, Enter/Space select, Escape close, type-ahead.

**Dark variant:** `bg-slate-800/95`, `border-slate-700`, `bg-slate-700` hover.

## Migration Map

| File | Select(s) | Treatment |
|---|---|---|
| JobseekerProfileEdit.jsx | Gender, Civil Status, Education, Relocate, Language | `.input-select` |
| EmployerProfileEdit.jsx | Employer Type, Company Size | `.input-select` |
| Step4Education.jsx | Highest Education | `.input-select` |
| PostJob.jsx | Education Level | `.input-select` |
| JobListings.jsx | Category, Type filters | `.input-select` |
| MyListings.jsx | Status dropdown | `.input-select` (adapted for pill shape) |
| admin/SearchAndFilters.jsx | Education Level | `.input-select-dark` |

## Deletions

- `src/components/CustomDropdown.jsx` — replaced by `src/components/common/Select.jsx`

## Dependencies

None added. Pure CSS animations (no Framer Motion). No Headless UI.
