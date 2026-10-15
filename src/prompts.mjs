export const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct';
export const MODEL_REVISION = 'main';

const scaffolding = {
  foundation: 'Give direct support for a learner who needs small, concrete steps and the first inverse operation.',
  standard: 'Encourage independent algebraic reasoning. Focus on collecting variables, inverse operations, or verification.',
  advanced: 'Support real-world modelling, break-even reasoning, units, and checking both cost functions.',
};

export function buildCoachMessages(lesson, question) {
  return [
    {
      role: 'system',
      content: `You are a mathematics learning coach. ${scaffolding[lesson.level]} Select the ONE hint that best matches the learner's question. A = getting started and setting up the problem. B = making progress with the algebra. C = checking or verifying a result. Reply with exactly A, B, or C. Do not calculate, invent an answer, or write an explanation. The application will display the corresponding mathematically verified hint.`,
    },
    {
      role: 'user',
      content: `Level: ${lesson.level}. Task: ${lesson.description} Equation: ${lesson.equation}\nA: ${lesson.hints[0]}\nB: ${lesson.hints[1]}\nC: ${lesson.hints[2]}\nLearner question: ${String(question).slice(0, 400)}\nBest hint letter:`,
    },
  ];
}

export function parseCoachChoice(text) {
  const match = String(text).trim().match(/^([ABC])(?:[.!:]|\s|$)/i);
  if (!match) throw new Error('The model did not return a valid hint choice. Your verified hints are still available.');
  return match[1].toUpperCase().charCodeAt(0) - 65;
}
import { generateCore, makeCore, equation } from './math.mjs';


export function buildTaskCandidates(seed) {
  const sample = generateCore(seed);
  return [
    [2, 2 + sample.b % 5, 2 + sample.x % 4],
    [3 + sample.a % 3, 6 + sample.b % 7, 5 + sample.x % 5],
    [7 + sample.a % 4, 15 + sample.b % 12, 10 + sample.x % 9],
  ].map(([a, b, x]) => makeCore(a, b, a * x + b, sample.d));
}

export function buildTaskMessages(candidates, question, level) {
  return [
    {
      role: 'system',
      content: `You design differentiated mathematics practice. Choose the most appropriate new core equation for the learner. Each choice will be transformed into Foundation (guided inverse operations), Standard (variables on both sides), and Advanced (a real-world cost comparison). A uses simpler numbers, B provides regular practice, C extends numerical challenge. Consider the learner's question and current level (${level}). Reply with exactly A, B, or C. Do not invent numbers or calculate a solution.`,
    },
    {
      role: 'user',
      content: `${candidates.map((core, index) => `${String.fromCharCode(65 + index)}: ${equation(core)}`).join('\n')}\nLearner request: ${String(question).slice(0, 400)}\nBest practice set letter:`,
    },
  ];
}
