import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Bike, BookOpen, Check, CheckCircle2, ChevronDown, CircleHelp, Download, ExternalLink, FileText, GraduationCap, Leaf, Lightbulb, LoaderCircle, RefreshCw, Send, ShieldCheck, SlidersHorizontal, Sparkles, Sprout, Target, TrendingUp, X } from 'lucide-react';
import { LEVELS, buildLesson, checkAnswer, equation, generateCore, makeCore, validateCore } from './math.mjs';
import { buildCoachMessages, buildTaskCandidates, buildTaskMessages, MODEL_ID } from './prompts.mjs';

const ICONS = { foundation: Sprout, standard: Target, advanced: TrendingUp };
const SOURCE = 'https://github.com/johndoe018/assignment7';
const initialCore = makeCore();
const emptyRecord = () => ({ value: '', cost: '', feedback: null, hints: 0, solution: false, completed: false });
const emptyRecords = () => Object.fromEntries(LEVELS.map(level => [level.id, emptyRecord()]));

function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('levelly-session'));
    if (saved && !validateCore(saved.core) && LEVELS.some(level => level.id === saved.level)) {
      const core = makeCore(saved.core.a, saved.core.b, saved.core.c, saved.core.d);
      const records = emptyRecords();
      for (const id of Object.keys(records)) {
        const value = saved.records?.[id];
        if (value && typeof value.value === 'string' && typeof value.cost === 'string') records[id] = { ...records[id], ...value };
      }
      return { core, level: saved.level, records };
    }
  } catch { /* Storage may be unavailable or contain an older schema. */ }
  return { core: initialCore, level: 'foundation', records: emptyRecords() };
}

function GrowthIllustration() {
  return <div className="growth-art" aria-hidden="true">
    <div className="art-orbit" /><div className="art-sun"><Sparkles size={23} /></div>
    <div className="art-equation">a little practice <span>+</span> a little possibility</div>
    <div className="step step-one"><Sprout size={26} /><span>01</span></div>
    <div className="step step-two"><Target size={26} /><span>02</span></div>
    <div className="step step-three"><TrendingUp size={26} /><span>03</span></div>
    <div className="art-line" /><div className="art-note">Your pace. Your next step. <ArrowUpRight size={15} /></div>
  </div>;
}

function Modal({ title, children, onClose, className = '' }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className={`modal ${className}`} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>;
}

function About({ onClose }) {
  return <Modal title="Different paths. The same big idea." onClose={onClose}>
    <p>Levelly explores one linear relationship through three learning experiences. The answer stays connected; the scaffolding changes.</p>
    <div className="about-levels">{LEVELS.map(level => { const Icon = ICONS[level.id]; return <div key={level.id}><Icon size={22} /><strong>{level.name}</strong><span>{level.description}</span></div>; })}</div>
    <h3>Verified mathematics, thoughtful AI.</h3>
    <p>A tested algebra engine generates every equation, answer, and worked solution. The optional open-source AI coach reads your question locally, selects a relevant verified hint, or creates a new three-path practice set by choosing suitable verified parameters. The model cannot overwrite the answer or invent a displayed calculation.</p>
    <div className="privacy-note"><ShieldCheck size={22} /><span><strong>No API key. No question sent to a server.</strong> The first AI use downloads a model, which can be over 100 MB. A modern browser, internet access, and enough device memory are needed. Model downloads contact Hugging Face; later inference runs on your device.</span></div>
    <p className="small-text">AI model: {MODEL_ID}, quantized inference with Transformers.js. A small model can choose an unhelpful hint; all three verified hints remain available. Download failures are reported honestly and do not disable practice.</p>
    <a className="text-link" href={SOURCE} target="_blank" rel="noreferrer">Read the source and evaluation notes <ArrowUpRight size={16} /></a>
  </Modal>;
}

function CoreEditor({ core, onApply, onClose }) {
  const [values, setValues] = useState({ a: String(core.a), b: String(core.b), c: String(core.c) });
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    const parsed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)]));
    const message = validateCore(parsed);
    if (message) return setError(message);
    onApply(makeCore(parsed.a, parsed.b, parsed.c, core.d));
    onClose();
  }
  return <Modal title="Make the core idea your own." onClose={onClose}>
    <p>Start with <strong>ax + b = c</strong>. Levelly will transform the same relationship into all three paths.</p>
    <form onSubmit={submit}>
      <div className="core-fields">{[['a', 'Coefficient · a', '1–12'], ['b', 'Starting value · b', '0–40'], ['c', 'Right side · c', '1–400']].map(([key, label, range]) => <label key={key}>{label}<input inputMode="numeric" value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} required /><small>{range}</small></label>)}</div>
      <p className="small-text">For this whole-number lesson, choose values that give a positive integer solution from 1 to 30. Applying a new equation resets this example’s progress.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button primary" type="submit">Apply to all three paths <ArrowRight size={17} /></button>
    </form>
  </Modal>;
}

