---
version: alpha
name: Copper Relationship Desk
description: Warm, tactile skeuomorphic CRM dashboard that feels like a physical leather-and-paper relationship desk. Soft cream surfaces, deep brown navigation, gold accents, rounded layered cards, and gentle shadows create a calm, professional, human-centred sales workspace.
colors:
  background: "#F8F1E9"
  surface: "#FFFBF5"
  surface-elevated: "#FFFFFF"
  sidebar: "#3D2B1F"
  sidebar-hover: "#4A3528"
  primary: "#C9A227"
  primary-hover: "#B8911F"
  primary-foreground: "#FFFFFF"
  text: "#2C1E12"
  text-muted: "#6B5B4D"
  text-subtle: "#9C8B7A"
  border: "#E8D9C8"
  border-strong: "#D4C2A8"
  success: "#4A7C59"
  warning: "#C17A3A"
  danger: "#A85A4A"
  info: "#5A7A9A"
  metric-positive: "#3D7A4A"
  metric-neutral: "#6B5B4D"
typography:
  font-sans: "Inter, system-ui, -apple-system, sans-serif"
  h1:
    fontFamily: "{typography.font-sans}"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "{typography.font-sans}"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "{typography.font-sans}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "{typography.font-sans}"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "{typography.font-sans}"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  metric:
    fontFamily: "{typography.font-sans}"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.1
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
components:
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    shadow: "0 1px 3px rgba(44, 30, 18, 0.06), 0 1px 2px rgba(44, 30, 18, 0.04)"
  card-elevated:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    shadow: "0 4px 12px rgba(44, 30, 18, 0.08), 0 2px 4px rgba(44, 30, 18, 0.04)"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    fontWeight: 600
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    borderWidth: 1px
    rounded: "{rounded.md}"
    padding: "8px 16px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(255, 255, 255, 0.75)"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  badge:
    rounded: "{rounded.full}"
    padding: "2px 8px"
    fontSize: 11px
    fontWeight: 500
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  table-header:
    backgroundColor: "#F5EDE4"
    textColor: "{colors.text-muted}"
    fontSize: 12px
    fontWeight: 500
---

## Overview
A warm, tactile, skeuomorphic CRM workspace that feels like a physical relationship desk. Soft parchment and cream surfaces sit against a deep chocolate sidebar. Gold accents highlight primary actions and the active navigation state. Cards have gentle elevation and rounded corners that suggest paper or leather layers rather than flat digital planes. The overall mood is calm, professional, and human — optimised for sales people who spend long hours reviewing pipeline and relationships.

## Colors
- **Background (#F8F1E9)**: Soft warm cream used for the main canvas. Evokes aged paper or a sunlit desk.
- **Surface (#FFFBF5)**: Slightly brighter off-white for cards and panels so they lift gently off the background.
- **Sidebar (#3D2B1F)**: Deep rich brown that anchors the left navigation and feels like leather or dark wood.
- **Primary (#C9A227)**: Muted gold/amber used for the active nav item, primary buttons (“Add deal”), and key highlights. Never neon or pure yellow.
- **Text (#2C1E12)**: Near-black warm brown for primary content so it remains soft on the eye.
- **Text muted (#6B5B4D)**: Secondary labels, timestamps, and helper text.
- Semantic colours (success, warning, danger) are deliberately desaturated so they sit quietly inside the warm palette rather than shouting.

## Typography
Clean, highly legible system sans-serif (Inter or equivalent). Headings are bold and slightly tighter for hierarchy. Body text stays at 14 px with comfortable line-height. Metric numbers are large and heavy so pipeline values can be scanned instantly. Labels and badges use smaller sizes with medium weight.

## Layout
- Fixed left sidebar (~240 px) containing workspace navigation, saved views, and user profile.
- Main content area uses a flexible card grid: top metrics row (4 equal cards), then a two-column section (pipeline rail + next actions), then a full-width priority ledger table with a side relationship log.
- Generous internal padding (16–24 px) and consistent 12–16 px gaps between cards keep the interface breathing.
- Pipeline stages appear as a horizontal sequence of equal-width cards inside a lightly bordered container.

## Elevation & Depth
Subtle, multi-layer soft shadows (never harsh or coloured) give cards a physical presence. Active or elevated cards receive a slightly stronger shadow. Borders are 1 px warm neutrals rather than pure grey. No glassmorphism or heavy gradients — depth comes from layering and soft lighting.

## Shapes
All interactive and content containers use generous but controlled rounding (10–14 px). Badges and status pills are fully rounded. Inputs and secondary buttons sit at the medium radius. Avoid sharp 0 px corners and overly bubbly 24 px+ radii.

## Components
- **Cards**: Soft surface colour, 1 px warm border, medium-large radius, quiet shadow. Used for metrics, pipeline stages, next-actions list, and tables.
- **Primary button**: Solid gold fill, white text, medium radius, medium weight. Used sparingly for the highest-priority action (“+ Add deal”).
- **Secondary / ghost buttons**: Surface background + warm border.
- **Navigation items**: Transparent by default; gold fill + white text when active.
- **Status badges**: Soft coloured backgrounds with matching text (High, Meeting, Blocked, Done, etc.).
- **Tables**: Warm header row, generous cell padding, subtle row separators, status chips in the Risk column.
- **Metric cards**: Large bold number, small supporting label and trend indicator, optional circular icon on the right.

## Do's and Don'ts
**Do**
- Keep the colour temperature consistently warm (cream, brown, gold).
- Use soft shadows and 1 px borders to create gentle physical depth.
- Prefer large, scannable numbers for pipeline and forecast metrics.
- Maintain generous spacing so the desk never feels cramped.
- Use gold only for primary actions and the active navigation state.

**Don't**
- Introduce cool greys, pure blacks, or neon accents.
- Use flat design with zero elevation or hard drop shadows.
- Overcrowd the pipeline stages or metric cards.
- Make the sidebar light or the main background dark.
- Apply heavy glass, blur, or skeuomorphic textures that compete with readability.