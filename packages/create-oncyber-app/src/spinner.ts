const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function createSpinner(text: string) {
  let i = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (process.stdout.isTTY) {
        interval = setInterval(() => {
          const frame = frames[i++ % frames.length];
          process.stdout.write(`\r${frame} ${text}`);
        }, 80);
      } else {
        process.stdout.write(`${text}\n`);
      }
      return this;
    },
    stop(finalText?: string) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (process.stdout.isTTY) {
        process.stdout.write("\r\x1b[K");
      }
      if (finalText) {
        process.stdout.write(`${finalText}\n`);
      }
      return this;
    },
  };
}

/**
 * Multi-step progress display.
 * Shows all steps upfront with pending markers, then updates each
 * in-place with a spinner while running → checkmark when done.
 */
export function createSteps(labels: string[]) {
  const isTTY = process.stdout.isTTY;
  const pending = "◻";
  const done = "✅";
  let currentStep = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let frameIdx = 0;

  function render() {
    if (!isTTY) return;
    // Move cursor up to the first step line and redraw all
    if (currentStep > 0 || interval) {
      process.stdout.write(`\x1b[${labels.length}A`);
    }
    for (let i = 0; i < labels.length; i++) {
      let icon: string;
      if (i < currentStep) {
        icon = done;
      } else if (i === currentStep && interval) {
        icon = frames[frameIdx % frames.length];
      } else {
        icon = pending;
      }
      process.stdout.write(`\r\x1b[K${icon}  ${labels[i]}\n`);
    }
  }

  return {
    /** Print all steps with pending markers */
    start() {
      if (isTTY) {
        for (const label of labels) {
          process.stdout.write(`${pending}  ${label}\n`);
        }
      }
    },

    /** Begin spinning on the current step */
    startStep() {
      if (isTTY) {
        frameIdx = 0;
        interval = setInterval(() => {
          frameIdx++;
          render();
        }, 80);
      } else {
        process.stdout.write(`${labels[currentStep]}...\n`);
      }
    },

    /** Mark the current step as done and advance */
    completeStep() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      currentStep++;
      if (isTTY) {
        render();
      } else {
        process.stdout.write(`Done.\n`);
      }
    },
  };
}
