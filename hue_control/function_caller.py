#!/usr/bin/env python3
"""
Function Caller module for Philips Hue Control
Handles function calling with language models.
"""

import json
import openai
from .bridge import HueBridge
from .utils.prompts import create_system_prompt
from .utils.json_utils import extract_json_from_text, map_arguments
from .utils.function_maps import FUNCTION_NAME_MAP


class LLMFunctionCaller:
    """Class to handle function calling with language models."""
    
    def __init__(self, hue_bridge):
        """Initialize the function caller with a Hue bridge.
        
        Args:
            hue_bridge (HueBridge): Instance of HueBridge to control lights
        """
        self.hue_bridge = hue_bridge
        
        # Set up OpenAI client
        self.client = openai.OpenAI(
            base_url="http://localhost:1234/v1",
            api_key="not-needed"
        )
        
        # Map function names to their implementations
        self.function_map = {
            "turn_on_light": self.hue_bridge.turn_on_light,
            "turn_off_light": self.hue_bridge.turn_off_light,
            "set_color": self.hue_bridge.set_color,
            "set_all_colors": self.hue_bridge.set_all_colors,
            "turn_on_all_lights": self.hue_bridge.turn_on_light,
            "turn_off_all_lights": self.hue_bridge.turn_off_light
        }
    
    def process_user_input(self, user_input):
        """Process user input and execute function calls.
        
        Args:
            user_input (str): User input text
            
        Returns:
            str: Result message
        """
        try:
            # Create a system prompt
            system_prompt = create_system_prompt()
            
            # Make a request to the model
            response = self.client.chat.completions.create(
                model="local-model",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.7,
            )
            
            # Get the model's response
            response_message = response.choices[0].message
            print("\nRaw Model Output:", response_message.content)
            
            try:
                # Check if the response contains JSON
                content = response_message.content.strip()
                
                # Parse the JSON
                function_data = extract_json_from_text(content)
                if not function_data:
                    return "Failed to parse JSON from model response."
                
                # Extract function name and arguments
                if "name" in function_data and "arguments" in function_data:
                    function_name = function_data["name"]
                    arguments = function_data["arguments"]
                    
                    # Map the function name
                    mapped_function_name = FUNCTION_NAME_MAP.get(function_name)
                    if not mapped_function_name:
                        print(f"No valid function mapping found for: {function_name}")
                        return content
                    
                    # Map arguments
                    mapped_arguments = map_arguments(arguments, self.hue_bridge.lights)
                    
                    # Call the function
                    if mapped_function_name in self.function_map:
                        print(f"Calling function from parsed JSON: {mapped_function_name} with arguments: {mapped_arguments}")
                        try:
                            result = self.function_map[mapped_function_name](**mapped_arguments)
                            return result
                        except Exception as e:
                            error_message = f"Error processing function call from parsed JSON: {e}"
                            print(error_message)
                            return error_message
                    else:
                        return f"Function {mapped_function_name} not found"
                else:
                    return "Invalid JSON structure. Missing 'name' or 'arguments'."
            except Exception as e:
                print(f"Error processing JSON: {e}")
                return f"Error processing response: {e}"
            
        except Exception as e:
            return f"Error processing request: {e}"
