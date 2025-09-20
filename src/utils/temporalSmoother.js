// Exponential Moving Average over logits + small sliding window vote.
export default class TemporalSmoother {
    constructor({ classes, emaAlpha = 0.6, win = 8, enter = 0.60, exit = 0.45 }) {
      this.C = classes;
      this.K = classes.length;
      this.ema = new Array(this.K).fill(0);     // EMA over probabilities
      this.alpha = emaAlpha;
      this.win = win;
      this.queue = [];                           // recent top-1 labels
      this.enter = enter;                        // hysteresis enter threshold
      this.exit = exit;                          // hysteresis exit threshold
      this.active = null;                        // current “locked” label
    }
  
    // probs is Float32Array or number[] length K
    step(probs) {
      // 1) EMA
      for (let i = 0; i < this.K; i++) {
        this.ema[i] = this.alpha * probs[i] + (1 - this.alpha) * this.ema[i];
      }
  
      // 2) window vote of top-1
      const top = this.argmax(this.ema);
      this.queue.push(top);
      if (this.queue.length > this.win) this.queue.shift();
  
      // 3) hysteresis decode
      const pTop = this.ema[top];
      if (this.active == null) {
        // lock in only if confident enough & has window support
        const majority = this.majority(this.queue);
        if (pTop >= this.enter && majority === top) {
          this.active = top;
          return { emit: this.C[top], score: pTop };
        }
      } else {
        // remain active until confidence falls below exit
        const pActive = this.ema[this.active];
        if (pActive < this.exit) {
          this.active = null;
        }
      }
      return { emit: null, score: pTop, topIndex: top };
    }
  
    argmax(arr) {
      let m = -Infinity, idx = 0;
      for (let i = 0; i < arr.length; i++) if (arr[i] > m) { m = arr[i]; idx = i; }
      return idx;
    }
    majority(arr) {
      const counts = {};
      for (const v of arr) counts[v] = (counts[v] ?? 0) + 1;
      let best = null, c = -1;
      for (const [k, v] of Object.entries(counts)) if (v > c) { c = v; best = +k; }
      return best;
    }
  
    reset() {
      this.ema.fill(0);
      this.queue = [];
      this.active = null;
    }
  }
  