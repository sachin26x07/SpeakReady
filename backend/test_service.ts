import { testProviderConnection, callAI } from './src/services/aiProvider';
import { generateGrammarQuestions } from './src/services/aiServices';

async function run() {
  console.log('--- Testing testProviderConnection groq ---');
  const groqTest = await testProviderConnection('groq');
  console.log('Groq test:', groqTest);

  console.log('\n--- Testing testProviderConnection gemini ---');
  const geminiTest = await testProviderConnection('gemini');
  console.log('Gemini test:', geminiTest);

  console.log('\n--- Testing generateGrammarQuestions with groq ---');
  try {
    const groqGrammar = await generateGrammarQuestions(2, 'easy', 'Tenses', 'groq');
    console.log('Groq grammar success:', groqGrammar.length, 'questions');
  } catch (e: any) {
    console.error('Groq grammar error:', e?.message || e);
  }

  console.log('\n--- Testing generateGrammarQuestions with gemini ---');
  try {
    const geminiGrammar = await generateGrammarQuestions(2, 'easy', 'Tenses', 'gemini');
    console.log('Gemini grammar success:', geminiGrammar.length, 'questions');
  } catch (e: any) {
    console.error('Gemini grammar error:', e?.message || e);
  }
}

run();
