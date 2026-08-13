# Withink V2

# Design System

Version: 2.0

---

# 1. Design Philosophy

Withink is not simply a journaling application.

It is a calm digital diary.

The interface should disappear into the background and allow writing to become the primary experience.

The goal is not to impress users.

The goal is to make them comfortable.

Every design decision should answer one question:

> "Does this help the user think more clearly?"

If not,

it should probably not exist.

---

# 2. Emotional Goals

Every screen should communicate

• Calmness

• Warmth

• Safety

• Privacy

• Reflection

• Simplicity

• Trust

Never create anxiety.

Never create urgency.

Never create pressure.

Writing should feel peaceful.

---

# 3. Visual Personality

The application should feel like

A leather journal.

A quiet library.

A warm reading room.

A rainy Sunday afternoon.

Fresh paper.

Soft light.

Coffee beside a notebook.

Natural materials.

Human.

Timeless.

Comfortable.

Never futuristic.

Never cyberpunk.

Never corporate.

Never enterprise.

Never flashy.

---

# 4. Inspiration

The following products should inspire quality.

Not appearance.

Apple Journal

Craft

Notion

Arc Browser

Raycast

Linear

Kindle

Medium

Physical Moleskine journals

The application should not resemble any one of them.

Instead,

combine their strongest characteristics into something unique.

---

# 5. Core Design Principles

Everything should follow these principles.

## Writing First

Writing is always the primary content.

Everything else supports it.

Never compete with the editor.

---

## Less but Better

Remove unnecessary controls.

Reduce choices.

Simplify layouts.

Avoid visual clutter.

---

## Intentional

Nothing should feel accidental.

Spacing.

Borders.

Animations.

Typography.

Everything should feel designed.

---

## Comfortable

Users should be able to read for hours.

Avoid eye strain.

Avoid harsh contrast.

Avoid cramped layouts.

---

## Invisible

The interface should disappear while writing.

The user should forget they are using software.

---

# 6. Design Language

Describe the product using these words.

Warm

Calm

Minimal

Elegant

Thoughtful

Premium

Soft

Natural

Focused

Quiet

Human

Refined

Every screen should reinforce these words.

---

# 7. Visual Hierarchy

The user's attention should naturally flow.

Writing

↓

Current Journal

↓

Recent Entries

↓

Flashbacks

↓

Insights

↓

Settings

Nothing should compete with the writing experience.

---

# 8. Layout Philosophy

Never fill empty space.

Whitespace is part of the design.

Spacing creates calmness.

Layouts should breathe.

Avoid dense dashboards.

Prefer fewer elements.

More spacing.

Better typography.

---

# 9. Reading Experience

Reading is as important as writing.

Long journal entries should be enjoyable.

Use comfortable line lengths.

Generous line spacing.

Readable font sizes.

Soft backgrounds.

Minimal distractions.

Reading old entries should feel like reading a book.

---

# 10. Writing Experience

The editor should feel effortless.

The toolbar should disappear when unnecessary.

Autosave should be invisible.

Cursor movement should feel natural.

Selection should feel responsive.

Formatting should never interrupt writing.

The editor should resemble writing on premium paper.

---

# 11. Color Philosophy

Color should communicate emotion before function.

The interface should never rely on bright colors to attract attention.

Instead, color should quietly guide the user's eyes.

Every color should feel intentional.

The journal itself should always remain the visual focus.

Accent colors should support the content rather than dominate it.

---

# 12. Semantic Color System

Never reference colors directly inside components.

Instead, every component should consume semantic design tokens.

Core semantic tokens should include:

Background

Surface

Surface Secondary

Card

Border

Border Hover

Primary

Primary Foreground

Secondary

Muted

Muted Foreground

Accent

Accent Foreground

Success

Warning

Error

Info

Sidebar

Sidebar Border

Editor Background

Editor Selection

Input Background

Hover

Active

Disabled

Focus Ring

Selection

Overlay

Tooltip

Dialog

Popover

Skeleton

These tokens should power every component.

---

# 13. Light Theme

The light theme should resemble high-quality writing paper.

Characteristics:

Warm.

Soft.

Inviting.

Natural.

