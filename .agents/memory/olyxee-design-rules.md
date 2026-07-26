---
name: Olyxee design rules
description: The user's brand design doctrine (from Olyxee_Design_Rule PDF in attached_assets) that all Orgni/Olyxee UI work must follow.
---

Source: `attached_assets/Olyxee_Design_Rule_1785088800220.pdf` (read it for full detail).

Key rules to apply on every UI change:
- Fonts: Inter/Geist/IBM Plex Sans/Manrope only (site uses Geist, compliant). Mono only for IDs, code, technical values.
- Icons: Lucide, consistent stroke, no decorative icons, filled = active state only.
- Sentence case; avoid unnecessary uppercase; max 3 font weights per screen; body line-height 1.4-1.6.
- Neutral white/grey surfaces; borders sparingly; semantic colours only with stable meaning (never decorative); pale bg + darker text for badges.
- Shadows soft and restrained (tokens --shadow-xs..--shadow-overlay in artifacts/web/src/index.css); not on every card.
- Radius scale 4-20px; don't over-round.
- Motion must explain something; ≤500ms; tokens --duration-* and --ease-* in index.css; no springs on serious financial actions; no continuous motion in dashboards; respect prefers-reduced-motion (global CSS block added).

User-confirmed preference (July 2026): UI icons should be black/grey neutrals (e.g. text-foreground/70 in a bg-muted square), not orange/primary-tinted.

**Why:** User uploaded this doctrine and asked that all design work follow it (July 2026).
**How to apply:** Check any new component/section against these rules before finishing; prefer the CSS tokens over ad-hoc values.
