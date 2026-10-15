export const LEVELS = [
  { id: 'foundation', name: 'Foundation', number: '01', tag: 'Build confidence', description: 'Smaller steps. A clear starting point.' },
  { id: 'standard', name: 'Standard', number: '02', tag: 'Find your rhythm', description: 'A little more thinking. A little less help.' },
  { id: 'advanced', name: 'Advanced', number: '03', tag: 'Go a step further', description: 'Real-world context. Connected ideas.' },
];

export function validateCore({ a, b, c }) {
  if (![a, b, c].every(Number.isSafeInteger)) return 'Use whole numbers for all three values.';
  if (a < 1 || a > 12 || b < 0 || b > 40 || c < 1 || c > 400) return 'Use a coefficient from 1–12, a starting value from 0–40, and a right side from 1–400.';
  const x = (c - b) / a;
  if (!Number.isInteger(x) || x < 1 || x > 30) return 'Choose values that give x a positive whole-number answer from 1 to 30.';
  return null;
}

export function makeCore(a = 3, b = 6, c = 21, d = 2) {
  const error = validateCore({ a, b, c });
  if (error) throw new RangeError(error);
  if (!Number.isInteger(d) || d < 1 || d > 8) throw new RangeError('The extension rate must be a whole number from 1 to 8.');
  return Object.freeze({ a, b, c, d, x: (c - b) / a });
}

export function generateCore(seed) {
  let state = seed >>> 0;
  const next = (min, max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
  const a = next(2, 8), b = next(2, 18), x = next(2, 12), d = next(1, 5);
  return makeCore(a, b, a * x + b, d);
}

export const equation = ({ a, b, c }) => `${a === 1 ? '' : a}x${b ? ` + ${b}` : ''} = ${c}`;

export function buildLesson(core, level) {
  if (!LEVELS.some(item => item.id === level)) throw new RangeError('Unknown learning level.');
  const { a, b, c, d, x } = core;
  const both = a + d;
  const equalCost = both * x + b;
  const base = {
    level, core, answer: x, cost: equalCost,
    labels: ['Get started', 'Make progress', 'Check your thinking'],
    takeaway: `All three paths preserve the same mathematical relationship: ${equation(core)}.`,
  };
  if (level === 'foundation') return {
    ...base,
    eyebrow: 'ONE VARIABLE · TWO OPERATIONS',
    title: 'Find the missing number.',
    description: 'Keep both sides balanced. Work backwards to find the value of x.',
    equation: equation(core),
    question: 'What value of x makes this equation true?',
    hints: [
      b ? `Start by subtracting ${b} from both sides. This undoes the addition without changing the balance.` : `There is no added value to undo. Start by dividing both sides by ${a}.`,
      `After removing the starting value, ${a}x = ${c - b}. Divide both sides by ${a} to leave one x.`,
      `Substitute your answer into ${equation(core)}. Multiply first, then add${b ? ` ${b}` : ' zero'}. Both sides should equal ${c}.`,
    ],
    steps: [
      { title: 'Undo the addition', math: `${a}x = ${c} − ${b} = ${c - b}`, text: `Subtract ${b} from both sides to keep the equation balanced.` },
      { title: 'Undo the multiplication', math: `x = ${c - b} ÷ ${a} = ${x}`, text: `Divide both sides by the coefficient, ${a}.` },
      { title: 'Check the result', math: `${a} × ${x} + ${b} = ${c}`, text: 'The left side matches the right side. Your solution works.' },
    ],
  };
  if (level === 'standard') return {
    ...base,
    eyebrow: 'VARIABLES ON BOTH SIDES',
    title: 'Bring it back into balance.',
    description: `The same core equation, with ${d}x added to both sides. Decide which operation will simplify it first.`,
    equation: `${both}x${b ? ` + ${b}` : ''} = ${d === 1 ? '' : d}x + ${c}`,
    question: 'Solve for x. Show yourself why each step keeps the balance.',
    hints: [
      `Collect the variable terms on one side by subtracting ${d}x from both sides.`,
      `The variable terms simplify to ${a}x. Then undo the constant term and divide by the remaining coefficient.`,
      `Check your value in the original equation, including both variable terms. Both sides must have the same value.`,
    ],
    steps: [
      { title: 'Collect the variable terms', math: `(${both} − ${d})x + ${b} = ${c}`, text: `Subtract ${d}x from both sides. This reduces the problem to the original core equation.` },
      { title: 'Isolate the variable', math: `${a}x = ${c - b}  →  x = ${x}`, text: `Subtract ${b}, then divide both sides by ${a}.` },
      { title: 'Verify both sides', math: `${both} × ${x} + ${b} = ${d} × ${x} + ${c} = ${equalCost}`, text: 'Substitution confirms that the original equation is balanced.' },
    ],
  };
  return {
    ...base,
    eyebrow: 'REAL-WORLD MODELLING · MULTI-STEP',
    title: 'When do the two plans meet?',
    description: 'You are comparing two bike-rental plans. Model their costs, find the break-even time, then work out the shared price.',
    equation: `${both}h + ${b} = ${d}h + ${c}`,
    question: 'After how many hours do the plans cost the same, and what is that cost?',
    plans: [
      { name: 'Trail', rate: both, fee: b, equation: `C = ${both}h + ${b}` },
      { name: 'City', rate: d, fee: c, equation: `C = ${d}h + ${c}` },
    ],
    hints: [
      'Write each total cost as hourly rate × hours + starting fee. The break-even point is where the two totals are equal.',
      `Set ${both}h + ${b} equal to ${d}h + ${c}. Solve for h before calculating the shared cost.`,
      'Use your break-even time in both cost formulas. Your two totals must match. Then compare the hourly rates to reason about longer rentals.',
    ],
    steps: [
      { title: 'Build and solve the model', math: `${both}h + ${b} = ${d}h + ${c}  →  ${a}h = ${c - b}  →  h = ${x}`, text: 'The break-even equation is equivalent to the same core relationship.' },
      { title: 'Calculate the shared price', math: `Trail: ${both} × ${x} + ${b} = $${equalCost}; City: ${d} × ${x} + ${c} = $${equalCost}`, text: `At ${x} hours, both plans cost $${equalCost}.` },
      { title: 'Extend your reasoning', math: `At ${x + 2} h: Trail = $${both * (x + 2) + b}; City = $${d * (x + 2) + c}`, text: `For rentals longer than ${x} hours, City is cheaper because its hourly rate is lower. Before ${x} hours, Trail is cheaper.` },
    ],
  };
}

export function parseAnswer(value) {
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function checkAnswer(lesson, value, cost) {
  const answer = parseAnswer(value);
  const price = lesson.level === 'advanced' ? parseAnswer(cost) : 0;
  if (answer === null || price === null) return { status: 'invalid', message: 'Enter a number in each answer field before checking.' };
  if (answer !== lesson.answer) return {
    status: 'retry',
    message: lesson.level === 'advanced'
      ? 'That time does not make the costs equal yet. Try equating the two cost formulas, then isolate h.'
      : 'Not quite balanced yet. Apply the same operation to both sides, then check your value in the original equation.',
  };
  if (lesson.level === 'advanced' && price !== lesson.cost) return { status: 'partial', message: 'Your break-even time is correct. Now use that time in either plan’s formula to check the shared cost.' };
  return { status: 'correct', message: lesson.level === 'advanced' ? 'Exactly right. You found the break-even time and verified the shared cost in both plans.' : 'You found the balance! Substituting your value makes both sides equal.' };
}
