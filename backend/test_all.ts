import {
  generateListeningExercise,
  generateRepeatSentences,
  generateSpeakingPrompt,
  evaluateSpeakingAnswer,
  generateResumeQuestions,
  evaluateInterviewAnswer,
  generateReadingPassage,
  generateVocabularyWords
} from './src/services/aiServices';

async function testAll() {
  const providers = ['groq', 'gemini'] as const;
  for (const p of providers) {
    console.log(`\n=================== TESTING PROVIDER: ${p} ===================`);
    try {
      console.log(`Testing generateListeningExercise with ${p}...`);
      const le = await generateListeningExercise('easy', 'workplace conversation', p);
      console.log(`[PASS] generateListeningExercise ${p}:`, le.id, le.questions.length, 'questions');
    } catch (e: any) {
      console.error(`[FAIL] generateListeningExercise ${p}:`, e.message || e);
    }

    try {
      console.log(`Testing generateRepeatSentences with ${p}...`);
      const rs = await generateRepeatSentences(1, 2, p);
      console.log(`[PASS] generateRepeatSentences ${p}:`, rs.length, 'sentences');
    } catch (e: any) {
      console.error(`[FAIL] generateRepeatSentences ${p}:`, e.message || e);
    }

    try {
      console.log(`Testing generateSpeakingPrompt with ${p}...`);
      const sp = await generateSpeakingPrompt('general', 'easy', p);
      console.log(`[PASS] generateSpeakingPrompt ${p}:`, sp.id);
    } catch (e: any) {
      console.error(`[FAIL] generateSpeakingPrompt ${p}:`, e.message || e);
    }

    try {
      console.log(`Testing evaluateSpeakingAnswer with ${p}...`);
      const sa = await evaluateSpeakingAnswer('Tell me about yourself', 'I am software engineer from Pune', 'english', p);
      console.log(`[PASS] evaluateSpeakingAnswer ${p}: score`, sa.overall_score);
    } catch (e: any) {
      console.error(`[FAIL] evaluateSpeakingAnswer ${p}:`, e.message || e);
    }
  }
}

testAll();
