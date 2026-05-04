require('dotenv').config({ path: '../.env' });
async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) {
       console.error("API Error:", data.error);
       return;
    }
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
listModels();
