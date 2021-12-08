import WorkerPromise from './worker-promise';
import Worker from 'web-worker:./graph-render.worker';

const promise = new WorkerPromise(new Worker());

export default {
  doWebWorkerFn(fn) {
    return promise.postMessage({
      type: 'func',
      fn
    });
  }
};
