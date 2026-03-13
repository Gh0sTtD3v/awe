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
