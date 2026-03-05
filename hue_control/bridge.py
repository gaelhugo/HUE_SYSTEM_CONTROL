#!/usr/bin/env python3
"""
Bridge module for Philips Hue Control
Handles connection and interaction with the Philips Hue bridge.
"""

from phue import Bridge
from .utils.colors import COLOR_MAP, is_valid_color


class HueBridge:
    """Class to manage connection and interaction with the Philips Hue bridge."""
    
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
            if is_valid_color(color):
                xy_color = COLOR_MAP[color.lower()]
                self.bridge.set_light(light_id, 'xy', xy_color)
                light_name = self.bridge.get_light(light_id, 'name')
                return f"Set '{light_name}' light to {color}."
            else:
                return f"Color '{color}' not recognized. Available colors: {', '.join(COLOR_MAP.keys())}"
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
            if is_valid_color(color):
                xy_color = COLOR_MAP[color.lower()]
                for light in self.bridge.lights:
                    try:
                        self.bridge.set_light(light.light_id, 'xy', xy_color)
                    except Exception:
                        # Skip lights that don't support color
                        pass
                return f"Set all lights to {color}."
            else:
                return f"Color '{color}' not recognized. Available colors: {', '.join(COLOR_MAP.keys())}"
        except Exception as e:
            return f"Error setting color for all lights: {e}"
