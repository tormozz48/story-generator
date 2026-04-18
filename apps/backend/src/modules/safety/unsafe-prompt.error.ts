export class UnsafePromptError extends Error {
  constructor(public readonly reason: string) {
    super(`Prompt blocked by safety filter: ${reason}`);
    this.name = 'UnsafePromptError';
  }
}