function Coach({ lesson, contextKey, onNewCore }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(null);
  const [question, setQuestion] = useState('How do I get started?');
  const [choice, setChoice] = useState(null);
  const [error, setError] = useState('');
  const worker = useRef(null), timer = useRef(null), request = useRef(0);
  const operation = useRef('hint'), candidates = useRef(null);
  const busy = status === 'loading' || status === 'thinking';

  function clearTimer() { clearTimeout(timer.current); }
  function fail(message) {
    clearTimer(); worker.current?.terminate(); worker.current = null;
    setStatus('error'); setError(message); setProgress(null);
  }
  function getWorker() {
    if (worker.current) return worker.current;
    const instance = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    instance.onmessage = ({ data }) => {
      if (data.type === 'progress') setProgress(Math.round(data.progress));
      if (data.type === 'ready') { clearTimer(); setStatus(current => current === 'thinking' ? current : 'ready'); setProgress(null); }
      if (data.type === 'choice') {
        clearTimer();
        if (data.requestId === request.current) {
          if (operation.current === 'task') onNewCore(candidates.current[data.index]);
          else setChoice(data.index);
        }
        setStatus('ready');
      }
      if (data.type === 'error' && (data.requestId === undefined || data.requestId === request.current)) fail('The AI could not finish. Check your connection and model-host access, or try again. Verified hints are still available.');
    };
    instance.onerror = () => fail('This browser could not start the AI model. Try a recent desktop browser. Verified practice still works.');
    worker.current = instance;
    return instance;
  }
  useEffect(() => () => { worker.current?.terminate(); clearTimeout(timer.current); }, []);
  useEffect(() => {
    request.current += 1; setChoice(null); setQuestion('How do I get started?');
  }, [contextKey]);

  function load() {
    setError(''); setStatus('loading'); setChoice(null);
    try {
      getWorker().postMessage({ type: 'load' });
      timer.current = setTimeout(() => fail('The model download timed out. You can retry; your practice does not depend on the download.'), 180000);
    } catch { fail('This browser could not start the AI worker. Verified practice is still available.'); }
  }
  function ask(event) {
    event.preventDefault();
    run('hint');
  }
  function run(mode) {
    if (status !== 'ready' || !question.trim()) return;
    setStatus('thinking'); setChoice(null);
    operation.current = mode;
    candidates.current = mode === 'task' ? buildTaskCandidates(Date.now()) : null;
    const requestId = ++request.current;
    const messages = mode === 'task' ? buildTaskMessages(candidates.current, question, lesson.level) : buildCoachMessages(lesson, question);
    getWorker().postMessage({ type: 'coach', requestId, messages });
    timer.current = setTimeout(() => fail('The AI took too long to respond on this device. Verified hints are still available.'), 60000);
  }
  return <section className="coach-card" aria-labelledby="coach-title">
    <div className="coach-top"><div className="sparkle-tile"><Sparkles size={22} /></div><span className={`status-dot ${status === 'ready' ? 'ready' : ''}`}>{status === 'ready' ? 'AI ready' : busy ? 'Working locally' : 'On-device AI'}</span></div>
    <h2 id="coach-title">A little nudge.<br />A new perspective.</h2>
    <p>Find a helpful hint or create a fresh practice set, tailored to your question and level.</p>
    {(status === 'idle' || status === 'error') && <>
      <button className="button coach-button" onClick={load}><Download size={16} />{status === 'error' ? 'Retry AI download' : 'Load private AI coach'}</button>
      <p className="download-note">Free · no account · first download can exceed 100 MB</p>
    </>}
    {status === 'loading' && <div className="ai-loading" role="status"><LoaderCircle className="spin" size={20} /><span>{progress === null ? 'Preparing the model…' : `Downloading model file · ${progress}%`}</span><button className="text-link" onClick={() => { worker.current?.terminate(); worker.current = null; clearTimer(); setStatus('idle'); }}>Cancel</button></div>}
    {(status === 'ready' || status === 'thinking') && <form onSubmit={ask} className="coach-form">
      <label htmlFor="coach-question">What are you working through?</label>
      <textarea id="coach-question" maxLength={400} value={question} onChange={event => setQuestion(event.target.value)} disabled={status === 'thinking'} rows={2} />
      <button className="button coach-button" disabled={status === 'thinking' || !question.trim()}>{status === 'thinking' ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}{status === 'thinking' ? 'Finding your next step…' : 'Ask my coach'}</button>
      <button type="button" className="ai-task-button" disabled={status === 'thinking' || !question.trim()} onClick={() => run('task')}><Sparkles size={13} />Create an AI practice set</button>
    </form>}
    {error && <p role="alert" className="ai-error">{error}</p>}
    {choice !== null && <div className="coach-response" role="status"><span><Sparkles size={13} />AI selected · {lesson.labels[choice]}</span><p>{lesson.hints[choice]}</p></div>}
    <div className="coach-footer"><ShieldCheck size={15} /><span>Private questions. Verified mathematics.</span></div>
  </section>;
}

