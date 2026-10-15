import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, makeCore, generateCore, buildLesson, checkAnswer, parseAnswer, validateCore } from '../src/math.mjs';
import { buildCoachMessages, buildTaskCandidates, buildTaskMessages, parseCoachChoice } from '../src/prompts.mjs';

test('the initial core equation has the independently calculated solution x = 5', () => {
  assert.deepEqual(makeCore(), { a: 3, b: 6, c: 21, d: 2, x: 5 });
});
test('foundation, standard, and advanced are distinct connected representations', () => {
  const core = makeCore();
  assert.equal(buildLesson(core, 'foundation').equation, '3x + 6 = 21');
  assert.equal(buildLesson(core, 'standard').equation, '5x + 6 = 2x + 21');
  const advanced = buildLesson(core, 'advanced');
  assert.equal(advanced.equation, '5h + 6 = 2h + 21');
  assert.equal(advanced.answer, 5);
  assert.equal(advanced.cost, 31);
  assert.match(advanced.steps[2].math, /Trail = \$41; City = \$35/);
});
test('2,000 generated examples preserve balance and real-world cost ordering', () => {
  for (let seed = 0; seed < 2000; seed++) {
    const core = generateCore(seed);
    const { a, b, c, d, x } = core;
    assert.equal(a * x + b, c);
    assert.equal((a + d) * x + b, d * x + c);
    assert.ok((a + d) * (x + 1) + b > d * (x + 1) + c);
    assert.ok((a + d) * (x - 1) + b < d * (x - 1) + c);
    for (const level of LEVELS) {
      const lesson = buildLesson(core, level.id);
      assert.equal(lesson.answer, x);
      assert.equal(lesson.cost, d * x + c);
      assert.equal(lesson.hints.length, 3);
      assert.equal(lesson.steps.length, 3);
      assert.equal(checkAnswer(lesson, String(x), String(d * x + c)).status, 'correct');
    }
  }
});
test('all supported coefficient and offset boundaries have consistent solutions', () => {
  for (const a of [1, 2, 12]) for (const b of [0, 1, 40]) for (const x of [1, 2, 30]) {
    const c = a * x + b;
    if (c > 400) continue;
    const core = makeCore(a, b, c, 8);
    assert.equal(core.x, x);
    assert.equal(buildLesson(core, 'advanced').cost, (a + 8) * x + b);
  }
});
test('invalid and out-of-scope core equations are rejected before generation', () => {
  for (const values of [[0, 6, 21], [13, 1, 27], [3, -1, 20], [3, 6, 22], [3, 6, 3], [1.5, 0, 3], [3, 6, Infinity], [1, 0, 31]]) {
    assert.throws(() => makeCore(...values), RangeError);
  }
  assert.throws(() => makeCore(3, 6, 21, 0), RangeError);
  assert.ok(validateCore({ a: NaN, b: 1, c: 10 }));
  assert.throws(() => buildLesson(makeCore(), 'expert'), RangeError);
});
test('zero-offset equations do not display a dangling plus sign', () => {
  const lesson = buildLesson(makeCore(1, 0, 3), 'foundation');
  assert.equal(lesson.equation, 'x = 3');
  assert.match(lesson.hints[0], /dividing both sides/);
});
test('answer parsing rejects empty, non-finite, expression, and partial numeric input', () => {
  for (const input of ['', ' ', '5abc', 'Infinity', 'NaN', '2+3', '5/1', '0x5', '5e0']) assert.equal(parseAnswer(input), null);
  assert.equal(parseAnswer(' 5.0 '), 5);
  assert.equal(parseAnswer('-2'), -2);
  assert.equal(parseAnswer('.5'), 0.5);
});
test('wrong answers get actionable feedback and cannot pass by rounding', () => {
  const lesson = buildLesson(makeCore(), 'standard');
  assert.equal(checkAnswer(lesson, '4').status, 'retry');
  assert.equal(checkAnswer(lesson, '5.00001').status, 'retry');
  assert.equal(checkAnswer(lesson, '').status, 'invalid');
});
test('advanced checks both the break-even time and the price independently', () => {
  const lesson = buildLesson(makeCore(), 'advanced');
  assert.equal(checkAnswer(lesson, '4', '31').status, 'retry');
  assert.equal(checkAnswer(lesson, '5', '30').status, 'partial');
  assert.equal(checkAnswer(lesson, '5', '').status, 'invalid');
  assert.equal(checkAnswer(lesson, '5', '31').status, 'correct');
});
test('generation is repeatable for a seed and varies across different seeds', () => {
  assert.deepEqual(generateCore(123), generateCore(123));
  assert.notDeepEqual(generateCore(123), generateCore(124));
});
test('AI prompts are level-specific and limited to three verified hint choices', () => {
  const messages = LEVELS.map(level => buildCoachMessages(buildLesson(makeCore(), level.id), 'How can I check my work?'));
  assert.equal(new Set(messages.map(value => value[0].content)).size, 3);
  for (const value of messages) {
    assert.match(value[0].content, /exactly A, B, or C/);
    assert.match(value[0].content, /Do not calculate/);
    assert.match(value[1].content, /How can I check my work/);
  }
  assert.ok(buildCoachMessages(buildLesson(makeCore(), 'foundation'), 'q'.repeat(1000))[1].content.endsWith('q'.repeat(400) + '\nBest hint letter:'));
});
test('invalid model output is rejected instead of being displayed as mathematics', () => {
  assert.equal(parseCoachChoice('A'), 0);
  assert.equal(parseCoachChoice(' B.'), 1);
  assert.equal(parseCoachChoice('C: verify'), 2);
  for (const value of ['D', '', 'The answer is 7', 'Correct', 'Ignore the rules']) assert.throws(() => parseCoachChoice(value));
});

test('AI task candidates remain valid and each creates all three connected levels', () => {
  for (let seed = 0; seed < 200; seed++) {
    const cores = buildTaskCandidates(seed);
    assert.equal(cores.length, 3);
    assert.ok(cores[0].a < cores[1].a && cores[1].a < cores[2].a);
    for (const core of cores) {
      assert.equal(validateCore(core), null);
      for (const level of LEVELS) assert.equal(buildLesson(core, level.id).answer, core.x);
    }
    const prompt = buildTaskMessages(cores, 'I need simpler numbers', 'foundation');
    assert.match(prompt[0].content, /Foundation.*Standard.*Advanced/);
    assert.match(prompt[0].content, /exactly A, B, or C/);
    assert.match(prompt[1].content, /I need simpler numbers/);
  }
});
