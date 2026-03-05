#!/usr/bin/env python3
"""
Main entry point for the Philips Hue Control Demo
This script runs the Philips Hue control demo using function calling with Gemma 3 27B-IT in LMStudio.
"""

from hue_control.demo import HueControlDemo


if __name__ == "__main__":
    demo = HueControlDemo()
    demo.run()
