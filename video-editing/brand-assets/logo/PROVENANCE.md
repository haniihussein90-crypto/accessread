# Logo assets — provenance

## zaviqu-lockup-reference.png (current, preferred)

The client later supplied `zaviqu-lockup-reference-original.png` — an
actual brand reference image (dark background, metallic-gold icon +
"ZAVIQU" wordmark + line–heart–line divider + "Made with love. Made to
last.") — as "the exact visual reference for logo styling, metallic gold
color, spacing, proportions, and typography." This supersedes
`zaviqu-logo-gold-extracted.png` below for any new work: it's a much
higher-quality source (crisp edges, real metallic gradient) than
anything extractable from the video.

`zaviqu-lockup-reference.png` is the cropped, transparent-background
version actually used by the pipeline (`add_logo_fade_ending.py`):
cropped to just the icon/wordmark/divider/tagline group (excluding the
reference image's decorative corner flourishes and border frame, which
weren't part of what was asked for), background keyed out via a
luminance threshold (the reference has a near-black background, gold
ink — opposite polarity from the card-based extraction below, and a much
cleaner key as a result).

## zaviqu-logo-gold-extracted.png (superseded, kept for history)

Before the reference image above was supplied, no standalone Zaviqu logo
file (vector or otherwise) existed anywhere in this repository —
confirmed by a full search before this asset was created. This PNG was
extracted directly from the actual message-card artwork visible on
screen in `53812b06-008__Gift_Campaign.mp4` (the frame at 00:04.75), not
redrawn or recreated:

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

**Use `zaviqu-lockup-reference.png` instead of this file** for any new
work — it's higher quality and is the client's own reference art. This
file is kept only because `briefs/gift_campaign_shortlist_v1.yaml`'s
history references it via the (now-unused) `end_card` brief section.
