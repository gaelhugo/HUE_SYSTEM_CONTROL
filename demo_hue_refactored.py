#!/usr/bin/env python3
"""
Refactored Philips Hue Light Control Demo
This script demonstrates controlling Philips Hue lights using function calling with LLMs.
It implements basic on/off functionality and color control.
"""

import json
import os
from phue import Bridge
import openai


class HueBridge:
    """Class to manage connection and interaction with the Philips Hue bridge."""
    
    # Define color map for named colors
    COLOR_MAP = {
        "red": [0.675, 0.322],
        "green": [0.408, 0.517],
        "blue": [0.167, 0.04],
        "yellow": [0.508, 0.474],
        "purple": [0.252, 0.09],
        "orange": [0.611, 0.362],
        "pink": [0.452, 0.233],
        "white": [0.3127, 0.329],
        "cyan": [0.17, 0.62]
    }
    
    def __init__(self, bridge_ip="172.22.22.50"):
        """Initialize the connection to the Philips Hue bridge.
        
        Args:
            bridge_ip (str): IP address of the Philips Hue bridge
        """
        self.bridge_ip = bridge_ip
        self.bridge = None
        self.lights = []
    
    def connect(self):
        """Connect to the Philips Hue bridge.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            print("Connecting to Philips Hue bridge...")
            self.bridge = Bridge(self.bridge_ip)
            
            # If the app is not registered, press the button on the bridge before running this
            self.bridge.connect()
            print("Successfully connected to Philips Hue bridge!")
            
            # Get all lights
            self.lights = self.bridge.lights
            print(f"Found {len(self.lights)} lights on the bridge")
            
            # Display information about each light
            for light in self.lights:
                print(f"Light {light.light_id}: {light.name}")
                print(f"  Type: {light.type}")
                print(f"  State: {'ON' if light.on else 'OFF'}")
            
            return True
        except Exception as e:
            print(f"Error connecting to Philips Hue bridge: {e}")
            print("Make sure the bridge is powered on and connected to your network.")
            print("You may need to press the link button on the bridge if this is the first time connecting.")
            return False
    
    def turn_on_light(self, light_id):
        """Turn on a specific Philips Hue light.
        
        Args:
            light_id (int): ID of the light to turn on
            
        Returns:
            str: Result message
        """
        try:
            self.bridge.set_light(light_id, 'on', True)
            light_name = self.bridge.get_light(light_id, 'name')
            return f"Turned on the '{light_name}' light."
        except Exception as e:
            return f"Error turning on light {light_id}: {e}"
    
    def turn_off_light(self, light_id):
        """Turn off a specific Philips Hue light.
        
        Args:
            light_id (int): ID of the light to turn off
            
        Returns:
            str: Result message
        """
        try:
            self.bridge.set_light(light_id, 'on', False)
            light_name = self.bridge.get_light(light_id, 'name')
            return f"Turned off the '{light_name}' light."
        except Exception as e:
            return f"Error turning off light {light_id}: {e}"
    
    def set_color(self, light_id, color):
        """Set the color of a specific Philips Hue light.
        
        Args:
            light_id (int): ID of the light to change color
            color (str): Color name to set
            
        Returns:
            str: Result message
        """
        try:
            # Check if the color is in our predefined map
            if color.lower() in self.COLOR_MAP:
                xy_color = self.COLOR_MAP[color.lower()]
                self.bridge.set_light(light_id, 'xy', xy_color)
                light_name = self.bridge.get_light(light_id, 'name')
                return f"Set '{light_name}' light to {color}."
            else:
                return f"Color '{color}' not recognized. Available colors: {', '.join(self.COLOR_MAP.keys())}"
        except Exception as e:
            return f"Error setting color for light {light_id}: {e}"
    
    def set_all_colors(self, light_id, color):
        """Set the color of all Philips Hue lights.
        
        Args:
            light_id (int): Not used, but kept for compatibility
            color (str): Color name to set for all lights
            
        Returns:
            str: Result message
        """
        try:
            # Check if the color is in our predefined map
            if color.lower() in self.COLOR_MAP:
                xy_color = self.COLOR_MAP[color.lower()]
                for light in self.bridge.lights:
                    try:
                        self.bridge.set_light(light.light_id, 'xy', xy_color)
                    except Exception:
                        # Skip lights that don't support color
                        pass
                return f"Set all lights to {color}."
            else:
                return f"Color '{color}' not recognized. Available colors: {', '.join(self.COLOR_MAP.keys())}"
        except Exception as e:
            return f"Error setting color for all lights: {e}"


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
        
        # Define function name mappings for flexibility
        self.function_name_map = {
            "turn_on_light": "turn_on_light",
            "hue_turn_on": "turn_on_light",
            "turn_on": "turn_on_light",
            "turn_off_light": "turn_off_light",
            "hue_turn_off": "turn_off_light",
            "turn_off": "turn_off_light",
            "turn_on_all_lights": "turn_on_all_lights",
            "turn_on_all": "turn_on_all_lights",
            "all_on": "turn_on_all_lights",
            "turn_off_all_lights": "turn_off_all_lights",
            "turn_off_all": "turn_off_all_lights",
            "all_off": "turn_off_all_lights",
            "set_color": "set_color",
            "change_color": "set_color",
            "set_light_color": "set_color",
            "set_all_colors": "set_all_colors",
            "change_all_colors": "set_all_colors",
            "set_all_lights_color": "set_all_colors"
        }
    
    def _create_system_prompt(self):
        """Create a system prompt for the language model.
        
        Returns:
            str: System prompt
        """
        return """You are a helpful assistant that controls Philips Hue lights.

