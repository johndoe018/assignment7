# AI prompt design

The executed prompt builder is `src/prompts.mjs`, not a separate illustrative
prompt that differs from the implementation.

## System instruction

> You are a mathematics learning coach. [LEVEL SCAFFOLDING] Select the ONE hint
> that best matches the learner's question. A = getting started and setting up
> the problem. B = making progress with the algebra. C = checking or verifying
> a result. Reply with exactly A, B, or C. Do not calculate, invent an answer,
> or write an explanation. The application will display the corresponding
> mathematically verified hint.

The level scaffolding is:

- **Foundation:** Give direct support for a learner who needs small, concrete
  steps and the first inverse operation.
- **Standard:** Encourage independent algebraic reasoning. Focus on collecting
  variables, inverse operations, or verification.
- **Advanced:** Support real-world modelling, break-even reasoning, units,
  and checking both cost functions.

## User instruction

The current level, actual task description, equation, and three verified hints
are inserted into the prompt. The learner's question is limited to 400 characters.
For example:

```text
Level: standard. Task: The same core equation, with 2x added to both sides.
Equation: 5x + 6 = 2x + 21
A: Collect the variable terms on one side by subtracting 2x from both sides.
B: The variable terms simplify to 3x. Then undo the constant term and divide
   by the remaining coefficient.
C: Check your value in the original equation, including both variable terms.
   Both sides must have the same value.
Learner question: How can I check my work?
Best hint letter:
```

The intended selection is C. This is an expected behavior example, not a claim
that the model has already produced it in the restricted cloud environment.

## Inference and validation

- Open-source model: `onnx-community/SmolLM2-135M-Instruct`.
- Browser Transformers.js pipeline: `text-generation`, WebAssembly, `q4` weights.
- Greedy decoding: `do_sample: false`, `max_new_tokens: 3`.
- Only a leading standalone A, B, or C is accepted. Any trailing model text
  is discarded. An invalid selection is an error, not a replacement AI answer.
- The application renders the hint from its verified lesson data, never raw
  model HTML or mathematical calculations.
- Worker inference does not block the interface. Loading has a three-minute
  timeout; inference has a one-minute timeout; download cancellation is supported.
- A response generated for a previous equation/level is not shown in the new one.

## AI practice-set generation

The second real-model action is **Create an AI practice set**. The math engine
prepares three valid candidate cores with simpler, regular, and extended
numerical demands. Each candidate can produce all three differentiated task
representations. `buildTaskMessages` asks the LLM to choose A, B, or C using
the learner's request and current level. Its actual system instruction includes:

> You design differentiated mathematics practice. Choose the most appropriate
> new core equation for the learner. Each choice will be transformed into
> Foundation (guided inverse operations), Standard (variables on both sides),
> and Advanced (a real-world cost comparison). A uses simpler numbers, B
> provides regular practice, C extends numerical challenge. Consider the
> learner's question and current level. Reply with exactly A, B, or C. Do not
> invent numbers or calculate a solution.

The selected core replaces the example across all levels, with fresh progress.
This makes the model part of task adaptation as well as hint selection while
retaining verified arithmetic. The 13th unit test checks 200 candidate sets,
their ordered coefficient complexity, and all resulting lesson levels.

## Why this method

A small browser language model is useful for matching a learner's question to
the right kind of support. It is unreliable as an unchecked algebra solver.
Constrained selection provides genuine model-based adaptation without allowing
the model to alter mathematical truth. The UI identifies both the AI-selected
hint and the direct, verified hints accurately. This tradeoff is explicit in
the report rather than presenting deterministic task generation as LLM output.
