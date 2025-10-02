// Resume data extracted from index.html
const experienceForPrompt = `
[id: exp-mentor-1] Supported members in growing toward future team; continued informal mentoring afterward.
[id: exp-mentor-2] Still mentor team in events like 'Exir Job Expo' and 'From Konkor to Job' (with guests like Amin Aramesh and Mohammad Hadi Shirani).
[id: exp-director-1] Rebuilt and led a student Magazine from zero, growing it into an active community with multiple departments with more than 20 active members.
[id: exp-director-2] Founded 'NoPa' podcast and producing over 22 episodes and more than 4000 times listened (organic growth), organized key events, including 'A bridge to the future'.
[id: exp-director-3] Worked with Tapsell to provide free training access and invited their CMO to join an on-campus panel.
[id: exp-director-4] Played a supporting role in creating a shared team culture and longer-term commitment.
[id: exp-associate-1] Taught myself GA4 & GTM; used them to help the team make sense of key metrics.
[id: exp-associate-2] Initiated and executed SMS campaigns and basic content production.
[id: exp-associate-3] Joined business team to talk to merchants and support outreach.
[id: exp-associate-4] Represented Nasiba in Iran Fintech Association.
[id: exp-associate-5] Brought in three interns via university network; facilitated external collaborations.
`;

const skillsForPrompt = `
[id: skill-comm-1] Working Across Functional Roles
[id: skill-comm-2] Negotiation & Partnership Management
[id: skill-comm-3] Public Speaking and Group Facilitation
[id: skill-comm-4] Storytelling & Internal Motivation
[id: skill-lead-1] Team Building from Scratch
[id: skill-lead-2] Talent Identification & Mentorship
[id: skill-lead-3] Facilitating Group Progress in Uncertain Situations
[id: skill-lead-4] Listening and Conflict Navigation
[id: skill-lead-5] Creating Shared Sense of Ownership
[id: skill-tech-1] GA4 & GTM
[id: skill-tech-2] Leveraging AI tools for efficiency
[id: skill-tech-3] Trello
[id: skill-tech-4] Excel (PivotTables, Lookups) & Power BI
[id: skill-tech-5] Microsoft Office, Canva
`;

async function callGeminiApi(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not available. Ensure it's set in Vercel Environment Variables.");
  }
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
              type: "OBJECT",
              properties: {
                  summary: { type: "STRING" },
                  relevant_experience_ids: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                  },
                  relevant_skill_ids: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                  }
              }
          }
      }
  };

  // Using a simple fetch for Vercel environment, no need for retries logic here as it's a serverless function.
  const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return JSON.parse(result.candidates[0].content.parts[0].text);
  } else {
      console.error("Unexpected API response:", result);
      throw new Error("Invalid response structure from API.");
  }
}


export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { jobTitle, language: requestedLanguage } = request.body;
    if (!jobTitle) {
      return response.status(400).json({ message: "jobTitle is required" });
    }

    const language = requestedLanguage === 'fa' ? 'fa' : 'en';
    const languageInstruction = language === 'fa'
      ? 'Respond in Persian (Farsi). Translate all narrative content into fluent, professional Persian while keeping proper nouns (company, product, tool names) in their original form.'
      : 'Respond in English. Keep proper nouns unchanged.';

    const prompt = `
        Analyze the following resume content and tailor it for the job title: "${jobTitle}".

        ${languageInstruction}

        **Tone of Voice Instructions:** The user's core values are teamwork and authenticity. The generated text must reflect this. Use a humble yet confident, action-oriented, and team-focused tone ("we" for team achievements). Avoid buzzwords, exaggeration, or language that sounds like a "lone star". The summary should be grounded in the provided facts.

        1.  **Rewrite the Summary:** Create a professional summary (3-4 sentences) that highlights the most relevant aspects for this specific role, while adhering to the specified tone.
               - please note that you should look at everything that is in the resume, use all of the information which the resume suggest!(including Nasiba exprience and New-Samaneh magazine)
               - everytime you want to rewrite the summary, tell a bit about the abillity of the owner of the CV to Use generative AI and the fast learning power that he have.
        2.  **Select Relevant Experiences:** From a list of experiences below, identify the IDs of the bullet points that are most relevant to the job title. Return only the IDs.
        3.  **Select Relevant Skills:** From a list of skills below, identify the IDs of the skills that are most relevant. Return only the IDs.

        **Experiences:**
        ${experienceForPrompt}

        **Skills:**
        ${skillsForPrompt}

        The "summary" field must be written entirely in ${language === 'fa' ? 'Persian (Farsi)' : 'English'} and follow the tone instructions above. Do not translate or modify the experience or skill IDs; return them exactly as provided.

        Return a JSON object with three keys: "summary", "relevant_experience_ids", and "relevant_skill_ids".
    `;

    const tailoredContent = await callGeminiApi(prompt);
    response.status(200).json(tailoredContent);

  } catch (error) {
    console.error("Error in /api/tailor:", error);
    response.status(500).json({ message: "Failed to generate content.", error: error.message });
  }
}