IMPORTANT: You must ALWAYS respond with ONLY a valid JSON object in this EXACT format:
{
  "name": "function_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}

DO NOT include any explanatory text, markdown formatting, or code blocks around the JSON.
DO NOT use backticks (```) or any other formatting.
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
"""
    
    def _extract_json_from_text(self, text):
        """Extract JSON from text.
        
        Args:
            text (str): Text that might contain JSON
            
        Returns:
            dict: Parsed JSON data or None if parsing fails
        """
        try:
            # Try to parse the entire content as JSON first
            return json.loads(text)
        except json.JSONDecodeError:
            # If that fails, try to extract JSON from the text
            json_start = text.find('{')
            json_end = text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = text[json_start:json_end]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    return None
            return None
    
    def _map_arguments(self, arguments):
        """Map argument names from the model to expected argument names.
        
        Args:
            arguments (dict): Arguments from the model
            
        Returns:
            dict: Mapped arguments
        """
        mapped_arguments = {}
        
        # Handle light_id parameter
        if "light_id" in arguments:
            mapped_arguments["light_id"] = arguments["light_id"]
        elif "id" in arguments:
            mapped_arguments["light_id"] = arguments["id"]
        elif "lightId" in arguments:
            mapped_arguments["light_id"] = arguments["lightId"]
        elif "light" in arguments:
            # Try to map light name to light_id
            light_name = arguments["light"]
            for light in self.hue_bridge.lights:
                if light.name.lower() == light_name.lower():
                    mapped_arguments["light_id"] = light.light_id
                    break
        # if light id is not defined, set light_id to 1
        elif "light_id" not in mapped_arguments:
            mapped_arguments["light_id"] = 1
        
        # Handle color parameter
        if "color" in arguments:
            mapped_arguments["color"] = arguments["color"]
        
        return mapped_arguments
    
    def process_user_input(self, user_input):
        """Process user input and execute function calls.
        
        Args:
            user_input (str): User input text
            
        Returns:
            str: Result message
        """
        try:
            # Create a system prompt
            system_prompt = self._create_system_prompt()
            
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
                function_data = self._extract_json_from_text(content)
                if not function_data:
                    return "Failed to parse JSON from model response."
                
                # Extract function name and arguments
                if "name" in function_data and "arguments" in function_data:
                    function_name = function_data["name"]
                    arguments = function_data["arguments"]
                    
                    # Map the function name
                    mapped_function_name = self.function_name_map.get(function_name)
                    if not mapped_function_name:
                        print(f"No valid function mapping found for: {function_name}")
                        return content
                    
                    # Map arguments
                    mapped_arguments = self._map_arguments(arguments)
                    
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


class HueControlDemo:
    """Main class to run the Philips Hue control demo."""
    
    def __init__(self):
        """Initialize the demo."""
        self.hue_bridge = HueBridge()
        self.function_caller = None
    
    def run(self):
        """Run the demo."""
        # Connect to the bridge
        if not self.hue_bridge.connect():
            return
        
        # Initialize the function caller
        self.function_caller = LLMFunctionCaller(self.hue_bridge)
        
        # Display demo information
        self._display_demo_info()
        
        # Start interactive mode
        self._run_interactive_mode()
    
    def _display_demo_info(self):
        """Display information about the demo."""
        print("\n=== Philips Hue Light Control Demo ===")
        print("This demo controls your real Philips Hue lights.")
        for light in self.hue_bridge.lights:
            print(f"Light {light.light_id}: {light.name} is {'ON' if light.on else 'OFF'}")
        print("=" * 50)
    
    def _run_interactive_mode(self):
        """Run the interactive mode."""
        print("\n=== Interactive Mode ===")
        print("Type 'exit' to quit\n")
        
        while True:
            user_input = input("Enter your query: ")
            print(f"\nUser Input: {user_input}\n")
            
            if user_input.lower() == 'exit':
                break
            
            result = self.function_caller.process_user_input(user_input)
            print(f"\nFinal Result: {result}")
            print("-" * 50)


if __name__ == "__main__":
    demo = HueControlDemo()
    demo.run()
