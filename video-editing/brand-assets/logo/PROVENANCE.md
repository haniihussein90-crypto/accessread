# zaviqu-logo-gold-extracted.png — provenance

No standalone Zaviqu logo file (vector or otherwise) exists anywhere in
this repository — confirmed by a full search before this asset was
created. This PNG was extracted directly from the actual message-card
artwork visible on screen in `53812b06-008__Gift_Campaign.mp4` (the frame
at 00:04.75), not redrawn or recreated:

1. Extracted the cleanest, most front-on frame showing the physical
   message card (icon + "ZAVIQU" wordmark + divider line + heart).
2. Corrected the card's photographed perspective tilt (~10°) with a
   single rotation so the wordmark and divider line are level.
3. Cropped tightly to the logo lockup, inpainted the two corners where
   the necklace chain crossed over the card edges, then denoised and
   lightly sharpened to counteract video-compression softness.
4. Removed the parchment-card background entirely (luminance threshold
   + connected-component filtering to drop leftover chain/border specks),
   leaving only the gold ink — icon, wordmark, rule, heart — on a
   transparent PNG. This is what makes it usable as a real logo overlay
   on any background (see `add_brand_end_card.py`) instead of looking
   like a pasted screenshot with a visible rectangle.

This is the real, existing lockup (four-diamond cluster icon above the
letter-spaced "ZAVIQU" wordmark, a horizontal rule, and a small heart) —
not a redesign. It's lower-resolution than true vector artwork would be
because it was sourced from a 960×960 video frame, not a print file.

**If a real vector or high-resolution logo file exists** (brand
guidelines, packaging print source, etc.), replace this file with that
one — it will look sharper at any size and should be used in preference
to this video-extracted version. Until then, this is the only real
Zaviqu logo artwork available to the pipeline, and every script that
references a logo image should point at this file.
