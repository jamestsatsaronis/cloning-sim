# Cloning Strategy Simulation

An interactive branching simulation for teaching molecular cloning. Students
choose one of three project goals and then make six sequential decisions
about how to plan and execute their cloning experiment. Failures only
become visible at realistic checkpoints — the transformation plate and the
validation readout — and a final debrief explains the consequences of each
choice.

Built to complement an existing biochemistry/molecular biology lecture
series; designed as a 10–15 minute study tool, not an assignment.

## Project goals

| Project | Insert | Vector | Host context |
|---------|--------|--------|--------------|
| A — Recombinant insulin | human INS | pET28a | E. coli expression |
| B — Bacterial luciferase in mammalian cells | V. harveyi luxAB | pcDNA3.1 | mammalian expression |
| C — Liver-specific GFP reporter | human ALB promoter | pEGFP-1 | reporter assay |

Each goal makes a different decision the "correct" one at most steps,
forcing students to reason from concepts rather than memorise a recipe.

## Decisions

1. **Source** — genomic DNA vs mRNA
2. **Template** — direct PCR vs RT with oligo-dT vs RT with random hexamers
3. **Primers** — gene-specific only, same site on both ends, or different sites
4. **Vector** — pET28a, pcDNA3.1, pEGFP-1 or pUC19 (interactive plasmid maps)
5. **Restriction strategy** — single sticky, double sticky (directional), or blunt
6. **Validation** — colony PCR, restriction digest, sequencing, or skip

A "Checkpoint · transformation plate" appears between steps 5 and 6, and a
"Checkpoint · validation readout" appears after step 6.

## Project structure

```
cloning-sim/
├── index.html                      Vite entry HTML
├── package.json                    Dependencies (React 18, Vite 5)
├── vite.config.js                  base: './' for portable deployment
└── src/
    ├── main.jsx                    Two-line entry point
    └── CloningSimulation.jsx       The whole simulation in a single file
```

`CloningSimulation.jsx` is laid out top-to-bottom as: palette/fonts →
goal & decision data → result-determination engine → SVG visual components
(petri dish, gel, plasmid map) → UI primitives (info modal, progress bar) →
screen components → debrief generation → end screen → main orchestrator.

## Local development

```sh
npm install
npm run dev      # local dev server with hot reload
npm run build    # production bundle in dist/
npm run preview  # serve the production bundle locally
```

## GitHub Pages deployment

The Vite config uses `base: './'` so the built site is portable. To deploy
via GitHub Actions, create `.github/workflows/deploy.yml` with a standard
"build and publish to gh-pages" workflow — the `dist/` directory is the
artifact.

If your repository name is something other than the site root, you may want
to set `base: '/your-repo-name/'` in `vite.config.js`.

## Adding or changing decisions

Each decision is a self-contained object in the `DECISIONS` array near the
top of `CloningSimulation.jsx`. To add an option, append to the `options`
array; to add a new decision step, add a new object and update the
`nextStageAfterDecision` mapping plus the dispatch block in the main
component.

The result-determination engine consists of pure functions
(`computeInsertObtained`, `computeLigationSuccess`,
`computeOrientationCorrect`, etc.) that take the choices object and return
booleans. To change a learning outcome, update the relevant function — the
end-screen debrief picks up changes automatically through the
`DEBRIEF_FUNCTIONS` map.

## Adding or changing plasmid maps

Plasmid feature data lives in the `VECTOR_MAPS` object. Each feature has a
position in degrees (0° = top, clockwise), a kind that drives its colour
and arrowhead style, and an `info` string shown on hover. The same
`PlasmidMap` component is reused on the end screen via
`buildConstructFeatures`, which substitutes the chosen insert into the
chosen vector's MCS.
