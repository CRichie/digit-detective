import { best } from './core.js';
onmessage = e => {
  const { candidates, history } = e.data;
  postMessage(best(candidates, history));
};
