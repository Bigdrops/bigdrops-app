Divine Blood

«Golden light meets sacred crimson. Two modes, one visual bloodline.»

1. Design Philosophy

Divine Blood is a warm editorial financial interface built around two visual modes:

- Gold Light — luminous, paper-like, golden-hour warmth.
- Crimson Dark — deep, dramatic, near-black crimson depth.

The modes share the same visual vocabulary rather than being completely isolated palettes.

The defining rule is:

«One color leads. The other whispers.»

Gold Light is predominantly white and gold with restrained crimson details.

Crimson Dark is predominantly black and crimson with restrained gold details.

The secondary color may appear throughout the interface, but it must never overpower the dominant mode.

---

2. Color Hierarchy

Gold Light

Primary foundation

- Warm white
- Paper white
- Soft warm neutrals

Dominant accent

- Gold
- Amber
- Honey

Secondary accent

- Crimson

Recommended visual distribution:

- 70–80% white / warm neutral surfaces
- 15–20% gold
- ~5% crimson

Crimson should feel intentional and precious rather than ubiquitous.

Appropriate uses:

- Risk indicators
- Premium labels
- Small status dots
- Selected chart details
- Warning borders
- Small decorative marks
- Occasional emphasized metrics
- Micro-interactions

Crimson should not become the primary background, primary button, or dominant large-scale surface in Gold Light.

---

Crimson Dark

Primary foundation

- Near-black
- Black
- Deep crimson-black

Dominant accent

- Crimson
- Burgundy
- Deep red

Secondary accent

- Gold

Recommended visual distribution:

- 70–80% black / crimson-black surfaces
- 15–20% crimson
- ~5% gold

Gold should feel like an ember or precious-metal highlight.

Appropriate uses:

- Featured metrics
- Premium indicators
- Selected chart bars
- Small icon highlights
- Navigation details
- Focus states
- Micro-interactions
- Important data emphasis

Gold should not become the dominant background or primary surface in Crimson Dark.

---

3. Dominance Rule

Every component should answer two questions:

What belongs to the mode?

This determines the dominant visual treatment.

Gold Light:

«White + Gold»

Crimson Dark:

«Black + Crimson»

What provides contrast or character?

This determines where the secondary color may appear.

Gold Light:

«Crimson»

Crimson Dark:

«Gold»

The secondary color is allowed, but it should generally occupy a smaller visual area, have lower frequency, or carry greater semantic importance.

---

4. Color Tokens

Gold Light

:root {
  --color-canvas: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-surface-inset: #F7F5F1;

  --color-ink: #18181B;
  --color-ink-secondary: #5C5A55;
  --color-ink-muted: #71717A;

  --color-primary: #D9962B;
  --color-primary-deep: #B4770F;
  --color-primary-highlight: #E8B33C;

  --color-secondary: #8B0000;
  --color-secondary-soft: #A52A2A;
  --color-secondary-wash: rgba(139, 0, 0, 0.07);

  --color-border: #E8E5DF;
  --color-border-strong: #DBD7CF;

  --color-button: #18181B;
  --color-button-text: #FFFFFF;
}

Crimson Dark

[data-theme="dark"] {
  --color-canvas: #0F0A0A;
  --color-surface: #1A1111;
  --color-surface-inset: #241818;

  --color-ink: #F5F0EB;
  --color-ink-secondary: #B8A89C;
  --color-ink-muted: #9A8B80;

  --color-primary: #C43E3E;
  --color-primary-deep: #8B0000;
  --color-primary-highlight: #A52A2A;

  --color-secondary: #E8B33C;
  --color-secondary-soft: #F3BD48;
  --color-secondary-wash: rgba(232, 179, 60, 0.08);

  --color-border: #3D2525;
  --color-border-strong: #4A2E2E;

  --color-button: #F5F0EB;
  --color-button-text: #18181B;
}

---

5. Accent Usage Rules

Gold Light

Gold owns:

- Primary actions
- Active navigation
- Featured data
- Icon tiles
- Progress indicators
- Hero treatment
- Selected states

Crimson supports:

- Risk
- Warnings
- Premium details
- Occasional emphasis
- Secondary chart series
- Small decorative moments

Crimson Dark

Crimson owns:

- Primary actions
- Active navigation
- Featured data
- Hero treatment
- Risk states
- Progress indicators
- Selected states

Gold supports:

- Premium details
- Featured metrics
- Icon highlights
- Secondary chart series
- Important data points
- Small decorative moments

---

6. The 80/20 Principle

The secondary color should generally occupy no more than approximately 20% of a component's visual emphasis.

This is not a strict pixel measurement.

It is a hierarchy rule.

A crimson badge on a Gold Light card is acceptable.

A crimson hero background with gold text in Gold Light is not.

A gold metric highlight in Crimson Dark is acceptable.

A gold-dominated dashboard in Crimson Dark is not.

When uncertain, ask:

«"Which color does my eye notice first?"»

The answer should always be the mode's dominant color.

---

7. Photography

Gold Light

Use warm golden-hour photography.

Characteristics:

- Wheat
- Sunlight
- Amber atmosphere
- Cream highlights
- Warm skin tones
- Soft shadows

