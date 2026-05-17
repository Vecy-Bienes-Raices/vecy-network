import { VertexAI } from '@google-cloud/vertexai';

async function test() {
  try {
    const vertexAI = new VertexAI({ project: 'jania-evaluadora-pro', location: 'us-central1' });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hola, responde con la palabra TEST.');
    const response = await result.response;
    console.log('Response:', response.candidates[0].content.parts[0].text);
  } catch (e: any) {
    console.error('Error:', e.message);
    if (e.response) console.error('Data:', JSON.stringify(e.response.data));
  }
}

test();
