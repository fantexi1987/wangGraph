onmessage = function (e) {
  let data = e?.data[1];
  if (data) {
    let { type, fn } = data;
    if (type === 'func') {
      fn();
      e.data[1] = 'successes';
      postMessage(e.data);
    }
  }
};