export default function App() {
  const [session] = useState(loadSession);
  const [core, setCore] = useState(session.core);
  const [level, setLevel] = useState(session.level);
  const [records, setRecords] = useState(session.records);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const lesson = buildLesson(core, level), record = records[level];
  const completed = LEVELS.filter(item => records[item.id].completed).length;
  const LevelIcon = ICONS[level];
  useEffect(() => { try { sessionStorage.setItem('levelly-session', JSON.stringify({ core, level, records })); } catch { /* Practice remains available without storage. */ } }, [core, level, records]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); } }, [notice]);

  function updateRecord(patch) { setRecords(current => ({ ...current, [level]: { ...current[level], ...patch } })); }
  function applyCore(next, message = 'A fresh example, connected across all three paths.') { setCore(next); setRecords(emptyRecords()); setNotice(message); }
  function submit(event) { event.preventDefault(); const feedback = checkAnswer(lesson, record.value, record.cost); updateRecord({ feedback, completed: record.completed || feedback.status === 'correct' }); }

  return <>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#practice" aria-label="Levelly home"><span className="brand-mark"><i /><i /><i /></span>levelly<span className="brand-period">.</span></a>
      <nav aria-label="Main navigation"><a className="nav-active" href="#practice">Learning studio</a><button onClick={() => setModal('about')}>How it works</button><a href={`${import.meta.env.BASE_URL}report.pdf`} target="_blank" rel="noreferrer">Project report <ArrowUpRight size={13} /></a></nav>
      <div className="student-badge"><span>MZ</span><div>Maizhanov Zhalgas<small>Individual project</small></div></div>
    </div></header>

    <main id="practice" className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="eyebrow"><span className="tiny-star">✦</span> A LITTLE DIFFERENT. A LOT MORE YOU.</div><h1 id="hero-title">One idea.<br /><span>Three ways to grow.</span></h1><p>Math makes more sense when the path fits you.<br className="desktop-break" /> Find your level, follow your curiosity, and take the next step.</p><div className="hero-tags"><span><BookOpen size={14} />Algebra</span><span className="tag-divider">/</span><span>Linear equations</span><span className="hero-dot" /><span>At your own pace</span></div></div>
        <GrowthIllustration />
      </section>

      <div className="studio-heading"><div><span className="section-kicker">YOUR LEARNING STUDIO</span><h2>Start where you are.</h2></div><div className="core-pill"><span>THE CORE IDEA</span><strong>{equation(core)}</strong><button className="icon-button" aria-label="Edit core equation" onClick={() => setModal('core')}><SlidersHorizontal size={16} /></button></div></div>

      <div className="studio-grid">
        <aside className="path-sidebar" aria-label="Learning paths">
          <div className="path-heading"><h3>Choose your path</h3><span>01 — 03</span></div>
          <div className="path-list" role="group" aria-label="Difficulty level">{LEVELS.map(item => {
            const Icon = ICONS[item.id]; const active = item.id === level;
            return <button key={item.id} className={`path-card ${item.id} ${active ? 'selected' : ''}`} aria-pressed={active} onClick={() => setLevel(item.id)}>
              <div className="path-card-top"><span className="path-icon"><Icon size={21} /></span><span className="path-number">{records[item.id].completed ? <CheckCircle2 size={18} /> : item.number}</span></div>
              <strong>{item.name}</strong><span className="path-tag">{item.tag}</span><span className="path-description">{item.description}</span><ArrowUpRight size={17} className="path-arrow" />
            </button>;
          })}</div>
          <div className="progress-card"><div><span>Your exploration</span><strong>{completed}<span> / 3</span></strong></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completed} aria-label={`${completed} of 3 paths completed`}>{LEVELS.map(item => <span key={item.id} className={records[item.id].completed ? 'done' : ''} />)}</div><p>Different paths. Every one counts.</p></div>
        </aside>

        <section className={`lesson-card lesson-${level}`} aria-labelledby="lesson-title">
          <div className="lesson-meta"><span className={`level-badge ${level}`}><LevelIcon size={14} />{LEVELS.find(item => item.id === level).name}</span><button className="new-example" onClick={() => applyCore(generateCore(Date.now()))}><RefreshCw size={14} />New example</button></div>
          <div className="lesson-intro"><span className="lesson-eyebrow">{lesson.eyebrow}</span><h2 id="lesson-title">{lesson.title}</h2><p>{lesson.description}</p></div>
          {lesson.plans ? <div className="plan-grid">{lesson.plans.map((plan, index) => <div className={`rental-plan plan-${index}`} key={plan.name}><div><Bike size={21} /><strong>{plan.name}</strong></div><p><b>${plan.rate}</b> / hour <span>+ ${plan.fee} start fee</span></p><code>{plan.equation}</code></div>)}</div> : <div className="equation-panel"><span className="equation-decoration" aria-hidden="true">✧</span><div className="display-equation" aria-label={`Equation: ${lesson.equation}`}>{lesson.equation}</div><span className="equation-caption">{level === 'foundation' ? 'The goal? A value that brings both sides into balance.' : 'More terms. The same idea of balance.'}</span></div>}
          <form className="answer-form" onSubmit={submit} noValidate><label className="answer-question" htmlFor="answer">{lesson.question}</label><div className="answer-row"><label className="answer-input"><span>{level === 'advanced' ? 'h =' : 'x ='}</span><input id="answer" aria-label={level === 'advanced' ? 'Break-even hours' : 'Your answer for x'} inputMode="decimal" autoComplete="off" placeholder="?" value={record.value} onChange={event => updateRecord({ value: event.target.value, feedback: null })} /><span className="input-unit">{level === 'advanced' ? 'hours' : ''}</span></label>{level === 'advanced' && <label className="answer-input cost-input"><span>$</span><input aria-label="Shared cost" inputMode="decimal" autoComplete="off" placeholder="cost" value={record.cost} onChange={event => updateRecord({ cost: event.target.value, feedback: null })} /></label>}<button className="button primary" type="submit">Check answer <ArrowRight size={16} /></button></div></form>
          {record.feedback && <div className={`feedback ${record.feedback.status}`} role={record.feedback.status === 'correct' ? 'status' : 'alert'}>{record.feedback.status === 'correct' ? <CheckCircle2 size={20} /> : <CircleHelp size={20} />}<span>{record.feedback.message}</span></div>}
          <div className="guidance-actions"><button onClick={() => updateRecord({ hints: Math.min(3, record.hints + 1) })} disabled={record.hints >= 3}><Lightbulb size={16} />{record.hints ? record.hints === 3 ? 'All hints revealed' : 'Another hint' : 'A hint, please'}<span>{record.hints}/3</span></button><button aria-expanded={record.solution} onClick={() => updateRecord({ solution: !record.solution })}>{record.solution ? 'Hide worked solution' : 'See the worked solution'}<ChevronDown className={record.solution ? 'rotate' : ''} size={16} /></button></div>
          {record.hints > 0 && <div className="hints-list" aria-live="polite">{lesson.hints.slice(0, record.hints).map((hint, index) => <div key={hint}><span>{index + 1}</span><p>{hint}</p></div>)}</div>}
          {record.solution && <div className="worked-solution"><h3><BookOpen size={17} />One step at a time</h3>{lesson.steps.map((step, index) => <div className="solution-step" key={step.title}><span>{index + 1}</span><div><h4>{step.title}</h4><p className="step-math">{step.math}</p><p>{step.text}</p></div></div>)}</div>}
          <div className="lesson-footer"><span className="balance-icon">=</span><p>One core idea. The challenge changes.<br /><strong>Your understanding grows.</strong></p></div>
        </section>

        <aside className="right-sidebar"><Coach lesson={lesson} contextKey={`${core.a}-${core.b}-${core.c}-${core.d}-${level}`} onNewCore={next => applyCore(next, 'Your AI coach chose a new practice set across all three paths.')} /><div className="mindset-card"><span><Leaf size={16} />A NOTE TO YOURSELF</span><p>“Not yet” is a perfectly good place to start.</p><div>There’s no timer here.<br />Just your next small step.</div></div></aside>
      </div>

      <section className="learning-note"><div className="note-icon"><GraduationCap size={25} /></div><div><h3>Same destination. A path that fits.</h3><p>Foundation builds confidence. Standard deepens the skill. Advanced connects it to the world.<br className="desktop-break" /> Switch whenever you like — each path explores the same underlying equation.</p></div><button className="text-link" onClick={() => setModal('about')}>Behind the learning <ArrowUpRight size={17} /></button></section>
      <footer className="site-footer"><a className="brand footer-brand" href="#practice">levelly<span className="brand-period">.</span></a><span>Made for curious minds. Prepared for Maizhanov Zhalgas.</span><a href={SOURCE} target="_blank" rel="noreferrer">Source code <ExternalLink size={13} /></a><a href={`${import.meta.env.BASE_URL}report.pdf`} target="_blank" rel="noreferrer"><FileText size={14} />One-page report</a></footer>
    </main>
    {modal === 'about' && <About onClose={() => setModal(null)} />}
    {modal === 'core' && <CoreEditor core={core} onApply={applyCore} onClose={() => setModal(null)} />}
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </>;
}
