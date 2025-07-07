// This file should be placed in: netlify/functions/gemini-proxy.js

exports.handler = async function (event, context) {
  // --- Log invocation ---
  console.log("--- FUNCTION INVOCATION START ---");
  console.log("Request received at:", new Date().toISOString());
  console.log("Request method:", event.httpMethod);

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.error("Execution stopped: Blocked non-POST request.");
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Check for the API key first
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("FATAL ERROR: GEMINI_API_KEY environment variable not found on Netlify.");
      throw new Error("API key is not configured on the server.");
    }
    console.log("SUCCESS: GEMINI_API_KEY environment variable was found.");

    // Check the request body
    if (!event.body) {
        console.error("Execution stopped: Request body is empty.");
        throw new Error("Request body is empty.");
    }
    const { prompt } = JSON.parse(event.body);
    console.log("Successfully parsed prompt from request body.");
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    console.log("Calling Gemini API...");
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log("Gemini API response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error Body:', errorBody);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Successfully received response from Gemini.");

    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        console.log("--- FUNCTION INVOCATION SUCCESS ---");
        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };
    } else {
         console.error("Invalid response structure from Gemini:", JSON.stringify(result, null, 2));
         throw new Error('No valid content in Gemini API response.');
    }

  } catch (error) {
    console.error('--- PROXY FUNCTION EXECUTION FAILED ---');
    console.error(error.toString());
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
