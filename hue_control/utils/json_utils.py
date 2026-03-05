#!/usr/bin/env python3
"""
JSON utilities for Philips Hue Control
Contains functions for parsing and extracting JSON from text.
"""

import json


def extract_json_from_text(text):
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


def map_arguments(arguments, lights=None):
    """Map argument names from the model to expected argument names.
    
    Args:
        arguments (dict): Arguments from the model
        lights (list, optional): List of lights for name-to-id mapping
        
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
    elif "light" in arguments and lights:
        # Try to map light name to light_id
        light_name = arguments["light"]
        for light in lights:
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
