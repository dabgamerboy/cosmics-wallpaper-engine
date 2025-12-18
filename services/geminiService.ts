
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, ModelType, WallpaperType, AspectRatio } from "../types";

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

  // Construct parts for multimodal or text-only request
  const parts: any[] = [];

  // If an image is provided (for inspiration/reference), add it first
  if (config.image) {
      const base64Data = config.image.split(',')[1];
      const mimeType = config.image.substring(config.image.indexOf(':') + 1, config.image.indexOf(';'));
      
      parts.push({
          inlineData: {
              mimeType: mimeType,
              data: base64Data
          }
      });
  }

  // Add the text prompt
  // If no prompt is provided but an image is, we might need a default prompt, 
  // but usually the UI enforces a prompt or the user provides one.
  // Gemini Image Gen models generally work better with a text prompt accompanying the image.
  parts.push({ text: config.prompt || "Generate a high quality wallpaper based on this image." });

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: {
        parts: parts,
      },
      config: requestConfig,
    });

    // Parse response for image data
    // Fixed: Iterate through all parts to find the image part as recommended
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
    let operation;
    
    // Ensure we are using valid Veo aspect ratios
    const validAspectRatio = config.aspectRatio === AspectRatio.Portrait ? '9:16' : '16:9';

    if (config.image) {
      // Image-to-Video Generation
      const base64Data = config.image.split(',')[1];
      const mimeType = config.image.substring(config.image.indexOf(':') + 1, config.image.indexOf(';'));

      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt || undefined, // Prompt is optional for image-to-video
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: validAspectRatio as any,
        }
      });
    } else {
      // Text-to-Video Generation
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: validAspectRatio as any,
        }
      });
    }

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Fixed: Poll every 10 seconds as recommended for video
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

export const generateRandomPrompt = async (category: string = 'Any', referenceImage?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  let userPrompt = "";

  if (referenceImage) {
     // MULTIMODAL MODE: Analyze image and generate prompt in requested style
     const base64Data = referenceImage.split(',')[1];
     const mimeType = referenceImage.substring(referenceImage.indexOf(':') + 1, referenceImage.indexOf(';'));
     
     parts.push({
         inlineData: {
             mimeType: mimeType,
             data: base64Data
         }
     });

     if (category === 'Any') {
         userPrompt = "Analyze this image and generate a highly detailed, creative desktop wallpaper prompt based on it. You can reimagine the style, lighting, or environment to make it more cinematic and visually stunning, but keep the main subject recognizable.";
     } else {
         userPrompt = `Analyze this image and generate a creative desktop wallpaper prompt based on it, but reimagined specifically in the '${category}' style. Keep the main composition or subject but completely transform the aesthetic, colors, and lighting to match the '${category}' theme.`;
     }
     userPrompt += " The output must be a detailed image description prompt suitable for a text-to-image generator. Return ONLY the prompt text, no intro.";
     
     parts.push({ text: userPrompt });

  } else {
    // TEXT ONLY MODE
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
    parts.push({ text: userPrompt });
  }

  try {
    // Fixed: Use 'gemini-3-flash-preview' for basic text tasks like prompt generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts },
    });
    return response.text?.trim() || `A surreal ${category} wallpaper description`;
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