Comfortable.

Avoid:

Pure white backgrounds.

Bright blue accents.

Cold grays.

Harsh borders.

Preferred feeling:

Premium notebook.

Morning sunlight.

Natural paper.

Cream-colored pages.

Soft shadows.

---

Recommended palette direction:

Background:

Warm Ivory

Cards:

Soft White

Borders:

Warm Gray

Primary Text:

Dark Brown

Secondary Text:

Muted Brown

Accent:

Warm Amber

Success:

Muted Forest

Warning:

Golden Ochre

Danger:

Muted Terracotta

---

# 14. Dark Theme

Dark mode should feel like writing late at night.

The interface should resemble

a quiet library

rather than

a hacker terminal.

Characteristics:

Soft blacks.

Warm charcoal.

Muted grays.

Low eye strain.

Comfortable contrast.

Avoid:

Pure black.

Neon colors.

High saturation.

Strong blue glows.

Preferred feeling:

Leather notebook.

Warm lamp.

Night reading.

Deep shadows.

---

# 15. Theme Switching

Switching themes should feel delightful.

Never flash the screen.

Never reload the page.

The transition should feel smooth and immediate.

User preference should always persist.

The application should remember:

Theme

Paper Feel

Editor preferences

Layout density

---

# 16. Typography Philosophy

Typography defines Withink.

More than colors.

More than animations.

Users spend hours reading.

Typography should reward that.

Every paragraph should feel comfortable.

Every heading should feel intentional.

The interface should never rely on bold typography to create hierarchy.

Hierarchy should primarily come from spacing.

---

# 17. Font Hierarchy

The application should define a complete type scale.

Display

Hero

Heading 1

Heading 2

Heading 3

Title

Subtitle

Body Large

Body

Body Small

Caption

Label

Helper Text

Every typography token should define:

Font size

Weight

Line height

Letter spacing

Text transform

Never define these ad hoc.

---

# 18. Reading Width

Journal entries should never stretch across the full viewport.

Ideal reading width should prioritize comfort over information density.

Long paragraphs should remain easy to scan.

Reading should resemble books rather than websites.

---

# 19. Line Height

Writing should breathe.

Paragraphs should feel open.

Avoid cramped text.

Prefer generous line heights throughout the application.

Reading comfort is more important than fitting more content on screen.

---

# 20. Spacing Philosophy

Whitespace is content.

Spacing communicates hierarchy.

Spacing communicates calmness.

Spacing communicates quality.

Never compress layouts simply because more information fits.

---

# 21. Spacing Scale

Use a consistent spacing system.

Every spacing value should derive from one scale.

Examples include:

4

8

12

16

24

32

40

48

64

80

96

128

Avoid arbitrary spacing values.

Consistency creates polish.

---

# 22. Containers

Content should never touch screen edges.

Every page should feel comfortably padded.

Desktop layouts should prioritize readability.

Wide monitors should not create extremely long content rows.

---

# 23. Cards

Cards should resemble sheets of paper.

Characteristics:

Soft.

Minimal.

Comfortable.

Never heavy.

Cards should rely more on subtle borders than shadows.

Padding should be generous.

Rounded corners should remain consistent throughout the application.

---

# 24. Border Radius

Corners should feel soft.

Never sharp.

Never excessively rounded.

Maintain one consistent radius scale across the product.

Small Radius

Medium Radius

Large Radius

Extra Large Radius

Full Radius

Every component should reuse these values.

---

# 25. Borders

Borders should be subtle.

Never dominate the interface.

Use borders to separate content,

not decorate it.

Prefer low-contrast borders.

Avoid thick outlines.

---

# 26. Shadows

Shadows should communicate elevation.

Nothing else.

Avoid dramatic shadows.

Avoid floating cards.

Prefer depth through contrast and spacing.

Use stronger shadows only for:

Dialogs

Dropdowns

Popovers

Context menus

Everything else should remain understated.

---

# 27. Elevation

Define a small elevation system.

Background

Surface

Card

Popover

Dialog

Toast

Everything should clearly communicate depth without becoming visually noisy.

---

# 28. Icons

Icons should feel lightweight.

Consistent stroke width.

