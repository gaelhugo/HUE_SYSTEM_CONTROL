#!/usr/bin/env python3
"""
Simplified Philips Hue Light Control Demo
This script demonstrates controlling Philips Hue lights using function calling with LLMs.
It only implements basic on/off functionality.
"""

import json
import os
from phue import Bridge
import openai

# Set up OpenAI client
client = openai.OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="not-needed"
)

# Connect to the Philips Hue bridge
BRIDGE_IP = "192.168.2.4"  # Replace with your bridge IP if different

# Initialize the bridge connection
try:
    print("Connecting to Philips Hue bridge...")
    bridge = Bridge(BRIDGE_IP)
    
    # If the app is not registered, press the button on the bridge before running this
    bridge.connect()
    print("Successfully connected to Philips Hue bridge!")
    
    # Get all lights
    lights = bridge.lights
    print(f"Found {len(lights)} lights on the bridge")
    
    # Display information about each light
    for light in lights:
        print(f"Light {light.light_id}: {light.name}")
        print(f"  Type: {light.type}")
        print(f"  State: {'ON' if light.on else 'OFF'}")
except Exception as e:
    print(f"Error connecting to Philips Hue bridge: {e}")
    print("Make sure the bridge is powered on and connected to your network.")
    print("You may need to press the link button on the bridge if this is the first time connecting.")
    exit(1)

# Define color map for named colors
color_map = {
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

# Light control functions
def turn_on_light(light_id):
    """Turn on a specific Philips Hue light."""
    try:
        bridge.set_light(light_id, 'on', True)
        light_name = bridge.get_light(light_id, 'name')
        return f"Turned on the '{light_name}' light."
    except Exception as e:
        return f"Error turning on light {light_id}: {e}"

def turn_off_light(light_id):
    """Turn off a specific Philips Hue light."""
    try:
        bridge.set_light(light_id, 'on', False)
        light_name = bridge.get_light(light_id, 'name')
        return f"Turned off the '{light_name}' light."
    except Exception as e:
        return f"Error turning off light {light_id}: {e}"

def set_color(light_id, color):
    """Set the color of a specific Philips Hue light."""
    try:
        # Check if the color is in our predefined map
        if color.lower() in color_map:
            xy_color = color_map[color.lower()]
            bridge.set_light(light_id, 'xy', xy_color)
            light_name = bridge.get_light(light_id, 'name')
            return f"Set '{light_name}' light to {color}."
        else:
            return f"Color '{color}' not recognized. Available colors: {', '.join(color_map.keys())}"
    except Exception as e:
        return f"Error setting color for light {light_id}: {e}"

def set_all_colors(light_id, color):
    """Set the color of all Philips Hue lights."""
    try:
        # Check if the color is in our predefined map
        if color.lower() in color_map:
            xy_color = color_map[color.lower()]
            for light in bridge.lights:
                bridge.set_light(light.light_id, 'xy', xy_color)
            return f"Set all lights to {color}."
        else:
            return f"Color '{color}' not recognized. Available colors: {', '.join(color_map.keys())}"
    except Exception as e:
        return f"Error setting color for all lights: {e}"



# Map function names to their implementations
function_map = {
    "turn_on_light": turn_on_light,
    "turn_off_light": turn_off_light,
    "set_color": set_color,
    "set_all_colors": set_all_colors,
    "turn_on_all_lights": turn_on_light,
    "turn_off_all_lights": turn_off_light
}



def run_function_call(user_input):
    """Process user input and execute function calls."""
    try:
        # Create a system prompt that explicitly guides the model to return well-structured JSON
        system_prompt = """You are a helpful assistant that controls Philips Hue lights.

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
        
        # Make a request to the model with function calling explicitly enabled
        response = client.chat.completions.create(
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
            
            # Try to parse the entire content as JSON first
            try:
                function_data = json.loads(content)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from the text
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    function_data = json.loads(json_str)
                else:
                    raise json.JSONDecodeError("No JSON found", content, 0)
            
            # Extract function name and arguments
            if "name" in function_data and "arguments" in function_data:
                function_name = function_data["name"]
                arguments = function_data["arguments"]
                
                # Map the function name
                function_name_map = {
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
                mapped_function_name = function_name_map.get(function_name)
                if not mapped_function_name:
                    print(f"No valid function mapping found for: {function_name}")
                    return content
                
                # Map arguments
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
                    for light in bridge.lights:
                        if light.name.lower() == light_name.lower():
                            mapped_arguments["light_id"] = light.light_id
                            break
                # if light id is not defined, set light_id to 1
                elif "light_id" not in mapped_arguments or "id" not in mapped_arguments or "lightId" not in mapped_arguments:
                    mapped_arguments["light_id"] = 1
                
                # Handle color parameter
                if "color" in arguments:
                    mapped_arguments["color"] = arguments["color"]
                
                # Call the function
                if mapped_function_name in function_map:
                    print(f"Calling function from parsed JSON: {mapped_function_name} with arguments: {mapped_arguments}")
                    try:
                        result = function_map[mapped_function_name](**mapped_arguments)
                        return result
                    except Exception as e:
                        error_message = f"Error processing function call from parsed JSON: {e}"
                        print(error_message)
                        return error_message
                else:
                    return f"Function {mapped_function_name} not found"
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
        except Exception as e:
            print(f"Error processing JSON: {e}")
            
            # Return the model's response as is
            return response_message.content
    except Exception as e:
        return f"Error processing request: {e}"

def main():
    """Main function to run the demo."""
    print("\n=== Philips Hue Light Control Demo ===")
    print("This demo controls your real Philips Hue lights.")
    
    # Display initial state of all lights
    for light in bridge.lights:
        print(f"Light {light.light_id}: {light.name} is {'ON' if light.on else 'OFF'}")
    print("=" * 50)
    
    print("\n=== Interactive Mode ===")
    print("Type 'exit' to quit\n")
    
    while True:
        user_input = input("Enter your query: ")
        print("\nUser Input:", user_input)
        
        if user_input.lower() == "exit":
            break
        
        result = run_function_call(user_input)
        print("\nFinal Result:", result)
        print("-" * 50 + "\n")

if __name__ == "__main__":
    main()