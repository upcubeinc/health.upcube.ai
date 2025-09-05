const chatRepository = require('../models/chatRepository');
const userRepository = require('../models/userRepository');
const measurementRepository = require('../models/measurementRepository');
const { log } = require('../config/logging');
const { getDefaultModel } = require('../ai/config');

async function handleAiServiceSettings(action, serviceData, authenticatedUserId) {
  try {
    if (action === 'save_ai_service_settings') {
      serviceData.user_id = authenticatedUserId; // Ensure user_id is set from authenticated user
      if (!serviceData.id && !serviceData.api_key) {
        throw new Error('API key is required for adding a new AI service.');
      }
      const result = await chatRepository.upsertAiServiceSetting(serviceData);
      return { message: 'AI service settings saved successfully.', setting: result };
    }
    // Add other actions if needed in the future
    throw new Error('Unsupported action for AI service settings.');
  } catch (error) {
    log('error', `Error handling AI service settings for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getAiServiceSettings(authenticatedUserId, targetUserId) {
  try {
    const settings = await chatRepository.getAiServiceSettingsByUserId(targetUserId);
    return settings || []; // Return empty array if no settings found
  } catch (error) {
    log('error', `Error fetching AI service settings for user ${targetUserId} by ${authenticatedUserId}:`, error);
    return []; // Return empty array on error
  }
}

async function getActiveAiServiceSetting(authenticatedUserId, targetUserId) {
  try {
    const setting = await chatRepository.getActiveAiServiceSetting(targetUserId);
    return setting; // Returns null if no active setting found
  } catch (error) {
    log('error', `Error fetching active AI service setting for user ${targetUserId} by ${authenticatedUserId}:`, error);
    return null; // Return null on error
  }
}

async function deleteAiServiceSetting(authenticatedUserId, id) {
  try {
    // Verify that the setting belongs to the authenticated user before deleting
    const setting = await chatRepository.getAiServiceSettingById(id, authenticatedUserId);
    if (!setting) {
      throw new Error('AI service setting not found.');
    }
    const success = await chatRepository.deleteAiServiceSetting(id, authenticatedUserId);
    if (!success) {
      throw new Error('AI service setting not found.');
    }
    return { message: 'AI service setting deleted successfully.' };
  } catch (error) {
    log('error', `Error deleting AI service setting ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function clearOldChatHistory(authenticatedUserId) {
  try {
    await chatRepository.clearOldChatHistory(authenticatedUserId);
    return { message: 'Old chat history cleared successfully.' };
  } catch (error) {
    log('error', `Error clearing old chat history for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getSparkyChatHistory(authenticatedUserId, targetUserId) {
  try {
    const history = await chatRepository.getChatHistoryByUserId(targetUserId);
    return history;
  } catch (error) {
    log('error', `Error fetching chat history for user ${targetUserId} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getSparkyChatHistoryEntry(authenticatedUserId, id) {
  try {
    const entryOwnerId = await chatRepository.getChatHistoryEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Chat history entry not found.');
    }
    const entry = await chatRepository.getChatHistoryEntryById(id);
    return entry;
  } catch (error) {
    log('error', `Error fetching chat history entry ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function updateSparkyChatHistoryEntry(authenticatedUserId, id, updateData) {
  try {
    const entryOwnerId = await chatRepository.getChatHistoryEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Chat history entry not found.');
    }
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to update this chat history entry.');
    }
    const updatedEntry = await chatRepository.updateChatHistoryEntry(id, authenticatedUserId, updateData);
    if (!updatedEntry) {
      throw new Error('Chat history entry not found or not authorized to update.');
    }
    return updatedEntry;
  } catch (error) {
    log('error', `Error updating chat history entry ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function deleteSparkyChatHistoryEntry(authenticatedUserId, id) {
  try {
    const entryOwnerId = await chatRepository.getChatHistoryEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Chat history entry not found.');
    }
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to delete this chat history entry.');
    }
    const success = await chatRepository.deleteChatHistoryEntry(id, authenticatedUserId);
    if (!success) {
      throw new Error('Chat history entry not found.');
    }
    return { message: 'Chat history entry deleted successfully.' };
  } catch (error) {
    log('error', `Error deleting chat history entry ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function clearAllSparkyChatHistory(authenticatedUserId) {
  try {
    await chatRepository.clearAllChatHistory(authenticatedUserId);
    return { message: 'All chat history cleared successfully.' };
  } catch (error) {
    log('error', `Error clearing all chat history for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function saveSparkyChatHistory(authenticatedUserId, historyData) {
  try {
    // Ensure the history is saved for the authenticated user
    historyData.user_id = authenticatedUserId;
    await chatRepository.saveChatHistory(historyData);
    return { message: 'Chat history saved successfully.' };
  } catch (error) {
    log('error', `Error saving chat history for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function processChatMessage(messages, serviceConfig, authenticatedUserId) {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format.');
    }
    if (!serviceConfig) { // Check if serviceConfig is provided
      throw new Error('AI service configuration is missing.');
    }

    // Use the serviceConfig passed from the frontend directly
    const aiService = serviceConfig;
    
    // Ensure API key is present
    if (!aiService.api_key) {
      throw new Error('API key missing for selected AI service.');
    }

    let response;
    const model = aiService.model_name || getDefaultModel(aiService.service_type);

    // Comprehensive system prompt from old Supabase Edge Function
    // Fetch user's custom categories to provide context to the AI
    const customCategories = await measurementRepository.getCustomCategories(authenticatedUserId);
    const customCategoriesList = customCategories.length > 0
      ? customCategories.map(cat => `- ${cat.name} (${cat.measurement_type}, ${cat.frequency})`).join('\n')
      : 'None';

    const systemPromptContent = `You are Sparky, an AI nutrition and wellness coach. Your primary goal is to help users track their food, exercise, and measurements, and provide helpful advice and motivation based on their data and general health knowledge.

The current date is ${new Date().toISOString().split('T')[0]}.

**CRITICAL INSTRUCTION:** When the user mentions "water" in any context related to consumption or intake, you MUST use the 'log_water' intent. Do NOT classify water as a 'log_food' item.

You will receive user input, which can include text and/or images. Your task is to identify the user's intent and extract relevant data. You MUST respond with a JSON object containing the 'intent' and 'data', strictly adhering to the defined intents and their required data structures.

For image inputs:
- Analyze the image to identify food items, estimate quantities, and infer nutritional information.
- If the image clearly shows food, prioritize the 'log_food' intent.
- Extract food_name, quantity, unit, and meal_type from the image content.
- If possible, infer and include nutritional details (calories, protein, carbs, fat, etc.) based on the identified food and estimated quantity, populating the corresponding fields in the 'log_food' intent's data.
- If the image is not food-related or unclear, treat the text input as primary.

**IMPORTANT:** If the user specifies a date or time (e.g., "yesterday", "last Monday", "at 7 PM"), extract this information and include it as a 'entryDate' field in the top level of the JSON object. **Provide relative terms like "today", "yesterday", "tomorrow", or a specific date in 'MM-DD' or 'YYYY-MM-DD' format. Do NOT try to resolve relative terms to a full date yourself.** If no date is specified, omit the 'entryDate' field.

When the user mentions logging food, exercise, or measurements, prioritize extracting the exact name of the item (food name, exercise name, measurement name) as accurately as possible from the user's input. This is crucial for looking up existing items in the database.

Here are the user's existing custom measurement categories:
${customCategoriesList}

When the user mentions a custom measurement, compare it to the list above. If you find a match or a very similar variation (considering synonyms and capitalization), use the **exact name** from the list in the 'name' field of the measurement data. If no clear match is found in the list, use the name as provided by the user.

**For 'log_food' intent, pay close attention to the unit specified by the user and match it in the 'unit' field of the food data.**
- If the user says "gram" or "g", use "g".
- If the user says "cup" or "cups", use "cup".
- If the user refers to individual items by count (e.g., "two apples", "3 eggs"), use "piece".
- If the unit is not explicitly mentioned, infer the most appropriate unit based on the food item and context (e.g., "apple" is likely "piece", "rice" is likely "g" or "cup"). Refer to common food units used in the application (like 'g', 'cup', 'oz', 'ml', 'serving', 'piece').

Possible intents and their required data. You MUST select one of these intents and provide the data in the specified format:
- 'log_food': User wants to log food. This intent is for solid food items or beverages that are not water. **This intent MUST NOT be used for logging water intake.**
  - If you can confidently identify a single food item and its details, data should include:
    - food_name: string (e.g., "apple", "chicken breast", "Dosa") - Extract the most likely exact name.
    - quantity: number (e.g., 1, 100) - Infer if possible, default to 1 if a specific quantity isn't clear but a food is mentioned.
    - unit: string (e.g., "piece", "g", "oz", "ml", "cup", "serving") - **CRITICAL: Match the user's specified unit exactly.** If the user refers to individual items by count (e.g., "two apples", "3 eggs"), use "piece". If no unit is explicitly mentioned, infer the most appropriate unit based on the food item and context (e.g., "apple" is likely "piece", "rice" is likely "g" or "cup"). Refer to common food units used in the application (like 'g', 'cup', 'oz', 'ml', 'serving', 'piece').
    - meal_type: string ("breakfast", "lunch", "dinner", "snacks") - Infer based on time of day or context, default to "snacks".
    - **Include as many of the following nutritional fields as you can extract from the user's input or your knowledge about the food:**
      - calories: number
      - protein: number
      - carbs: number
      - fat: number
      - saturated_fat: number
      - polyunsaturated_fat: number
      - monounsaturated_fat: number
      - trans_fat: number
      - cholesterol: number
      - sodium: number
      - potassium: number
      - dietary_fiber: number
      - sugars: number
      - vitamin_a: number
      - vitamin_c: number
      - calcium: number
      - iron: number
      - FoodOption: array of realistic food options (if applicable)
      - serving_size: number
      - serving_unit: string


- 'log_exercise': User wants to log exercise. Data should include:
 - exercise_name: string (e.g., "running", "yoga") - Extract the most likely exact name.
 - duration_minutes: number | null (e.g., 30, 60) - Infer if possible.
 - distance: number | null (e.g., 5, 3.1) - Infer if mentioned.
 - distance_unit: string | null ("miles", "km") - Infer if mentioned.
- 'log_measurement': User wants to log a body measurement or steps. Data should include an array of measurements:
 - measurements: Array of objects, each with:
   - type: string ("weight", "neck", "waist", "hips", "steps", "custom") - Use "custom" for any measurement not in the standard list.
   - value: number
   - unit: string | null (e.g., "kg", "lbs", "cm", "inches", "steps") - Infer if possible, default to null for steps.
   - name: string | null (required if type is "custom") - **Crucially, if the user mentions a custom category from the list provided, use its exact name here.**
- 'log_water': User wants to log water intake. This intent should be prioritized when the user mentions "water" in conjunction with a quantity or a desire to log water. The AI should understand from the user's context that they are referring to drinking water. Data should include:
 - glasses_consumed: number (e.g., 1, 2) - Infer if possible, default to 1.
- 'ask_question': User is asking a general question or seeking advice. Data is an empty object {}.
- 'chat': User is engaging in casual conversation. Data is an empty object {}.

If the intent is 'ask_question' or 'chat', also provide a 'response' field with a friendly and helpful text response. For logging intents, the 'response' field is optional and can be a simple confirmation or encouraging remark.

If you cannot determine the intent or extract data with high confidence, default to 'ask_question' or 'chat' and provide a suitable response asking for clarification.

Output format MUST be a JSON object with 'intent' (string) and 'data' (object) fields, and optionally 'entryDate' (string with relative term or date format). Do NOT include any other text outside the JSON object.

Example JSON output for logging weight for yesterday:
{"intent": "log_measurement", "data": {"measurements": [{"type": "weight", "value": 70, "unit": "kg"}]}, "entryDate": "yesterday"}

Example JSON output for asking a question:
{"intent": "ask_question", "data": {}, "response": "I can help with that! What's your question?"}

Example JSON output for logging steps:
{"intent": "log_measurement", "data": {"measurements": [{"type": "steps", "value": 10000, "unit": "steps"}]}}

Example JSON output for logging food for today with detailed nutrition:
{"intent": "log_food", "data": {"food_name": "apple", "quantity": 1, "unit": "piece", "meal_type": "snack", "calories": 95, "carbs": 25, "sugars": 19, "dietary_fiber": 4, "vitamin_c": 9}, "entryDate": "today"}

Example JSON output for logging exercise:
{"intent": "log_exercise", "data": {"exercise_name": "running", "duration_minutes": 30, "distance": 3, "distance_unit": "miles"}, "entryDate": "06-18"}

Example JSON output for logging a custom measurement (e.g., Blood Sugar), using the exact name from the provided list:
{"intent": "log_measurement", "data": {"measurements": [{"type": "custom", "name": "Blood Sugar", "value": 140, "unit": "mg/dL"}]}, "entryDate": "today"}

Example JSON output for logging water:
{"intent": "log_water", "data": {"glasses_consumed": 2}, "entryDate": "today"}

Example JSON output for logging current weight:
{"intent": "log_measurement", "data": {"measurements": [{"type": "weight", "value": 72, "unit": "kg"}]}}


Be precise with data extraction and follow the JSON structure exactly.

**Special Instruction: Food Option Generation**
If you receive a request in the format "GENERATE_FOOD_OPTIONS:[food name] in [unit]", respond with a JSON array of 2-3 realistic \`FoodOption\` objects for the specified food name.
**Prioritize providing a \`serving_unit\` that matches the requested unit if it's a common and logical unit for that food.** If the requested unit is not common or logical for the food, provide a common and realistic serving unit (e.g., "g", "piece", "serving"). Each \`FoodOption\` should include:
- name: string (e.g., "\`Apple (medium)\`", "\`Cooked Rice (per cup)\`")
- calories: number (estimated)
- protein: number (estimated)
- carbs: number (estimated)
- fat: number (estimated)
- serving_size: number (e.g., 1, 100, 0.5) - This MUST be a numeric value representing the quantity.
- serving_unit: string (e.g., "\`piece\`", "\`g\`", "\`cup\`", "\`oz\`") - This MUST be the unit string only, without any numeric quantity.

Example JSON output for "GENERATE_FOOD_OPTIONS:apple":
[
  {"\`name\`": "\`Apple (medium)\`", "\`calories\`": 95, "\`protein\`": 0.5, "\`carbs\`": 25, "\`fat\`": 0.3, "\`serving_size\`": 1, "\`serving_unit\`": "\`piece\`"},
  {"\`name\`": "\`Apple (100g)\`", "\`calories\`": 52, "\`protein\`": 0.3, "\`carbs\`": 14, "\`fat\`": 0.2, "\`serving_size\`": 100, "\`serving_unit\`": "\`g\`"}
]
`;

    const messagesForAI = [{ role: 'system', content: systemPromptContent }];
    // Add user messages
    messagesForAI.push(...messages.filter(msg => msg.role === 'user')); // Assuming 'messages' from frontend only contains user messages

    // For Google AI
    const cleanSystemPrompt = systemPromptContent
      .replace(/[^\w\s\-.,!?:;()\[\]{}'"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);

    switch (aiService.service_type) {
      case 'openai':
      case 'openai_compatible':
      case 'mistral':
      case 'groq':
      case 'custom':
        response = await fetch(aiService.service_type === 'openai' ? 'https://api.openai.com/v1/chat/completions' :
                              aiService.service_type === 'openai_compatible' ? `${aiService.custom_url}/chat/completions` :
                              aiService.service_type === 'mistral' ? 'https://api.mistral.ai/v1/chat/completions' :
                              aiService.service_type === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                              aiService.custom_url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiService.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messagesForAI,
            temperature: 0.7,
          }),
        });
        break;

      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': aiService.api_key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1000,
            messages: userMessages,
            system: systemPrompt,
          }),
        });
        break;

      case 'google':
        const googleBody = {
          contents: messages.map(msg => {
            const role = msg.role === 'assistant' ? 'model' : 'user';
            let parts = [];
            if (typeof msg.content === 'string') {
              parts.push({ text: msg.content });
            } else if (Array.isArray(msg.content)) {
              parts = msg.content.map(part => {
                if (part.type === 'text') {
                  return { text: part.text };
                } else if (part.type === 'image_url' && part.image_url?.url) {
                  try {
                    const urlParts = part.image_url.url.split(';base64,');
                    if (urlParts.length !== 2) {
                      log('error', 'Invalid data URL format for image part. Expected "data:[mimeType];base64,[data]".');
                      return null;
                    }
                    const mimeTypeMatch = urlParts[0].match(/^data:(.*?)(;|$)/);
                    let mimeType = '';
                    if (mimeTypeMatch && mimeTypeMatch[1]) {
                      mimeType = mimeTypeMatch[1];
                    } else {
                      log('error', 'Could not extract mime type from data URL prefix:', urlParts[0]);
                      return null;
                    }
                    const base64Data = urlParts[1];
                    return {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                      }
                    };
                  } catch (e) {
                    log('error', 'Error processing image data URL:', e);
                    return null;
                  }
                }
                return null;
              }).filter(part => part !== null);
            }
            if (parts.length === 0 && Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')) {
              parts.push({ text: '' });
            }
            return {
              parts: parts,
              role: role,
            };
          }).filter(content => content.parts.length > 0),
        };

        if (googleBody.contents.length === 0) {
          throw new Error('No valid content (text or image) found to send to Google AI.');
        }

        if (cleanSystemPrompt && cleanSystemPrompt.length > 0) {
          googleBody.systemInstruction = {
            parts: [{ text: cleanSystemPrompt }]
          };
        }

        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiService.api_key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleBody),
        });
        break;

      case 'ollama':
        response = await fetch(`${aiService.custom_url}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            stream: false,
          }),
        });
        break;

      default:
        const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url'));
        if (hasImage) {
          throw new Error(`Image analysis is not supported for the selected AI service type: ${aiService.service_type}. Please select a multimodal model like Google Gemini in settings.`);
        }
        throw new Error(`Unsupported service type: ${aiService.service_type}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      log('error', `AI service API call error for ${aiService.service_type}:`, errorText);
      throw new Error(`AI service API call error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = '';

    switch (aiService.service_type) {
      case 'openai':
      case 'openai_compatible':
      case 'mistral':
      case 'groq':
      case 'custom':
        content = data.choices?.[0]?.message?.content || 'No response from AI service';
        break;
      case 'anthropic':
        content = data.content?.[0]?.text || 'No response from AI service';
        break;
      case 'google':
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI service';
        break;
      case 'ollama':
        content = data.message?.content || 'No response from AI service';
        break;
    }
    return { content };
  } catch (error) {
    log('error', `Error processing chat message for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

module.exports = {
  handleAiServiceSettings,
  getAiServiceSettings,
  getActiveAiServiceSetting,
  deleteAiServiceSetting,
  clearOldChatHistory,
  getSparkyChatHistory,
  getSparkyChatHistoryEntry,
  updateSparkyChatHistoryEntry,
  deleteSparkyChatHistoryEntry,
  clearAllSparkyChatHistory,
  saveSparkyChatHistory,
  processChatMessage,
  processFoodOptionsRequest, // Add the new function to exports
};

async function processFoodOptionsRequest(foodName, unit, authenticatedUserId, serviceConfig) { // Add serviceConfig
  try {
    if (!serviceConfig) { // Check if serviceConfig is provided
      throw new Error('AI service configuration is missing.');
    }

    // Use the serviceConfig passed from the frontend directly
    const aiService = serviceConfig;
    
    // Ensure API key is present
    if (!aiService.api_key) {
      throw new Error('API key missing for selected AI service.');
    }

    const systemPrompt = `You are Sparky, an AI nutrition and wellness coach. Your task is to generate minimum 3 realistic food options in JSON format when requested. Respond ONLY with a JSON array of FoodOption objects, including detailed nutritional information (calories, protein, carbs, fat, saturated_fat, polyunsaturated_fat, monounsaturated_fat, trans_fat, cholesterol, sodium, potassium, dietary_fiber, sugars, vitamin_a, vitamin_c, calcium, iron) if available. Do NOT include any other text.
**CRITICAL: When a unit is specified in the request (e.g., 'GENERATE_FOOD_OPTIONS:apple in piece'), ensure the \`serving_unit\` in the generated \`FoodOption\` objects matches the requested unit exactly, if it's a common and logical unit for that food. If not, provide a common and realistic serving unit.**`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `GENERATE_FOOD_OPTIONS:${foodName} in ${unit}` },
    ];

    const model = aiService.model_name || getDefaultModel(aiService.service_type);

    let response;
    switch (aiService.service_type) {
      case 'openai':
      case 'openai_compatible':
      case 'mistral':
      case 'groq':
      case 'custom':
        response = await fetch(aiService.service_type === 'openai' ? 'https://api.openai.com/v1/chat/completions' :
                               aiService.service_type === 'openai_compatible' ? `${aiService.custom_url}/chat/completions` :
                               aiService.service_type === 'mistral' ? 'https://api.mistral.ai/v1/chat/completions' :
                               aiService.service_type === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                               aiService.custom_url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiService.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
          }),
        });
        break;

      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': aiService.api_key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1000,
            messages: messages.filter(msg => msg.role !== 'system'), // Anthropic system prompt is separate
            system: systemPrompt,
          }),
        });
        break;

      case 'google':
        const googleBody = {
          contents: messages.map(msg => {
            const role = msg.role === 'assistant' ? 'model' : 'user';
            return {
              parts: [{ text: msg.content }],
              role: role,
            };
          }).filter(content => content.parts[0].text.trim() !== ''),
        };

        if (googleBody.contents.length === 0) {
          throw new Error('No valid content found to send to Google AI.');
        }

        const cleanSystemPrompt = systemPrompt
          .replace(/[^\w\s\-.,!?:;()\[\]{}'"]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 1000);

        if (cleanSystemPrompt && cleanSystemPrompt.length > 0) {
          googleBody.systemInstruction = {
            parts: [{ text: cleanSystemPrompt }]
          };
        }

        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiService.api_key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleBody),
        });
        break;

      case 'ollama':
        response = await fetch(`${aiService.custom_url}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            stream: false,
          }),
        });
        break;

      default:
        throw new Error(`Unsupported service type for food options generation: ${aiService.service_type}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      log('error', `AI service API call error for food options (${aiService.service_type}):`, errorText);
      throw new Error(`AI service API call error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = '';

    switch (aiService.service_type) {
      case 'openai':
      case 'openai_compatible':
      case 'mistral':
      case 'groq':
      case 'custom':
        content = data.choices?.[0]?.message?.content || 'No response from AI service';
        break;
      case 'anthropic':
        content = data.content?.[0]?.text || 'No response from AI service';
        break;
      case 'google':
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI service';
        break;
      case 'ollama':
        content = data.message?.content || 'No response from AI service';
        break;
    }
    return { content };
  } catch (error) {
    log('error', `Error processing food options request for user ${authenticatedUserId}:`, error);
    throw error;
  }
}