Minimal detail.

Avoid decorative illustrations inside icons.

Icons should support labels rather than replace them.

Whenever possible,

pair icons with text.

Avoid icon-only interfaces.

---

# 29. Illustrations

Illustrations should feel warm.

Handcrafted.

Minimal.

Use them only for:

Onboarding

Empty states

Success screens

Never clutter functional pages with decorative artwork.

Illustrations should communicate emotion,

not information.

---

# 30. Imagery

Images inside journal entries are memories.

Treat them respectfully.

Display them generously.

Avoid aggressive cropping.

Allow users to revisit moments naturally.

Images should feel integrated into the journal,

not attached as files.

---

# 31. Component Philosophy

Every component should feel like it belongs to the same product.

Users should never feel like different pages were built by different designers.

Every component should follow the same visual language.

Consistent spacing.

Consistent typography.

Consistent animation.

Consistent interaction.

Consistency creates trust.

---

# 32. Buttons

Buttons should never demand attention.

Instead, they should quietly guide users.

## Primary Button

Reserved for the most important action.

Examples:

Write

Save

Continue

Export

Characteristics:

• Strong contrast

• Comfortable padding

• Medium font weight

• Soft corners

• Smooth hover transition

• Slight press animation

Never use multiple primary buttons inside the same section.

---

## Secondary Button

Supports the primary action.

Should remain visually quieter.

Used for:

Cancel

Back

Close

Skip

Settings

---

## Ghost Button

Used for low-priority actions.

Should appear almost invisible until hovered.

---

## Danger Button

Should create a brief moment of hesitation.

Use only for destructive actions.

Examples:

Delete Journal

Delete Account

Remove Media

Never overuse danger styling.

---

# 33. Inputs

Forms should feel effortless.

Inputs should:

Have generous padding.

Clear labels.

Helpful placeholder text.

Accessible focus states.

Subtle borders.

Never rely only on placeholder text.

Validation messages should be calm and informative.

---

# 34. Textareas

Textareas should encourage writing.

Avoid tiny input boxes.

Provide comfortable spacing.

Resize naturally.

Support long-form content.

---

# 35. Search

Search should feel instant.

The search bar should become the primary focus while active.

Results should update smoothly.

Never flash loading states.

Highlight matching content naturally.

---

# 36. Dropdowns

Dropdowns should:

Fade in.

Slide slightly.

Close naturally.

Support keyboard navigation.

Never feel abrupt.

---

# 37. Dialogs

Dialogs interrupt workflow.

Use them carefully.

Dialogs should:

Focus user attention.

Blur background slightly.

Animate smoothly.

Never stack multiple dialogs.

Confirmation dialogs should clearly explain consequences.

---

# 38. Sheets

Use sheets for secondary workflows.

Examples:

Settings

Filters

Media Browser

History

Sheets should slide naturally.

Never feel heavy.

---

# 39. Navigation

Navigation should disappear into the background.

Users should always know where they are.

Current page should be subtly highlighted.

Avoid excessive navigation depth.

---

# 40. Sidebar

The sidebar should feel like part of the notebook.

Not an admin panel.

Contents:

Today

Entries

Flashbacks

Insights

Media

Settings

The sidebar should support collapsing.

Collapsed mode should remain usable.

Hover states should feel soft.

---

# 41. Cards

Cards represent meaningful content.

Examples:

Journal previews

Flashbacks

Insights

Statistics

Cards should:

Use generous padding.

Subtle borders.

Minimal shadows.

Soft hover feedback.

Never feel clickable unless they actually are.

---

# 42. Calendar

The calendar should feel like flipping through a journal.

Not scheduling meetings.

Today's date should be clearly visible.

Completed entries should be recognizable without dominating the interface.

Mood indicators should remain subtle.

Navigation should feel effortless.

---

# 43. Journal Editor

The editor is the heart of Withink.

Everything else exists to support it.

Requirements:

Minimal chrome.

Distraction-free.

Large comfortable writing area.

Responsive toolbar.

Excellent typography.

Smooth scrolling.

Natural selection.

Keyboard shortcuts.

Autosave indicators.

Inline image support.

