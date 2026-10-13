import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`\n🚀 SpeakReady AI Backend running at http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Groq configured: ${Boolean(config.groq.apiKey)} (model: ${config.groq.model})`);
  console.log(`   Gemini configured: ${Boolean(config.gemini.apiKey)} (model: ${config.gemini.model})`);
  console.log(`\nEndpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/settings/status`);
  console.log(`   POST /api/settings/test-connection`);
  console.log(`   POST /api/practice/grammar/generate`);
  console.log(`   POST /api/practice/listening/generate`);
  console.log(`   POST /api/practice/repeat/generate`);
  console.log(`   POST /api/practice/repeat/compare`);
  console.log(`   POST /api/practice/speaking/prompt`);
  console.log(`   POST /api/practice/speaking/evaluate`);
  console.log(`   POST /api/practice/reading/generate`);
  console.log(`   POST /api/practice/vocabulary/generate`);
  console.log(`   POST /api/interview/parse-resume`);
  console.log(`   POST /api/interview/generate-questions`);
  console.log(`   POST /api/interview/evaluate\n`);
});
