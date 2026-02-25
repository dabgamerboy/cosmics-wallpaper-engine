

import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, ModelType, WallpaperType, AspectRatio, RandomCategory, ImageSize } from "../types";
import { logger } from "./logService";

const SOURCE = "GeminiService";

/**
 * Validates the presence of an API key before making a request.
 */
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Neural Link Broken: No API Key found in environment. Please ensure the engine is properly configured.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a wallpaper image using the Gemini API.
 */
export const generateWallpaperImage = async (config: GenerationConfig): Promise<string> => {
  logger.info(SOURCE, `Starting image generation with model: ${config.model}`, { config });
  
  const ai = getClient();
  
  // imageSize is ONLY available for gemini-3-pro-image-preview.
  // Passing it to gemini-2.5-flash-image will cause the API to reject the request.
  const imageConfig: any = {
    aspectRatio: config.aspectRatio,
  };

  if (config.model === ModelType.Pro) {
    imageConfig.imageSize = config.imageSize;
  }

  const requestConfig: any = {
    imageConfig,
  };

  const parts: any[] = [];

  // Add the base image for editing if provided
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

  // Add the mask image for inpainting if provided
  if (config.maskImage) {
    const maskParts = config.maskImage.split(',');
    const maskBase64 = maskParts[1];
    const maskMime = maskParts[0].substring(maskParts[0].indexOf(':') + 1, maskParts[0].indexOf(';'));
    parts.push({
      inlineData: {
        mimeType: maskMime,
        data: maskBase64
      }
    });
  }

  // Ensure prompt text is always present as a part
  parts.push({ text: config.prompt || "Generate a highly detailed desktop wallpaper." });

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
            logger.info(SOURCE, "Image generation successful");
            const mimeType = part.inlineData.mimeType || "image/png";
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("The engine returned an empty response. Try a more descriptive prompt.");
  } catch (error: any) {
    logger.error(SOURCE, "Gemini Generation Error", { message: error.message });
    
    if (error.message?.includes("Requested entity was not found")) {
       if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
       }
       throw new Error("Model access revoked or unavailable. Standard models (Flash) are recommended for free use.");
    }
    
    throw error;
  }
};

/**
 * Generates a wallpaper video using the Veo model.
 */
export const generateWallpaperVideo = async (config: GenerationConfig): Promise<string> => {
  const ai = getClient();

  try {
    let operation;
    const validAspectRatio = config.aspectRatio === AspectRatio.Portrait ? '9:16' : '16:9';

    if (config.image) {
      const imageParts = config.image.split(',');
      const base64Data = imageParts[1];
      const mimeType = imageParts[0].substring(imageParts[0].indexOf(':') + 1, imageParts[0].indexOf(';'));

      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt || "Cinematic movement",
        image: { imageBytes: base64Data, mimeType },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: validAspectRatio as any,
        }
      });
    } else {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt || "A cinematic journey through time and space",
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: validAspectRatio as any,
        }
      });
    }

    // Wait for the long-running operation
    while (!operation.done) {
      // Re-initialize for safety if needed, though getClient is called above
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Always pass operation with explicit key to match guidelines
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No download link provided.");
    
    const fetchResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await fetchResponse.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to process video buffer."));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    logger.error(SOURCE, "Gemini Video Error", { message: error.message });
    if (error.message?.includes("Requested entity was not found")) {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
      throw new Error("Video engine requires a selected API key with billing enabled.");
    }
    throw error;
  }
};

/**
 * Generates a creative random wallpaper prompt using Gemini Flash.
 */
export const generateRandomPrompt = async (categories: RandomCategory[] = ['Any'], referenceImage?: string): Promise<string> => {
  const ai = getClient();
  const parts: any[] = [];
  const isAny = categories.includes('Any');
  const categoryNames = isAny ? 'diverse creative themes' : categories.join(' and ');

  if (referenceImage) {
     const refImageParts = referenceImage.split(',');
     const base64Data = refImageParts[1];
     const mimeType = refImageParts[0].substring(refImageParts[0].indexOf(':') + 1, refImageParts[0].indexOf(';'));
     parts.push({ inlineData: { mimeType, data: base64Data } });
     parts.push({ text: `Analyze this image and generate a single short creative wallpaper prompt (under 20 words) inspired by: ${categoryNames}. Return ONLY the prompt text.` });
  } else {
     parts.push({ text: `Generate a single short creative wallpaper prompt (under 20 words) for: ${categoryNames}. Return ONLY the prompt text.` });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text?.trim() || "A beautiful cosmic horizon, ethereal lighting, 4k";
  } catch (error: any) {
    return "A sleek neon cityscape at night, cinematic lighting, 4k"; 
  }
};

/**
 * Checks if an API key has been selected using AI Studio window methods.
 */
export const checkApiKeySelection = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

/**
 * Opens the API key selection dialog provided by AI Studio.
 */
export const promptApiKeySelection = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};
