# Function Calling with Gemma 3 27B-IT in LMStudio

This project demonstrates how to implement function calling with the Gemma 3 27B-IT model using LMStudio through a JSON parsing approach.

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Make sure LMStudio is running with the Gemma 3 27B-IT model loaded and the server is active on port 1234.

3. Run the demo script:
   ```
   python3 demo.py
   ```

## How It Works

Since Gemma 3 27B-IT in LMStudio doesn't fully support OpenAI's native function calling interface, this script uses a JSON parsing approach:

1. The script sends a request to the model with explicit instructions to return a JSON object when it needs to call a function
2. It parses the JSON response from the model's text output
3. It executes the appropriate function with the extracted arguments
4. It sends the function result back to the model for a final response

## Available Functions

- `greet`: A simple function that greets a person by name
- `get_weather`: A mock function that returns weather information for a given location

## Example Queries

The script tests the following queries:
- "Say hello to Alice."
- "What's the weather like in Tokyo?"
- "Can you tell me the temperature in New York in fahrenheit?"

## Notes

- This approach works well with Gemma 3 models in LMStudio
- The script includes regex pattern matching to extract JSON even when it's wrapped in code blocks
- For production use, you might want to enhance the error handling and add more robust JSON parsing
