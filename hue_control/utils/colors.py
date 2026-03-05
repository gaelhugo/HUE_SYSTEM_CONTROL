#!/usr/bin/env python3
"""
Color utilities for Philips Hue Control
Contains color mappings and conversion functions.
"""

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

def get_xy_color(color_name):
    """Get the XY color coordinates for a named color.
    
    Args:
        color_name (str): Name of the color
        
    Returns:
        list or None: XY color coordinates or None if color not found
    """
    color_name = color_name.lower()
    return COLOR_MAP.get(color_name)

def is_valid_color(color_name):
    """Check if a color name is valid.
    
    Args:
        color_name (str): Name of the color
        
    Returns:
        bool: True if color is valid, False otherwise
    """
    return color_name.lower() in COLOR_MAP

def get_available_colors():
    """Get a list of available color names.
    
    Returns:
        list: List of available color names
    """
    return list(COLOR_MAP.keys())
