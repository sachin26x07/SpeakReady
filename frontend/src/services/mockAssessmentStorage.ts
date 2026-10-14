import type { MockAssessmentSnapshot } from '../types';

const MOCK_ASSESSMENT_KEY = 'speakready_mock_assessment';

export function loadMockAssessment(): MockAssessmentSnapshot | null {
  try {
    const raw = localStorage.getItem(MOCK_ASSESSMENT_KEY);
    if (!raw) return null;

    const snapshot: unknown = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== 'object') return null;

    const candidate = snapshot as Partial<MockAssessmentSnapshot>;
    if (
      candidate.version !== 1 ||
      !['grammar', 'listening', 'speaking'].includes(candidate.phase || '') ||
      !Array.isArray(candidate.grammarQuestions) ||
      !Array.isArray(candidate.listeningAnswers) ||
      !candidate.listeningExercise
    ) {
      localStorage.removeItem(MOCK_ASSESSMENT_KEY);
      return null;
    }

    return candidate as MockAssessmentSnapshot;
  } catch (error) {
    console.error('[Mock Assessment] Failed to load saved assessment:', error);
    return null;
  }
}

export function saveMockAssessment(snapshot: MockAssessmentSnapshot): void {
  try {
    localStorage.setItem(MOCK_ASSESSMENT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('[Mock Assessment] Failed to save assessment progress:', error);
  }
}

export function clearMockAssessment(): void {
  try {
    localStorage.removeItem(MOCK_ASSESSMENT_KEY);
  } catch (error) {
    console.error('[Mock Assessment] Failed to clear saved assessment:', error);
  }
}
