# Product

## Vision

An AI service that generates adult-content stories with matching illustrations, primarily for Russian-language users. Architecture is prepared to support additional languages in later iterations.

## PoC Scope

A single feature, end-to-end:

- User submits a text prompt and options (size, style, etc.)
- System generates a story of the requested size
- System generates a set of illustrations with consistent character appearance and visual style
- User reads the result in a web interface

Nothing else. No monetization, no auth, no social features, no multi-language during the PoC.

## Target Story Length

Up to 10,000 words. Typical size is 2,000–3,000 words.

## Thesis

"Better Russian-language output and better illustrations than existing competitors."

The bet is twofold:

1. Russian-language quality in open-source NSFW fine-tunes is currently weak. Careful model selection and pipeline design can produce noticeably better output than competing services.
2. Character and visual-style consistency across a story's illustrations is not delivered well by most existing services. The planning-then-generation pipeline (see `pipeline.md`) is the mechanism for this.

## Outstanding Product Work

Competitor research has not yet been done. Two hours minimum is required before the founder can judge whether PoC output actually clears the competitor floor.

Candidates to examine:

- PornPen, Unstable Diffusion, DreamGF
- Russian-language Telegram adult-story bots (search "генератор эротических историй бот")
- NovelAI and KoboldAI community outputs

This is flagged as the single most important non-technical task before serious build work begins.
