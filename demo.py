import openai
import json
import re

# Initialize the client with LMStudio's base URL and API key
client = openai.OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

# Define function mappings
def greet(name: str):
    return f"Hello, {name}!"

def get_weather(location: str, unit: str = "celsius"):
    # This is a mock function - in a real app, you would call a weather API
    weather_data = {
        "New York": {"celsius": 22, "fahrenheit": 72, "condition": "Sunny"},
        "London": {"celsius": 18, "fahrenheit": 64, "condition": "Cloudy"},
        "Tokyo": {"celsius": 25, "fahrenheit": 77, "condition": "Rainy"},
        # Default for any other location
        "default": {"celsius": 20, "fahrenheit": 68, "condition": "Clear"}
    }
    
    location_data = weather_data.get(location, weather_data["default"])
    temp = location_data[unit.lower()]
    condition = location_data["condition"]
    
    return f"The weather in {location} is {condition} with a temperature of {temp}°{unit[0].upper()}"

# Map function names to their implementations
function_map = {
    "greet": greet,
    "get_weather": get_weather
}

# Define the functions in OpenAI's function calling format
functions = [
    {
        "name": "greet",
        "description": "Greet a person by name",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the person to greet"
                }
            },
            "required": ["name"]
        }
    },
    {
        "name": "get_weather",
        "description": "Get the current weather in a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city name, e.g., 'New York', 'London', 'Tokyo'"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The unit of temperature to use (celsius or fahrenheit)"
                }
            },
            "required": ["location"]
        }
    }
]

def run_function_call(user_input):
    print(f"\nUser Input: {user_input}\n")
    
    # Send the user query to the model with function definitions
    response = client.chat.completions.create(
        model="gemma-3-27b-it",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that can call functions. When you need to call a function, respond with a JSON object with 'name' for the function name and 'arguments' for the function arguments."},
            {"role": "user", "content": f"Available functions: {json.dumps(functions)}\n\nUser query: {user_input}"}
        ]
    )
    
    # Extract response content
    message_content = response.choices[0].message.content
    print(f"Raw Model Output: {message_content}\n")
    
    # Try to parse JSON if the model returns function call details
    try:
        # Look for JSON-like structure in the response
        json_match = re.search(r'```json\n(.*?)\n```', message_content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = message_content
            
        parsed = json.loads(json_str)
        function_name = parsed.get("name")
        arguments = parsed.get("arguments", {})
        
        if function_name and function_name in function_map:
            function_response = function_map[function_name](**arguments)
            print(f"Function Output: {function_response}\n")
            
            # Instead of sending the function result back to the model,
            # we'll just return the function response directly
            return function_response
        else:
            print("No valid function call found in the response.\n")
            return message_content
            
    except json.JSONDecodeError:
        print("Model didn't return structured JSON.\n")
        return message_content

# Test with different queries
test_queries = [
    "Say hello to Alice.",
    "What's the weather like in Tokyo?",
    "Can you tell me the temperature in New York in fahrenheit?"
]

if __name__ == "__main__":
    for query in test_queries:
        result = run_function_call(query)
        print(f"Final Result: {result}")
        print("-" * 50)