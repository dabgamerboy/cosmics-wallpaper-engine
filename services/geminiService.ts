import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, ModelType, WallpaperType } from "../types";

export const generateWallpaperImage = async (config: GenerationConfig): Promise<string> => {
  // Always create a new instance to ensure we pick up any potentially selected API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Base configuration
  const requestConfig: any = {
    imageConfig: {
      aspectRatio: config.aspectRatio,
    },
  };

  // Model-specific configurations
  if (config.model === ModelType.Pro) {
    // Pro model supports explicit image size
    requestConfig.imageConfig.imageSize = config.imageSize;
  }

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: {
        parts: [{ text: config.prompt }],
      },
      config: requestConfig,
    });

    // Parse response for image data
    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image data found in the response.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateWallpaperVideo = async (config: GenerationConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Veo generation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: config.prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: config.aspectRatio as any, // Cast to match API types (16:9 or 9:16)
      }
    });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation completed but no download link was provided.");
    }

    // Fetch the video content
    // We must append the API key manually when fetching from the URI provided by Veo
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Convert Blob to Base64 to store in our app state/history
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    console.error("Gemini Video Generation Error:", error);
    throw error;
  }
};

export const generateRandomPrompt = async (category: string = 'Any'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let userPrompt = "";

  // Construct prompt based on category with style enforcement
  if (category === 'Anime') {
    userPrompt = "Generate a detailed, high-quality Anime/Manga style desktop wallpaper description. Make it cinematic and visually stunning (e.g., Makoto Shinkai or Studio Ghibli style).";
  } else {
    // Non-Anime categories
    if (category === 'Any') {
      userPrompt = "Generate a completely random, highly detailed, and creative image description for a desktop wallpaper. Pick a cool theme (Space, Nature, Cyberpunk, Abstract, Automotive, etc.).";
    } else {
      userPrompt = `Generate a highly detailed and creative image description for a desktop wallpaper specifically in the '${category}' style/theme.`;
    }

    // STRICT STYLE ENFORCEMENT
    userPrompt += " IMPORTANT: The visual style MUST be Photorealistic, Cinematic, or Hyper-realistic 3D Render (Octane Render/Unreal Engine 5). STRICTLY AVOID: cartoons, vector art, simple illustrations, caricatures, and cel-shaded drawings.";
    
    // SPECIFIC CAR ENFORCEMENT
    if (category === 'Cars' || category === 'Any') {
      userPrompt += " If the subject is a car, it MUST look like a real vehicle in a cinematic setting (e.g., a high-end car commercial, Gran Turismo aesthetic, wet asphalt with neon reflections, or salt flats). The car proportions and lighting must be 100% realistic.";
    }
  }

  userPrompt += " The concept must be vivid, evocative and suitable for a high-quality background. Return ONLY the prompt text, no introductory phrases.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
    });
    return response.text?.trim() || `A surreal ${category} landscape, photorealistic, 8k`;
  } catch (error) {
    console.error("Failed to generate random prompt:", error);
    return "A sleek matte black sports car driving through a rainy cybercity at night, photorealistic, cinematic lighting, 8k resolution, wet road reflections"; // Fallback
  }
};

export const checkApiKeySelection = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return true; // Fallback for environments outside of the specific studio context where this might be mocked or pre-set
};

export const promptApiKeySelection = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};