# Changelog

This file records changes that matter to users of Kakau Lab and its individual Lab products. It is not a
per-commit log; git history and PRs remain the source for engineering detail. Version vocabulary is defined
in [`VERSIONING.md`](VERSIONING.md).

History is intentionally not backfilled beyond the recent milestones below.

## Unreleased

- Hydrogen Atom Lab prototype (`/hydrogen`, model 10, unlisted): Bohr orbit diagram, energy-level diagram and
  line spectrum driven by one transition state. Emission and absorption modes, Lyman/Balmer/Paschen series. Viewing a transition no longer moves the electron; a transition fires only from
  its starting level. The spectrum axis auto-fits ultraviolet and infrared series.
- Hydrogen Lab v0.2: first visit offers guided or free exploration (switching resets both). The guided
  activity "where does the ~486 nm line come from?" runs observe → predict → compare with the model →
  evidence. The answer stays unrendered until the student asks for evidence; learning state is separate from
  the physical state. The spectrum strip now draws in real pixels, so it stays legible on phones.
- Light, dark and follow-system appearance across the catalog and every Lab, with a three-way switch in each
  header. The choice is stored in `localStorage` (`mode`) and applied via `<html data-mode>` before first paint,
  matching Kakau Notes. Dark mode swaps in an ivory Kakau Lab wordmark.

## Electrostatics v0.2A

Field representations, in free exploration only (guided activities are unchanged). Shipped to production
2026-09-25.

- Field-strength colormap of `|E|` with a nonlinear scale legend (default off).
- Electric field lines with direction arrowheads, 12 deterministic seeds per non-zero source (default off).
- Theory Notes explain field lines versus test-particle trajectories, and the zero-field saddle point of a
  four-equal-charge square.
- No change to the science model or share schema.

## Electrostatics v0.1

First public release of the Electrostatics Lab (`/electrostatics`).
