
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, ModelType, WallpaperType, AspectRatio, RandomCategory } from "../types";

export const generateWallpaperImage = async (config: GenerationConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const requestConfig: any = {
    imageConfig: {
      aspectRatio: config.aspectRatio,
    },
  };

  if (config.model === ModelType.Pro) {
    requestConfig.imageConfig.imageSize = config.imageSize;
  }

  const parts: any[] = [];

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

  parts.push({ text: config.prompt || "Generate a high quality wallpaper based on this image." });

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: {
        parts: parts,
      },
      config: requestConfig,
    });

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
    const validAspectRatio = config.aspectRatio === AspectRatio.Portrait ? '9:16' : '16:9';

    if (config.image) {
      const base64Data = config.image.split(',')[1];
      const mimeType = config.image.substring(config.image.indexOf(':') + 1, config.image.indexOf(';'));

      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt || undefined,
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

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation completed but no download link was provided.");
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    
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

export const generateRandomPrompt = async (categories: RandomCategory[] = ['Any'], referenceImage?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  let userPrompt = "";

  const isAny = categories.includes('Any');
  const categoryNames = isAny ? 'random creative themes' : categories.join(' and ');

  if (referenceImage) {
     const base64Data = referenceImage.split(',')[1];
     const mimeType = referenceImage.substring(referenceImage.indexOf(':') + 1, referenceImage.indexOf(';'));
     
     parts.push({
         inlineData: {
             mimeType: mimeType,
             data: base64Data
         }
     });

     if (isAny) {
         userPrompt = "Analyze this image and generate a highly detailed, creative desktop wallpaper prompt based on it. Reimagine the style, lighting, or environment while keeping the main subject recognizable.";
     } else {
         userPrompt = `Analyze this image and generate a creative desktop wallpaper prompt that performs a stylistic fusion of the following themes: ${categoryNames}. Blend the visual language of these categories seamlessly into a single cinematic composition while using the source image as the primary layout and subject reference.`;
     }
     userPrompt += " Return ONLY the prompt text, no intro.";
     parts.push({ text: userPrompt });

  } else {
    if (categories.includes('Anime') && categories.length === 1) {
      userPrompt = "Generate a detailed, high-quality Anime style desktop wallpaper description. Make it cinematic and visually stunning (Makoto Shinkai style).";
    } else {
      if (isAny) {
        userPrompt = "Generate a completely random, highly detailed, and creative image description for a desktop wallpaper. Pick a cool combination of themes (e.g. Space + Nature).";
      } else {
        userPrompt = `Generate a highly detailed image description for a desktop wallpaper that is a seamless hybrid of these styles: ${categoryNames}. Your goal is a 'Creative Mashup' where elements of each theme are intertwined into a unique and cohesive visual.`;
      }

      userPrompt += " IMPORTANT: The style MUST be Photorealistic or Cinematic 3D Render. AVOID: simple cartoons, vector art, or flat illustrations.";
    }

    userPrompt += " Return ONLY the detailed prompt text, no introductory phrases.";
    parts.push({ text: userPrompt });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts },
    });
    return response.text?.trim() || `A fusion of ${categoryNames} wallpaper`;
  } catch (error) {
    console.error("Failed to generate random prompt:", error);
    return "A sleek matte black sports car driving through a rainy cybercity at night, photorealistic, cinematic lighting"; 
  }
};

export const checkApiKeySelection = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return true;
};

export const promptApiKeySelection = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};
