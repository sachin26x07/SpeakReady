export function resolveOptionAnswer(answer: string, options?: string[]): string {
  if (!options?.length) return answer;

  const normalizedAnswer = answer.trim().toLocaleLowerCase();
  const exactOption = options.find(option => option.trim().toLocaleLowerCase() === normalizedAnswer);
  if (exactOption) return exactOption;

  const answerWithoutLabel = normalizedAnswer.replace(/^(?:option\s*)?[a-d][).:\s-]+/i, '').trim();
  if (answerWithoutLabel !== normalizedAnswer) {
    const labelledOption = options.find(
      option => option.trim().replace(/^[a-d][).:\s-]+/i, '').trim().toLocaleLowerCase() === answerWithoutLabel
    );
    if (labelledOption) return labelledOption;
  }

  const letterMatch = answer.trim().match(/^(?:option\s*)?([a-d])(?:[).:\s-]|$)/i);
  if (letterMatch) {
    const optionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (options[optionIndex]) return options[optionIndex];
  }

  return answer;
}

export function normalizeWrittenAnswer(answer: string): string {
  return answer
    .toLocaleLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function writtenAnswersMatch(userAnswer: string, correctAnswer: string): boolean {
  return normalizeWrittenAnswer(userAnswer) === normalizeWrittenAnswer(correctAnswer);
}
