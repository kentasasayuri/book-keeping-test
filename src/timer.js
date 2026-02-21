class CountdownTimer {
  constructor(totalSeconds, { onTick, onComplete } = {}) {
    this.totalSeconds = totalSeconds;
    this.remainingSeconds = totalSeconds;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.remainingSeconds -= 1;

      if (typeof this.onTick === 'function') {
        this.onTick(this.remainingSeconds);
      }

      if (this.remainingSeconds <= 0) {
        this.stop();
        this.remainingSeconds = 0;

        if (typeof this.onComplete === 'function') {
          this.onComplete();
        }
      }
    }, 1000);
  }

  stop() {
    if (!this.intervalId) {
      return;
    }

    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }

  reset(nextTotalSeconds = this.totalSeconds) {
    this.stop();
    this.totalSeconds = nextTotalSeconds;
    this.remainingSeconds = nextTotalSeconds;
  }

  getRemainingSeconds() {
    return this.remainingSeconds;
  }
}

function formatRemainingTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export { CountdownTimer, formatRemainingTime };
