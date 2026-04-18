---
name: review-decision-record
description: 'Use before publishing any decision record. Final quality gate: checks consistency, evidence coverage, and structural completeness. Outputs pass or revise with severity-tagged findings.'
license: Apache-2.0
metadata:
  author: numica
  version: '1.0.0'
  tags: [decision-making, review, adr]
compatibility: Any
allowed-tools: Read, Write, Edit
---

# review-decision-record

Final quality gate before publishing. Checks consistency between the decision and the supporting evidence.

## Checklist

- [ ] All must-have requirements are covered in the comparison table
- [ ] No unverified must-have without explicit assumption and mitigation
- [ ] The chosen option is consistent with the comparison table and does not violate any must-have requirement
- [ ] No eliminated option is accidentally recommended in the Decision section
- [ ] Decision drivers are actual differentiators, not a repeat of requirements
- [ ] Comparison table rows match requirements — no orphan rows
- [ ] Trade-offs are honest, not decorative — they describe real downsides
- [ ] Next Steps contain measurable validation criteria
- [ ] Validation metrics in Next Steps map back to the original success criteria in Requirements
- [ ] Decision language is not overstated (no "only option", no unsupported absolutes)
- [ ] Unknowns are recorded explicitly
- [ ] Out of Scope section has clear boundaries

## Output

`pass` or `revise` + list of specific findings, each tagged `critical` or `non-critical`

## Output Routing

| Result                                     | Action                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `pass`                                     | Publish                                                                                                                 |
| `revise` with only `non-critical` findings | Fix in `write-decision-record` and publish                                                                              |
| `revise` with any `critical` finding       | Return to relevant skill (e.g., `evaluate-solutions` for missing evidence, `stress-test-decision` for resilience flaws) |
