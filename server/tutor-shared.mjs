export const MODEL = 'gpt-5-mini';

export class TutorError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
