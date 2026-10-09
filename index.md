# SQaLe: a large realistic dataset to empower small specialised text-to-SQL models

Cornelius Wolff (1, 2), Daniel Gomm (1, 2), Madelon Hulsebos (2)
(1) University of Amsterdam, (2) Centrum Wiskunde & Informatica
Preprint, 2026

This is the plain-text version of the SQaLe project page at <https://trl-lab.github.io/sqale/>. The page draws its figures with JavaScript; here every figure is given as a table or a short description.

- Questions and SQL: <https://huggingface.co/datasets/trl-lab/SQaLe-2-text-to-SQL-Queries>
- Schemas and databases: <https://huggingface.co/datasets/trl-lab/SQaLe-2-text-to-SQL-Schemas>
- Model: <https://huggingface.co/trl-lab/qwen3.5-2b-grpo-sqale>
- Earlier version: *SQaLe: A Large Text-to-SQL Corpus Grounded in Real Schemas*, <https://arxiv.org/abs/2602.22223>
- Index for LLMs: <https://trl-lab.github.io/sqale/llms.txt>

## Abstract

Frontier language models in agentic pipelines lead text-to-SQL benchmarks, at a high inference cost. Small specialised models would avoid that cost, but training them needs data that reflects the scale, semantics and structure of real databases. SQaLe is a semi-synthetic text-to-SQL dataset built on 9,259 real-world schemas from SchemaPile. Our generation pipeline extends each schema, fills it with synthetic rows, generates questions and answers them with an agent, and validates every stage by execution. The result is 1.4 million natural-language questions paired with SQL, over schemas far larger than in any existing dataset. Training a 2B parameter model on SQaLe with GRPO alone raises its execution accuracy on an independent test set from 38.7% to 66.3%. It does so by learning effectively how to explore the dataset. It finds the relevant tables in large schemas and reads the values its answer needs.

## Why SQaLe

Small specialised models avoid the inference cost of frontier agentic pipelines. Training them needs data that looks like the databases they will be used on, and the common text-to-SQL training sets use small schemas. Yet, BIRD's training set has significantly fewer samples, while SynSQL lacks realistic schemas. A model trained on them does not learn to search for the tables a question needs effectively.

SQaLe starts from 9,259 real-world schemas from SchemaPile, extends each one with tables in its own style and fills it with synthetic rows. Its schemas have a median of 113 tables and 538 columns, while also delivering enough questions and SQL queries to make for an effective training dataset.

## The dataset

| | |
|---|---|
| question–SQL pairs | 1.4M |
| real-world schemas | 9,259 |
| distinct SQL queries | 176,761 |
| median tables per schema | 113 |
| median columns per schema | 538 |
| synthetic rows | 109M |

Each record pairs a natural-language question with a schema and a gold SQL query that has been run against the populated database. Every question exists in 8 phrasings, the original and seven rewrites in different styles, and all eight share one SQL query. One record is laid out in full at <https://trl-lab.github.io/sqale/record.html>, with the schema it was written against.

