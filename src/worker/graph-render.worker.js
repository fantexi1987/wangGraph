import registerPromiseWorker from 'promise-worker/register';
registerPromiseWorker((msg) => {
  alert(1111);
  return msg;
});
