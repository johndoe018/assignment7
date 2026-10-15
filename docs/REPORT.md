# Levelly: AI for Differentiated Learning

**Maizhanov Zhalgas · Topic 8 · Educational Technology & AI**

**Live website:** [https://johndoe018.github.io/assignment7/](https://johndoe018.github.io/assignment7/)

## Learning goal and core task

Levelly helps learners solve linear equations while choosing an appropriate
amount of challenge and support. The shared core task is **3x + 6 = 21**, with
solution **x = 5**. Changing the core equation updates all three paths together.
The supported lesson domain uses positive whole-number solutions.

## How differentiation works

| Path | Adapted task | Guidance |
| --- | --- | --- |
| Foundation | 3x + 6 = 21 | Direct inverse-operation hints; explicit subtract, divide, and check steps. |
| Standard | 5x + 6 = 2x + 21 | Variables on both sides; prompts encourage collecting terms and independent checking. |
| Advanced | Trail: C = 5h + 6; City: C = 2h + 21 | Model a real comparison, find h = 5 and shared cost $31, then compare longer rentals. |

The levels change representation, scaffolding, and the number of reasoning
steps while preserving the underlying relationship. Immediate feedback
distinguishes a wrong time from a correct time with an incorrect price.

## AI model and prompts

A quantized open-source **SmolLM2-135M-Instruct** model runs through
Transformers.js in a browser worker. No API key or server-side inference is
required. The model receives the selected level, current task, three verified
hints, and the learner's question. Its system prompt includes:

> Select the ONE hint that best matches the learner's question. A = getting
> started. B = making progress with the algebra. C = checking a result. Reply
> with exactly A, B, or C. Do not calculate or invent an answer.

The scaffolding instruction changes by level: direct concrete support for
Foundation, independent algebra for Standard, and modelling and units for
Advanced. The model selects a hint; the app displays the corresponding
verified explanation. A second prompt chooses simpler, regular, or extended
parameters from validated candidates; the selected core is transformed into
all three paths. The AI can create a personalized practice set without
inventing calculations. Invalid output is rejected.

## Verification, privacy, and limits

The algebra engine determines all answers and worked steps. Tests check 2,000
generated examples across all levels, input boundaries, both advanced answers,
and prompt/output validation. Desktop/mobile browser checks cover interaction,
session progress, failure handling, and automated accessibility checks. The
AI model may select an unhelpful hint; learners can reveal all verified hints.
First use downloads model files, potentially over 100 MB. Questions stay local.
The source is public and GitHub has confirmed a successful Pages deployment.
This cloud environment blocks model-host and public-site requests, so direct
live-site checking and successful real-model inference still need network
access. No live AI result is claimed from failure-path tests or synthetic
UI fixtures.

**Development disclosure:** Code and report prepared with AI assistance for
Maizhanov Zhalgas; review against course authorship rules before submission.