Gold should naturally emerge from the photography.

Small amounts of crimson may appear naturally in:

- Clothing
- Architecture
- Editorial props
- Decorative details

Do not artificially tint the entire photograph crimson.

Crimson Dark

Use the same photographic subject matter only when useful, but transform it substantially.

Characteristics:

- Crushed blacks
- Deep crimson shadows
- Burgundy atmosphere
- Controlled highlights
- Dramatic contrast

Gold may appear as a restrained highlight.

The dark mode should feel like the same world after sunset, not a completely unrelated product.

---

8. Hero Treatment

Gold Light

Primary gradient:

linear-gradient(
  90deg,
  #B4770F 0%,
  #D9962B 45%,
  rgba(217, 150, 43, 0) 100%
);

Optional crimson detail:

- Small premium badge
- Fine decorative line
- Tiny status indicator

Crimson Dark

Primary gradient:

linear-gradient(
  90deg,
  #8B0000 0%,
  #A52A2A 50%,
  rgba(15, 10, 10, 0) 100%
);

Optional gold detail:

- Featured metric
- Tiny icon
- Premium indicator
- Fine highlight line

---

9. Data Visualization

Charts should follow the dominant/supporting relationship.

Gold Light

- Neutral bars: warm gray
- Primary series: gold
- Secondary series: restrained crimson
- Featured bar: bright gold
- Risk markers: crimson

Crimson Dark

- Neutral bars: dark crimson
- Primary series: crimson
- Secondary series: restrained gold
- Featured bar: bright crimson
- Premium/highlight markers: gold

Avoid introducing unrelated colors merely to make charts colorful.

---

10. Interaction States

Interaction states inherit the dominant color.

Gold Light

Hover:

- Slightly brighter gold
- Warm surface lift

Active:

- Deeper gold

Focus:

- Gold outline

Secondary crimson elements:

- May brighten slightly on interaction

Crimson Dark

Hover:

- Brighter crimson
- Slight crimson glow

Active:

- Deeper/brighter crimson depending on surface

Focus:

- Bright crimson outline

Secondary gold elements:

- May brighten slightly on interaction

No blue browser-style visual language should appear in the designed interface.

---

11. Semantic Color Principle

Semantic information does not require introducing unrelated colors.

Use:

- Color
- Label
- Icon
- Border
- Pattern
- Typography
- Position

together to communicate meaning.

For example:

HIGH RISK
[crimson indicator]

is stronger than relying exclusively on a red color change.

Similarly:

PREMIUM
[gold indicator]

can communicate importance in Crimson Dark without making gold the dominant palette.

---

12. Surface & Elevation

Gold Light

Elevation is communicated primarily through lightness.

Golden wallpaper
      ↓
Warm-white frame
      ↓
White card
      ↓
Warm-white inset

Use:

- Very soft shadows
- Hairline borders
- Subtle surface changes

Crimson Dark

Elevation is communicated primarily through depth.

Crimson atmosphere
      ↓
Near-black frame
      ↓
Crimson-black card
      ↓
Deep inset

Use:

- Surface tinting
- Crimson hairlines
- Extremely restrained glow
- Minimal shadows

---

13. Theme Transition

Switching between modes should feel like the same financial instrument changing atmosphere.

Duration:
300ms

Transition:
ease-in-out

Animate:

- Background
- Surface
- Border
- Text
- Accent
- Shadow
- Glow

The layout must not move.

Typography must not change.

Component geometry must not change.

Only the visual atmosphere changes.

---

14. Responsive Principle

The color hierarchy remains unchanged at every breakpoint.

Mobile does not become more crimson.

Desktop does not become more gold.

The dominant/supporting relationship remains consistent.

Only:

- Density
- Layout
- Navigation
- Component stacking
- Typography scale

change responsively.

---

15. Palette Contamination Test

Gold Light review

Ask:

- Is white/warm neutral visually dominant?
- Is gold the first accent the eye notices?
- Is crimson restrained?
- Does any crimson surface overpower the gold system?
- Are large surfaces still predominantly white?
- Could removing crimson leave the mode visually coherent?

Crimson Dark review

Ask:

- Is black/crimson-black visually dominant?
- Is crimson the first accent the eye notices?
- Is gold restrained?
- Does any gold surface overpower the crimson system?
- Are large surfaces still predominantly dark?
- Could removing gold leave the mode visually coherent?

A mode passes when the secondary color feels intentional but non-essential to the overall identity.

---

16. Brand Expression

Divine Blood should feel:

- Editorial
- Wealth-oriented
- Atmospheric
- Precise
- Mature
- Slightly mysterious
- Warm
- Premium

It should not feel:

- Generic fintech
- Neon
- Cyberpunk
- Luxury-fashion cliché
- Overly corporate
- Overly colorful

The interface should feel like a financial terminal designed by an editorial art director.

Gold Light: daylight, paper, wealth, clarity.

Crimson Dark: night, depth, power, intensity.

Both belong to the same world.

---

17. Final Design Rule

«White and gold lead in Gold Light.

Crimson and black lead in Crimson Dark.

The opposing accent is always permitted, but always subordinate.

The mode determines what dominates; the brand determines what connects them.»