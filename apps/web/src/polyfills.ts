// Polyfill WeakRef for environments that don't expose it globally (e.g. Cloudflare Workers with nodejs_compat)
if (typeof globalThis.WeakRef === 'undefined') {
  (globalThis as any).WeakRef = class WeakRef<T extends object> {
    private _target: T;
    constructor(target: T) {
      this._target = target;
    }
    deref(): T | undefined {
      return this._target;
    }
  };
}
