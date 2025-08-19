export default function handler(request, response) {
  response.status(200).json({
    apiKey: process.env.GEMINI_API_KEY,
  });
}