Markdown shortcuts where appropriate.

The editor should remain beautiful with:

One sentence.

One paragraph.

Five thousand words.

Large image galleries.

Mixed formatting.

---

# 44. Toolbar

The toolbar should appear only when useful.

Avoid persistent visual noise.

Toolbar animations should feel elegant.

Icons should remain minimal.

---

# 45. Empty States

Empty states should encourage users.

Never punish them.

Examples:

Start today's reflection.

Capture your first memory.

Every journal begins with one page.

Include subtle illustrations where appropriate.

Never overwhelm users with instructions.

---

# 46. Loading States

Never display blank pages.

Prefer:

Skeletons

Placeholder layouts

Progressive rendering

Optimistic UI

Loading should reassure users.

Not confuse them.

---

# 47. Skeletons

Skeletons should resemble final layouts.

Avoid random gray boxes.

Maintain consistent spacing.

Fade naturally into loaded content.

---

# 48. Toast Notifications

Notifications should be quiet.

Examples:

Saved

Image Uploaded

Entry Updated

Export Ready

Avoid unnecessary celebration.

Never interrupt writing.

---

# 49. Motion Philosophy

Motion exists to communicate.

Not entertain.

Users should notice when animations disappear,

not when they appear.

Motion should improve understanding.

Never distract.

---

# 50. Motion Library

Use:

pnpm add motion

Do not use:

Framer Motion

GSAP

Anime.js

CSS animation libraries

All application animations should be implemented using Motion.

---

# 51. Motion Principles

Animations should feel:

Fast

Natural

Elegant

Purposeful

Subtle

Responsive

Never playful.

Never exaggerated.

---

# 52. Motion Timing

Instant

≈100ms

Fast

≈150ms

Standard

≈200ms

Slow

≈250ms

Avoid animations longer than 300ms.

The interface should always feel responsive.

---

# 53. Hover Animations

Hover should communicate interactivity.

Examples:

Slight elevation.

Soft background transition.

Gentle scaling.

Avoid dramatic effects.

---

# 54. Press Animations

Interactive elements should acknowledge input.

Examples:

Small scale reduction.

Shadow reduction.

Background transition.

Animations should complete quickly.

---

# 55. Page Transitions

Page transitions should be subtle.

Fade.

Slight movement.

Soft easing.

Never delay navigation.

Navigation should always feel immediate.

---

# 56. Lists

Lists should animate naturally.

Adding items.

Removing items.

Sorting.

Filtering.

Transitions should preserve user context.

---

# 57. Scrolling

Scrolling should feel native.

Avoid scroll-jacking.

Support momentum scrolling.

Preserve scroll position whenever possible.

Infinite scrolling should feel seamless.

---

# 58. Focus States

Keyboard users should always know where focus exists.

Focus indicators should be beautiful.

Accessible.

Consistent.

Never remove outlines without replacement.

---

# 59. Micro-interactions

Every interaction deserves feedback.

Examples:

Button presses.

Checkboxes.

Switches.

Theme changes.

Uploads.

Saving.

Deleting.

Searching.

Filtering.

Small moments create memorable products.

---

# 60. Delight

Delight should emerge from quality.

Not gimmicks.

Examples:

Smooth transitions.

Beautiful typography.

Reliable autosave.

Thoughtful empty states.

Elegant loading.

Responsive interactions.

Premium spacing.

Consistency.

Users should describe Withink as:

"It feels effortless."

Not:

"It has cool animations."

---

# 61. Design Checklist

Before shipping any screen ask:

✓ Is writing still the focus?

✓ Is there unnecessary visual noise?

✓ Does spacing feel comfortable?

✓ Is typography readable?

✓ Are interactions obvious?

✓ Does the interface feel calm?

✓ Is accessibility maintained?

✓ Does motion communicate meaning?

✓ Does this feel premium?

✓ Does this feel like Withink?

If any answer is "No",

the design should be revisited.

---

# End of Design System

The Design System defines the visual identity of Withink.

Every new component should conform to this document.

Every future design decision should reinforce these principles.

Consistency is more important than novelty.

The goal is not to impress users.

The goal is to create a place they genuinely enjoy returning to every day.