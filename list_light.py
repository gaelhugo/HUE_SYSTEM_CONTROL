#!/usr/bin/env python3
"""
Philips Hue Light Lister
------------------------
A simple script to discover and list all Philips Hue lights connected to a bridge.
"""

import sys
import json
import time
import os.path
from phue import Bridge, PhueRegistrationException
import requests
from requests.exceptions import ConnectionError

def discover_bridge():
    """
    Discover Philips Hue bridges on the network using the meethue discovery service.
    """
    print("Searching for Philips Hue bridges on your network...")
    try:
        response = requests.get('https://discovery.meethue.com/', timeout=5)
        if response.status_code == 200:
            bridges = response.json()
            if bridges:
                print(f"Found bridge at IP: {bridges[0]['internalipaddress']}")
                return bridges[0]['internalipaddress']
    except (ConnectionError, requests.exceptions.RequestException) as e:
        print(f"Error discovering bridge: {e}")
    
    print("No bridges found automatically.")
    return None

def connect_to_bridge(bridge_ip=None):
    """
    Connect to a Philips Hue bridge.
    If no IP is provided, attempt to discover a bridge.
    """
    if not bridge_ip:
        bridge_ip = discover_bridge()
        if not bridge_ip:
            bridge_ip = input("\nEnter your Hue Bridge IP address (or press Enter to exit): ")
            if not bridge_ip:
                return None
    
    # Check for config file to see if we've connected before
    username_file = os.path.expanduser('~/.python_hue')
    
    try:
        # First try connecting without pressing the link button (if we've connected before)
        print(f"\nAttempting to connect to bridge at {bridge_ip}...")
        bridge = Bridge(bridge_ip)
        
        # Test if we can access the lights (this will fail if not authenticated)
        try:
            bridge.get_light()
            print("Successfully connected to the bridge!")
            return bridge
        except PhueRegistrationException:
            pass  # Expected if not authenticated yet
        
        # If we get here, we need to press the link button
        print("\n=== IMPORTANT: LINK BUTTON REQUIRED ===")
        print("1. Go to your Philips Hue bridge (the round white device)")
        print("2. Press the large link button on top of the bridge")
        print("3. Return here within 30 seconds")
        print("\nWaiting for you to press the link button...")
        
        # Give the user time to read the instructions before trying to connect
        time.sleep(3)
        
        # Try connecting again (this will create a new user if the button is pressed)
        for attempt in range(5):
            try:
                bridge.connect()
                print("\nSuccess! Connected to the Philips Hue bridge.")
                return bridge
            except PhueRegistrationException:
                if attempt < 4:  # Don't print on last attempt
                    print(f"Link button not pressed yet. Waiting... ({attempt+1}/5)")
                    time.sleep(5)
        
        print("\nFailed to connect: The link button was not pressed within the time limit.")
        print("Please run the script again and press the link button when prompted.")
        return None
        
    except Exception as e:
        print(f"\nError connecting to bridge: {e}")
        print("\nPossible issues:")
        print("1. The bridge IP address is incorrect")
        print("2. The bridge is not powered on")
        print("3. Your computer is not on the same network as the bridge")
        return None

def list_lights(bridge):
    """
    List all lights connected to the bridge with their properties.
    """
    if not bridge:
        return
    
    try:
        # Get all lights
        lights = bridge.get_light_objects('id')
        
        if not lights:
            print("\nNo lights found connected to this bridge.")
            print("If you have Philips Hue lights, make sure they are:")
            print("1. Powered on")
            print("2. Properly paired with this Hue bridge")
            print("3. Within range of the bridge")
            return
        
        print(f"\n=== Found {len(lights)} Philips Hue Lights ===\n")
        
        # Get detailed information for each light
        for light_id, light in sorted(lights.items()):
            # Get light data
            light_data = bridge.get_light(light_id)
            
            # Basic info
            name = light_data['name']
            model_id = light_data.get('modelid', 'Unknown')
            manufacturer = light_data.get('manufacturername', 'Unknown')
            product_name = light_data.get('productname', 'Unknown')
            light_type = light_data.get('type', 'Unknown')
            
            # State info
            state = light_data['state']
            on_state = "ON" if state.get('on', False) else "OFF"
            reachable = "REACHABLE" if state.get('reachable', False) else "UNREACHABLE"
            
            # Brightness (convert to percentage)
            brightness = "N/A"
            if 'bri' in state:
                brightness = f"{int((state['bri'] / 254) * 100)}%"
            
            # Color information
            color_info = []
            if 'hue' in state:
                hue_degrees = int((state['hue'] / 65535) * 360)
                color_info.append(f"Hue: {hue_degrees}°")
            
            if 'sat' in state:
                saturation = int((state['sat'] / 254) * 100)
                color_info.append(f"Saturation: {saturation}%")
            
            if 'ct' in state:
                # Convert mired to Kelvin
                color_temp = int(1000000 / state['ct'])
                color_info.append(f"Color Temp: {color_temp}K")
                
            if 'xy' in state:
                color_info.append(f"XY: {state['xy']}")
            
            color_str = ", ".join(color_info) if color_info else "N/A"
            
            # Print light information
            print(f"Light {light_id}: {name}")
            print(f"  Model: {product_name} ({model_id}) by {manufacturer}")
            print(f"  Type: {light_type}")
            print(f"  Status: {on_state}, {reachable}")
            print(f"  Brightness: {brightness}")
            print(f"  Color: {color_str}")
            
            # Get and display light capabilities
            capabilities = light_data.get('capabilities', {})
            if capabilities:
                print("  Capabilities:")
                if 'control' in capabilities:
                    control = capabilities['control']
                    if 'colorgamuttype' in control:
                        print(f"    Color Gamut: {control['colorgamuttype']}")
                    if 'ct' in control:
                        min_ct = control['ct'].get('min', 'N/A')
                        max_ct = control['ct'].get('max', 'N/A')
                        print(f"    Color Temperature Range: {min_ct}-{max_ct} mired")
            
            print()  # Empty line between lights
    
    except Exception as e:
        print(f"Error listing lights: {e}")

def main():
    """
    Main function to run the script.
    """
    print("=== Philips Hue Light Lister ===")
    print("This script discovers and lists all Philips Hue lights connected to your bridge.\n")
    
    # Check if bridge IP was provided as command line argument
    bridge_ip = None
    if len(sys.argv) > 1:
        bridge_ip = sys.argv[1]
        print(f"Using provided bridge IP: {bridge_ip}")
    
    # Connect to bridge
    bridge = connect_to_bridge(bridge_ip)
    
    if bridge:
        # List all lights
        list_lights(bridge)
        
        # Display bridge information
        try:
            config = bridge.get_config()
            print("\n=== Bridge Information ===")
            print(f"Name: {config.get('name', 'Unknown')}")
            print(f"Model: {config.get('modelid', 'Unknown')}")
            print(f"API Version: {config.get('apiversion', 'Unknown')}")
            print(f"Software Version: {config.get('swversion', 'Unknown')}")
            print(f"Bridge ID: {config.get('bridgeid', 'Unknown')}")
            print(f"MAC Address: {config.get('mac', 'Unknown')}")
            
            # Get and display connected sensors
            sensors = bridge.get_sensor()
            if sensors:
                print(f"\nNumber of connected sensors: {len(sensors)}")
                
            print("\nTip: You can specify the bridge IP as a command line argument:")
            print(f"  python3 list_light.py {bridge_ip}")
        except Exception as e:
            print(f"Error getting bridge information: {e}")
    else:
        print("\nFailed to connect to a Hue Bridge. Exiting.")

if __name__ == "__main__":
    main()