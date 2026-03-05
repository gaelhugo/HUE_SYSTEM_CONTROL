#!/usr/bin/env python3
"""
Demo module for Philips Hue Control
Main application to run the Philips Hue control demo.
"""

from .bridge import HueBridge
from .function_caller import LLMFunctionCaller


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
