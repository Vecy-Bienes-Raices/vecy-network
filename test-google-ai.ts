import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  try {
    const genAI = new GoogleGenerativeAI('AIzaSyBUgU_A1ML_9DIgP3qSlT_kM1aeFW5HJiY');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hola, responde con la palabra TEST.');
    const response = await result.response;
    console.log('Response:', response.text());
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

test();
