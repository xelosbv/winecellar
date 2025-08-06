import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface WineAnalysisResult {
  success: boolean;
  message?: string;
  wineData?: {
    name?: string;
    producer?: string;
    year?: number;
    type?: string;
    region?: string;
    country?: string;
    alcoholContent?: string;
    vintage?: number;
    appellation?: string;
    grapes?: string[];
  };
}

export async function analyzeWineLabel(base64Image: string): Promise<WineAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a wine expert analyzing wine labels. Extract information from wine label images and return a JSON object with the following structure:

{
  "name": "Full wine name as shown on label",
  "producer": "Producer/winery name", 
  "year": 2020, // vintage year as number
  "type": "red|white|rosé|champagne|sparkling", // wine type, use lowercase
  "region": "Wine region (e.g., Bordeaux, Napa Valley)",
  "country": "Country of origin",
  "alcoholContent": "Alcohol percentage if visible",
  "appellation": "Official designation (AOC, AVA, etc.)",
  "grapes": ["Array of grape varieties if listed"]
}

Only include fields where you can confidently read the information from the label. If you cannot clearly read text or are unsure, omit that field. Be conservative and accurate rather than guessing.

For wine type classification:
- "red" for red wines
- "white" for white wines  
- "rosé" for rosé/pink wines
- "champagne" for Champagne (from Champagne region only)
- "sparkling" for all other sparkling wines

Return only the JSON object, no additional text.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this wine label and extract the wine information in JSON format."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        message: "No response from AI analysis"
      };
    }

    try {
      // Parse the JSON response
      const wineData = JSON.parse(content);
      
      // Validate that we got some useful data
      if (!wineData.name && !wineData.producer) {
        return {
          success: false,
          message: "Could not identify wine name or producer from the label"
        };
      }

      return {
        success: true,
        wineData
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return {
        success: false,
        message: "Failed to parse wine information from the label"
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      success: false,
      message: "Failed to analyze image. Please try again."
    };
  }
}