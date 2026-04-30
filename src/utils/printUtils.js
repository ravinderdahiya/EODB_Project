let _lastBaseName = null;
let _counter = 1;

function buildBaseName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `EODB_Print_${date}_${time}`;
}

export function triggerPrint() {
  const base = buildBaseName();

  if (base === _lastBaseName) {
    _counter += 1;
  } else {
    _lastBaseName = base;
    _counter = 1;
  }

  const filename = _counter === 1 ? base : `${base}_${_counter}`;
  const prevTitle = document.title;
  document.title = filename;

  window.print();

  window.addEventListener("afterprint", () => {
    document.title = prevTitle;
  }, { once: true });
}