The dataset is published on Hugging Face in two parts that join on `schema_id`. [trl-lab/SQaLe-2-text-to-SQL-Queries](https://huggingface.co/datasets/trl-lab/SQaLe-2-text-to-SQL-Queries) holds the questions in all eight phrasings, the gold SQL and its result. [trl-lab/SQaLe-2-text-to-SQL-Schemas](https://huggingface.co/datasets/trl-lab/SQaLe-2-text-to-SQL-Schemas) holds the DDL and the generated rows of each database.

## The result

To isolate the effect of the data, each of the three runs starts from the same Qwen3.5-2B checkpoint and trains with GRPO on one corpus: SQaLe, SynSQL-2.5M or BIRD train (M_SQaLe, M_SynSQL and M_BIRD). M_SQaLe answers as well as untrained models four times its size. It sits 28 points above the best untrained model of its own size, 52% against 24%, and it takes an 8B general-purpose model to reach the same accuracy. Qwen3.5-27B leads at 63%.

**Figure 1. Accuracy against model size**, 100 moderate SQaLe test questions, all models in the same agentic harness.

| Model | Parameters (B) | Accuracy (%) | TFLOPs per question |
|---|--:|--:|--:|
| M_SQaLe | 2 | 52 | 224 |
| M_BIRD | 2 | 40 | 112 |
| M_SynSQL | 2 | 33 | 155 |
| Qwen3.5-2B | 2 | 24 | 168 |
| Granite-4.1-3B | 3 | 21 | 414 |
| Llama-3.2-3B | 3 | 10 | 535 |
| Hunyuan-4B | 4 | 36 | 448 |
| Qwen2.5-7B | 7 | 29 | 219 |
| Olmo-3-7B-Instruct | 7 | 12 | 1,001 |
| Olmo-3-7B-Think | 7 | 26 | 246 |
| Llama-3.1-8B | 8 | 30 | 693 |
| Qwen3-8B | 8 | 54 | 225 |
| GLM-4-9B | 9 | 27 | 823 |
| Qwen3.5-9B | 9 | 58 | 449 |
| Gemma-3-12B | 12 | 39 | 717 |
| Mistral-Nemo-12B | 12 | 14 | 1,239 |
| Nemotron-Nano-12B | 12 | 45 | 504 |
| Qwen3-14B | 14 | 54 | 369 |
| gpt-oss-20b | 20 | 16 | 1,052 |
| Mistral-Small-24B | 24 | 46 | 1,027 |
| Qwen3.5-27B | 27 | 63 | 1,710 |
| Qwen3-30B-A3B | 30 | 51 | 2,886 |
| Gemma-4-31B | 31 | 60 | 1,867 |
| Nemotron-Super-49B | 49 | 53 | 1,389 |
| Llama-3.3-70B | 70 | 49 | 3,154 |

## Training on SQaLe

To isolate the effect of the data, each of the three runs starts from the same Qwen3.5-2B checkpoint and trains with GRPO on one corpus: SQaLe, SynSQL-2.5M or BIRD train. We call the results M_SQaLe, M_SynSQL and M_BIRD. Apart from the training data and the strength of a length curriculum, the base model, environment, tools, reward, steps, batch size and evaluation are identical. There are no distilled traces, no teacher and no test-time scaffolding.[^2]

On the SQaLe test set (Figure 2), M_SQaLe reaches 66.3%, sitting far above the base model and also outperforming M_BIRD and M_SynSQL by considerable margins.

**Figure 2. Execution accuracy (%) by training corpus**, on 300 SQaLe test questions, BIRD and EHRSQL.

| Model | SQaLe test | BIRD | EHRSQL |
|---|--:|--:|--:|
| M_SQaLe (Qwen3.5-2B trained with GRPO on SQaLe) | **66.3** (+27.6) | 52.3 | **23.7** |
| M_BIRD (Qwen3.5-2B trained with GRPO on BIRD train) | 54.0 (+15.3) | **54.7** | **23.7** |
| M_SynSQL (Qwen3.5-2B trained with GRPO on SynSQL-2.5M) | 50.7 (+12.0) | 44.3 | 13.3 |
| Qwen3.5-2B (untrained base model) | 38.7 | 19.3 | 8.2 |
| Qwen3.6-27B (untrained, 27B parameters) | 76.0 | 69.3 | 55.0 |

## What a small model learns

The three trained models differ only in their training data, so differences in how they behave come from the data. We look at four of those differences.

### Exploration

The environment caps rounds, not tool calls, so the only way for the model to see more of a database is to ask more in each round. Over training it learns to do that: tool calls per episode roughly triple, while the number of rounds stays near six. Three real episodes are replayed round by round at <https://trl-lab.github.io/sqale/answers.html>, on schemas of 106 to 239 tables. A round is one reply from the model: it writes a short plan and issues as many tool calls as it likes, and the environment runs all of them and returns the results in one message.

**Figure 3. Inside one episode, over GRPO training on SQaLe** (run 26640986), averaged over bands of training steps. Data: [episode shape (CSV)](https://trl-lab.github.io/sqale/assets/training/26640986-Episode-shape.csv), run 26640986, which reported up to step 1,658 of 1,800.

| Training steps | Rounds per episode | Tool calls per episode |
|---|--:|--:|
| 1–300 | 6.5 | 5.9 |
| 301–600 | 6.3 | 5.8 |
| 601–900 | 6.2 | 7.2 |
| 901–1,200 | 5.9 | 13.2 |
| 1,201–1,658 | 6.0 | 18.9 |

### Schema size

Accuracy falls for every model as the schema grows, and M_SQaLe leads at every size, from 72.7% with only the gold tables to 66.3% on the full schema. With only the gold tables present, all three models open every gold table in at least 95% of episodes. On the full schema, M_SQaLe opens every gold table in 89.7% of episodes, again outperforming M_BIRD and M_SynSQL. BIRD and SynSQL training schemas have a median of 5 and 10 tables, so models trained on them never have to search.

**Figure 4 (top). Execution accuracy (%) at three schema sizes**, with the share of episodes in which the model opened every gold table (%) in brackets.

| Tables in the database | M_SQaLe | M_BIRD | M_SynSQL |
|---|--:|--:|--:|
| Gold tables only | **72.7** (95.3) | 64.7 (98.7) | 59.3 (98.3) |
| +32 distractor tables | **68.0** (96.7) | 61.0 (90.7) | 52.3 (92.7) |
| Full schema | **66.3** (89.7) | 54.0 (85.0) | 50.7 (83.3) |

### Populated tables

Before submitting, M_SQaLe has seen 88% of the string literals its answer depends on. M_SynSQL has seen 55%, M_BIRD 40% and the untrained model 35%. SynSQL's tables hold a median of 2 rows, and SQaLe's hold 69.

**Figure 4 (bottom). String literals seen before submitting:** the share of the string literals the answer depends on that the model saw in tool output.

| Model | Literals seen (%) |
|---|--:|
| M_SQaLe | 88 |
| M_SynSQL | 55 |
| M_BIRD | 40 |
| Qwen3.5-2B | 35 |

### Domains

On SQaLe test questions whose schemas lie outside BIRD's domains, M_SQaLe leads M_BIRD by 9.9 points. Inside BIRD's domains the lead is 2.8 points.[^3]

## How it compares

How much searching a model has to learn depends on how large its training schemas are. Figure 5 compares schema size across four datasets. The median SQaLe schema has 113 tables and 538 columns. The next largest medians are EHRSQL's 13.5 tables and 92 columns, measured on 2 schemas. SQaLe also has the most foreign-key relations, 1,196,078 across its 9,259 schemas.

**Figure 5. Schema statistics.**

| Dataset | Schemas | Median tables | Median columns | Foreign keys | Median rows / table |
|---|--:|--:|--:|--:|--:|
| BIRD | 80 | 5 | 39 | 526 | 3,738 |
| EHRSQL | 2 | 13.5 | 92 | 34 | n/a |
| SynSQL | 16,575 | 10 | 72 | 159,547 | 2 |
| SQaLe | 9,259 | 113 | 538 | 1,196,078 | 69 |

23.4% of SQaLe queries are nested, against 7.7% in BIRD, and 40% of the queries that join chain multiple joins, against 26% in BIRD. 3.1% of queries touch five or more tables, up to 20. No BIRD or EHRSQL query touches more than four.

## How it is built

Schemas that size do not come ready to use. The pipeline runs in five stages, and every stage is validated by execution. Value synthesis repairs rows that break key constraints, and answering sends failed or rejected queries back to the agent.

1. **Schema collection and extension.** SchemaPile provides real-world schemas from permissively licensed GitHub repositories. A tool-using agent annotates each of the 14,597 source repositories with a domain description. An LLM then extends each schema with tables that keep its naming conventions, normalisation level and foreign-key style.
2. **Value synthesis.** Tables are filled in foreign-key dependency order. For each table the LLM writes a Python function from its DDL, its original rows, the allowed foreign-key values and the domain description. Fact and junction tables get more rows and a skewed key distribution, and every table is checked for primary-key uniqueness and referential integrity.
3. **Question generation.** A connected subgraph of up to 20 tables is sampled along foreign keys, together with sample rows. The LLM writes questions that need every table in it, at three difficulty levels (simple, moderate, hard), with every literal grounded in the data.
4. **Style variation.** Each question is rewritten into the seven styles shown in the example record. All eight versions share the gold SQL.
5. **Agentic answering and judging.** An agent explores the live database with tools (`list_tables`, `describe_table`, `sample_rows`, `distinct_values`, `run_query`) and commits with `submit_sql`. Execution errors go back to the agent. An LLM judge checks the result against the question and sends rejected queries back for a rewrite.[^1]

## Cite

If you use SQaLe, please cite this paper and the earlier workshop paper.

```bibtex
@article{wolff2026sqale,
  title   = {SQaLe: A Large Realistic Dataset to Empower Small Specialised Text-to-SQL Models},
  author  = {Wolff, Cornelius and Gomm, Daniel and Hulsebos, Madelon},
  journal = {arXiv preprint},
  year    = {2026}
}

@article{wolff2025sqale,
  title   = {SQaLe: A Large Text-to-SQL Corpus Grounded in Real Schemas},
  author  = {Wolff, Cornelius and Gomm, Daniel and Hulsebos, Madelon},
  journal = {arXiv preprint arXiv:2602.22223},
  note    = {AI for Tabular Data workshop at EurIPS 2025},
  year    = {2025}
}
```

## Notes

[^1]: On 158 BIRD dev questions (225 judge calls), 94.5% of the queries the judge accepts are aligned with the question. The judge agrees with human labels 86.2% of the time (κ = 0.68).
[^2]: The schema is withheld. The model explores the database through tools, the five used in answering plus `foreign_keys` and `join_path`. The reward is tiered (correct result, then executes, then parses, then nothing), and partial credit never ranks a wrong query above a correct one.
[^3]: The domain split covers 108 schemas. That sample is too small to call the difference between the two gaps significant.

Contact: {cornelius.wolff, daniel.gomm, madelon.hulsebos}@cwi.nl. Website content MIT licensed.
