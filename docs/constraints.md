# Constraints and Non-Negotiables

Several realities shape every decision in this project. They should be revisited at every major milestone and must not be forgotten.

## No Mainstream AI APIs

OpenAI, Anthropic (Claude), Google (Gemini), Midjourney, DALL-E, and Stability's hosted APIs all explicitly prohibit NSFW content in their terms of service. They are not viable for this product — not for production, not for a PoC, not briefly.

Accounts found generating such content are subject to termination, sometimes irreversibly. All text and image generation must go through NSFW-friendly providers (OpenRouter, Replicate, Together, Fireworks, self-hosted) or open-source models.

## Character and Style Consistency Must Be Designed

Consistent character appearance and visual style across a story's illustrations is not a free capability of diffusion models. It requires explicit engineering: reference-image conditioning (IPAdapter / PuLID), character adapters (LoRAs), or fine-tuning.

It must be built into the pipeline from day one. It cannot be bolted on later without redesign.

## Russian Quality Must Be Validated Empirically

Most open-source NSFW fine-tunes are trained English-first. Their Russian output quality is generally weaker — awkward grammar, calqued idioms, register problems.

Model selection must be validated by running real Russian prompts through candidate models and comparing outputs side-by-side. English benchmarks and leaderboards cannot be trusted for this decision.

## CSAM Prevention Is Mandatory From Day One

Prompt-side filters and keyword blocklists must exist before the first end-to-end generation, even in a local PoC.

This is a legal requirement in effectively every jurisdiction. It is also an engineering discipline: retrofitting safety into a production system is far harder than building it in.

## Deferred, Not Ignored

The following are out of scope for the PoC phase but must be revisited before any real launch. None of them block the PoC. All of them block launch. Do not let them become week-before-launch emergencies.

### Jurisdiction and Legal Entity

US LLC, Cyprus, Seychelles, Russian ИП all produce different obligations for adult content. Jurisdiction choice drives downstream compliance decisions.

### Age Verification

EU (EUCPA), UK (Online Safety Act), multiple US states, and Russia each have distinct requirements. "Click yes I am 18" is not sufficient at scale. Verified 18+ checks (photo ID, third-party KYC service) may be required depending on jurisdiction.

### Payment Processors

Stripe and PayPal ban NSFW on sight, often without warning. Realistic options are NSFW-friendly processors (CCBill, Segpay, Epoch, Verotel) or cryptocurrency rails. Expect 10–15% fees and longer KYC onboarding than mainstream rails.

### Hosting Terms of Service

Vercel, Netlify, Cloudflare Workers, and most PaaS providers ban NSFW content. AWS and GCP are more permissive within their ToS. Hetzner, OVH, and NSFW-specialist hosting providers are common in this space.

### Monetization

Subscription, per-story credits, or a hybrid. Decision deferred until post-PoC once product validates and cost-per-generation is measured.
