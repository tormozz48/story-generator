# Safety and Compliance

## SafetyModule

A dedicated NestJS module sits between user input and every AI call. Every prompt passes through it before any text or image generation begins.

For the PoC, the module includes at minimum:

- Keyword blocklist covering CSAM-related terms, in Russian and English
- Pattern filters for age-related phrases and combinations
- Prompt-length limits to prevent prompt-injection-style exploits
- Logging of blocked attempts for later rule tuning

Russian-language awareness is required from the start, not added later.

## CSAM Prevention

This is non-negotiable. Before the first real end-to-end generation runs, the filtering rules must be in place.

This is both a legal requirement — generating content depicting minors is criminal in every serious jurisdiction, including text-only — and an engineering discipline. Retrofitting safety into a production system is far harder than building it in.

Output-side scanning (after generation, before serving) is a future enhancement and can use classifier models or vision-language models. For the PoC, prompt-side filtering is the minimum bar.

## Defense in Depth

Even during PoC, safety should not be a single layer.

- **Prompt-side filtering** — SafetyModule, blocks before any AI call
- **Planning-step constraint** — the planning LLM prompt can be instructed to refuse unsafe themes, adding a second layer
- **Output logging** — every generation's input and output is logged for later review; this creates an audit trail

## Deferred Compliance Work

Out of scope for the PoC phase but required before any real launch. See `constraints.md` for detail on each.

- Age verification (jurisdiction-dependent)
- Jurisdiction and legal entity decisions
- NSFW-friendly payment processor
- NSFW-friendly hosting

None of these block the PoC. All of them block launch.

## Incident Response

For the PoC phase, "incident response" is informal: if a prompt bypasses the filter, the founder updates the blocklist and adds a test case to the safety suite. Post-launch this will need a more formal process.
