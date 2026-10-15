const dotenv = require('dotenv');
dotenv.config();

async function testGroq() {
  console.log('--- Testing Groq ---');
  console.log('Model:', process.env.GROQ_MODEL);
  console.log('Key exists:', !!process.env.GROQ_API_KEY, 'Prefix:', (process.env.GROQ_API_KEY || '').slice(0, 8));
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hello' }],
      }),
    });
    console.log('Groq status:', res.status);
    const body = await res.text();
    console.log('Groq response:', body.slice(0, 300));
  } catch (e) {
    console.error('Groq error:', e.message);
  }
}

async function testGemini() {
  console.log('\n--- Testing Gemini ---');
  console.log('Model:', process.env.GEMINI_MODEL);
  console.log('Key exists:', !!process.env.GEMINI_API_KEY, 'Prefix:', (process.env.GEMINI_API_KEY || '').slice(0, 8));
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log('Gemini response:', result.response.text());
  } catch (e) {
    console.error('Gemini error:', e.message);
  }
}

async function run() {
  await testGroq();
  await testGemini();
}
run();
