/**
 * LLMFunctionCaller - Handles function calling with language models
 */
export class LLMFunctionCaller {
  constructor(hueBridge) {
    this.hueBridge = hueBridge;
    this.baseUrl = "http://localhost:1234/v1";

    // Map function names to their implementations
    this.functionMap = {
      turn_on_light: (args) => this.hueBridge.turnOnLight(args.light_id),
      turn_off_light: (args) => this.hueBridge.turnOffLight(args.light_id),
      set_color: (args) => this.hueBridge.setColor(args.light_id, args.color),
      set_all_colors: (args) => this.hueBridge.setAllColors(args.color),
      turn_on_all_lights: () => this.hueBridge.turnOnAllLights(),
      turn_off_all_lights: () => this.hueBridge.turnOffAllLights(),
    };

    // Function name mappings for flexibility
    this.functionNameMap = {
      turn_on_light: "turn_on_light",
      hue_turn_on: "turn_on_light",
      turn_on: "turn_on_light",
      turn_off_light: "turn_off_light",
      hue_turn_off: "turn_off_light",
      turn_off: "turn_off_light",
      turn_on_all_lights: "turn_on_all_lights",
      turn_on_all: "turn_on_all_lights",
      all_on: "turn_on_all_lights",
      turn_off_all_lights: "turn_off_all_lights",
      turn_off_all: "turn_off_all_lights",
      all_off: "turn_off_all_lights",
      set_color: "set_color",
      change_color: "set_color",
      set_light_color: "set_color",
      set_all_colors: "set_all_colors",
      change_all_colors: "set_all_colors",
      set_all_lights_color: "set_all_colors",
    };
  }

  /**
   * Create the system prompt for the LLM
   * @returns {string} System prompt
   */
  createSystemPrompt() {
    return `You are a helpful assistant that controls Philips Hue lights.

IMPORTANT: You must ALWAYS respond with ONLY a valid JSON object in this EXACT format:
{
  "name": "function_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}

DO NOT include any explanatory text, markdown formatting, or code blocks around the JSON.
DO NOT use backticks (\`\`\`) or any other formatting.
ONLY return the raw JSON object.

Here are the available functions:

1. turn_on_light
   - Description: Turns on a specific light
   - Required parameters: light_id (integer)
   - Example: {"name": "turn_on_light", "arguments": {"light_id": 1}}

2. turn_off_light
   - Description: Turns off a specific light
   - Required parameters: light_id (integer)
   - Example: {"name": "turn_off_light", "arguments": {"light_id": 2}}

3. turn_on_all_lights
   - Description: Turns on all lights
   - No parameters required
   - Example: {"name": "turn_on_all_lights", "arguments": {}}

4. turn_off_all_lights
   - Description: Turns off all lights
   - No parameters required
   - Example: {"name": "turn_off_all_lights", "arguments": {}}

5. set_color
   - Description: Sets the color of a specific light
   - Required parameters: light_id (integer), color (string)
   - Available colors: red, green, blue, yellow, purple, orange, pink, white, cyan
   - Example: {"name": "set_color", "arguments": {"light_id": 1, "color": "blue"}}

6. set_all_colors
   - Description: Sets the color of all lights
   - Required parameters: color (string)
   - Available colors: red, green, blue, yellow, purple, orange, pink, white, cyan
   - Example: {"name": "set_all_colors", "arguments": {"color": "red"}}

REMEMBER: Your ENTIRE response must be ONLY the JSON object with no additional text.
`;
  }

  /**
   * Extract JSON from text response
   * @param {string} text - Text that might contain JSON
   * @returns {object|null} Parsed JSON or null
   */
  extractJsonFromText(text) {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from the text
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = text.substring(jsonStart, jsonEnd);
        try {
          return JSON.parse(jsonStr);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Map arguments from model to expected format
   * @param {object} args - Arguments from model
   * @returns {object} Mapped arguments
   */
  mapArguments(args) {
    const mapped = {};

    // Handle light_id parameter
    if ("light_id" in args) {
      mapped.light_id = parseInt(args.light_id);
    } else if ("id" in args) {
      mapped.light_id = parseInt(args.id);
    } else if ("lightId" in args) {
      mapped.light_id = parseInt(args.lightId);
    } else if ("light" in args) {
      // Try to map light name to ID
      const lightName = args.light.toLowerCase();
      const light = this.hueBridge.lights.find(
        (l) => l.name.toLowerCase() === lightName
      );
      if (light) {
        mapped.light_id = light.light_id;
      }
    }

    // Default to light 1 if not specified
    if (!("light_id" in mapped)) {
      mapped.light_id = 1;
    }

    // Handle color parameter
    if ("color" in args) {
      mapped.color = args.color;
    }

    return mapped;
  }

  /**
   * Process user input and execute function calls
   * @param {string} userInput - User input text
   * @returns {Promise<{rawOutput: string, result: string}>} Raw output and result
   */
  async processUserInput(userInput) {
    try {
      const systemPrompt = this.createSystemPrompt();

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "local-model",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      console.log("Raw Model Output:", content);

      // Parse JSON from response
      const functionData = this.extractJsonFromText(content);
      if (!functionData) {
        return {
          rawOutput: content,
          result: "Failed to parse JSON from model response.",
        };
      }

      // Extract function name and arguments
      if ("name" in functionData && "arguments" in functionData) {
        const functionName = functionData.name;
        const args = functionData.arguments;

        // Map function name
        const mappedFunctionName = this.functionNameMap[functionName];
        if (!mappedFunctionName) {
          return {
            rawOutput: content,
            result: `No valid function mapping found for: ${functionName}`,
          };
        }

        // Map arguments
        const mappedArgs = this.mapArguments(args);

        // Call the function
        if (mappedFunctionName in this.functionMap) {
          console.log(
            `Calling function: ${mappedFunctionName} with args:`,
            mappedArgs
          );
          const result = await this.functionMap[mappedFunctionName](mappedArgs);
          return { rawOutput: content, result };
        } else {
          return {
            rawOutput: content,
            result: `Function ${mappedFunctionName} not found`,
          };
        }
      } else {
        return {
          rawOutput: content,
          result: "Invalid JSON structure. Missing 'name' or 'arguments'.",
        };
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return {
        rawOutput: "",
        result: `Error processing request: ${error.message}`,
      };
    }
  }
}
