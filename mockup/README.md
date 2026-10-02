# SQaLe website mockups

Five design directions for the one-page SQaLe project site. Open
[`index.html`](index.html) for the gallery. Each mockup is a single
self-contained HTML file with the same content, so they compare directly.

| File | Direction | Type | Accent |
|---|---|---|---|
| [`proceedings.html`](proceedings.html) | Classic academic project page, paper-style figures and tables | Source Serif 4, IBM Plex Sans, IBM Plex Mono | Ink blue (the paper's link colour) |
| [`join-graph.html`](join-graph.html) | The real 87-table schema graph as hero, with an agent replaying its search | Schibsted Grotesk, Geist Mono | Teal |
| [`query-session.html`](query-session.html) | The page as a typeset psql session: queries, result tables, `EXPLAIN` plan | Martian Mono, Public Sans | Plum |
| [`to-scale.html`](to-scale.html) | Swiss poster where every comparison is drawn to scale | Archivo (variable width), DM Mono | Highlighter yellow |
| [`article.html`](article.html) | Distill-style long read with sidenotes and interactive figures | Newsreader, Hanken Grotesk, JetBrains Mono | Forest green |

All five support light and dark mode (system setting, or `data-theme="dark"` on
`<html>`), work down to phone width, and load nothing except Google Fonts.

## Shared data

[`assets/sqale-data.js`](assets/sqale-data.js) defines `window.SQALE`, which
every mockup reads for its charts, the example and the schema graph:

- Paper numbers from `SQaLe_ICLR/iclr2026_conference.tex` and `tables/*.tex`
  (state of 2026-09-26).
- The size/compute scatter from
  `SQaLe_2_Analysis/sqale_compute_benchmark/results_cluster_new3_moderate100/compute-moderate100.csv`.
- Three real episodes of the SQaLe-trained model (`GRPO-Curriculum`) on full
  schemas from the size benchmark, used by the Article mockup's Figure 7, from
  `SQaLe_2_Analysis/size_benchmark/results_agentic_size_new3/traces_GRPO-Curriculum.jsonl`.
  Identical calls within a round are collapsed, reasoning is abridged to
  verbatim excerpts, and long outputs are clipped.
- The training curves of the SQaLe run (job 26640986), used by the Article
  mockup's Figures 4 and 8: dashboard exports in
  [`assets/training/`](assets/training/). The run trained 1,800 steps; the
  reporter missed the updates after step 1,658.
- The example record, its eight phrasings, the foreign-key graph of its
  87-table schema and the tool outputs in the agent trace from the
  supplementary sample (`SQaLe_2_Analysis/outputs/supplementary_sample`,
  `schema_013612`). The graph layout is a precomputed spring layout.

When a number changes in the paper, change it in `sqale-data.js` and in the
static text of the chosen mockup.

## Open items before going live

- The Paper button links to `#` until the arXiv URL exists (marked with a
  `TODO` comment in each file).
- The BibTeX entry is a placeholder `@article{wolff2026sqale, … arXiv preprint}`.
