export const PRINT_DISCLAIMER =
  "All the revenue information displayed on these maps is based on the data provided by Haryana Revenue Department. HARSAC is not responsible for any discrepancy in the data, if any. This information on the map is not for any dispute in the court of law. It is for viewing purposes only. The map scale is 1:4,000.";

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

export async function waitForMapToSettle(view, maxWaitMs = 3500) {
  const start = Date.now();
  while (view?.updating && Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

export async function takeMapScreenshotWithRetry(view) {
  try {
    const shot = await view.takeScreenshot({ format: "png" });
    return shot?.dataUrl ?? null;
  } catch (firstErr) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const retryShot = await view.takeScreenshot({ format: "png" });
      return retryShot?.dataUrl ?? null;
    } catch (retryErr) {
      console.warn("Map screenshot retry failed:", retryErr.message);
      console.warn("Map screenshot initial failure:", firstErr.message);
      return null;
    }
  }
}

export async function runPrintViewLifecycle({
  zoomForPrint,
  restoreExtentAfterPrint,
  beforePrintDelayMs = 1400,
}) {
  document.body.classList.add("print-parcel-view");
  const savedExtent = await zoomForPrint();
  await new Promise((resolve) => setTimeout(resolve, beforePrintDelayMs));
  triggerPrint();
  window.addEventListener(
    "afterprint",
    async () => {
      document.body.classList.remove("print-parcel-view");
      await restoreExtentAfterPrint(savedExtent);
    },
    { once: true },
  );
}
