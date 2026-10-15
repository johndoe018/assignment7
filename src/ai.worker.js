import { pipeline, env } from '@huggingface/transformers';
import { MODEL_ID, MODEL_REVISION, parseCoachChoice } from './prompts.mjs';

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;

let coach;
let loading;

async function load() {
  if (coach) return coach;
  if (!loading) {
    loading = pipeline('text-generation', MODEL_ID, {
      revision: MODEL_REVISION,
      dtype: 'q4',
      device: 'wasm',
      progress_callback: event => {
        if (event.status === 'progress') self.postMessage({ type: 'progress', file: event.file, progress: event.progress });
      },
    }).then(model => {
      coach = model;
      self.postMessage({ type: 'ready' });
      return model;
    }).catch(error => { loading = null; throw error; });
  }
  return loading;
}

self.onmessage = async ({ data }) => {
  try {
    const model = await load();
    if (data.type === 'load') return;
    const response = await model(data.messages, {
      max_new_tokens: 3,
      do_sample: false,
      return_full_text: false,
    });
    const generated = response[0].generated_text;
    const text = typeof generated === 'string' ? generated : generated.at(-1).content;
    self.postMessage({ type: 'choice', requestId: data.requestId, index: parseCoachChoice(text) });
  } catch (error) {
    self.postMessage({ type: 'error', requestId: data.requestId, message: error.message || 'The AI model could not load.' });
  }
};
