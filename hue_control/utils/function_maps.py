#!/usr/bin/env python3
"""
Function mapping utilities for Philips Hue Control
Contains mappings between function names and their implementations.
"""

# Define function name mappings for flexibility
FUNCTION_NAME_MAP = {
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

def get_mapped_function_name(function_name):
    """Get the mapped function name.
    
    Args:
        function_name (str): Original function name
        
    Returns:
        str or None: Mapped function name or None if not found
    """
    return FUNCTION_NAME_MAP.get(function_name)
