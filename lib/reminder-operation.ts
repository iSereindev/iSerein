/** Race even browser promises that do not support cancellation. Callers must
 * check the signal before every subsequent side effect. */
export function bounded<T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const stop = () => reject(signal.reason || new Error("Reminder setup timed out"));
    if (signal.aborted) { Promise.resolve(promise).catch(() => {}); stop(); return; }
    signal.addEventListener("abort", stop, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", stop));
  });
}
export function checkOperation(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason || new Error("Reminder setup timed out");
}
