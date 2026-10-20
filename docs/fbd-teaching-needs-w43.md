# FBD teaching-needs mapping (Officina W43, candidate)

Status: **candidate mapping, not approved.** It is based on Officina's current 選修物理 I §4-1（力的向量性質）plan and its two-force PDF, both of which are unapproved teacher drafts. Nothing from those sources is copied here, and Lab has no runtime dependency on Officina. Officina's formal material quality gate is unchanged by this note.

The stationary-table → remove-support sequence is an engineering regression scenario, not the teaching pitch. It exists to exercise the learner/reference isolation and prediction-before-evidence contracts.

| §4-1 need | FBD v0.1 today | Gap / next slice |
| --- | --- | --- |
| System → Interaction → Force order | Enforced: system, then interactions, then forces; a force cannot exist without an interaction source | None for the single-block case |
| Components are not extra forces | Diagnostic messages say a component is not an independent force; no component UI | Slice: show a force and its components on chosen axes as a derived view, never as a separate arrow in the force list |
| Choosing coordinates | Not covered | Slice: learner picks axes, components recompute; direction-only drag already keeps magnitude out of scope |
| Composing two forces | Not covered; magnitudes are intentionally unknown | Slice: two given forces with stated magnitudes, sum drawn separately from the force list (resultant is a result, not a force) |
| Vector nature of force | Direction identity and tolerance (10°) are checked | Needs quantitative magnitude, which is out of scope until a magnitude model is approved |

Out of scope for this sprint: a general quantitative FBD system, cross-repo runtime links, new generic frameworks.

Ownership: next teaching slices live under the FBD sub-project, with Officina as an upstream dependency for the approved teaching content. Do not start a slice until the relevant Officina plan is teacher-approved.
