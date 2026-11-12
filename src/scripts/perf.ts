/** Coarsen the character grid one notch when frames average over 24 ms. */
export function nextNotch(avgMs: number, notch: number): number {
  return avgMs > 24 && notch < 4 ? notch + 1 : notch;
}

/** Accumulates frame times; returns the average once a second's worth has been added. */
export class FrameSampler {
  private sum = 0;
  private n = 0;

  add(ms: number): number | null {
    this.sum += ms;
    this.n++;
    if (this.sum < 1000) return null;
    const avg = this.sum / this.n;
    this.sum = 0;
    this.n = 0;
    return avg;
  }
}
