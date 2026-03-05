/**
 * HueBridge class - Manages connection and interaction with the Philips Hue bridge
 */
export class HueBridge {
  // Define color map for named colors (CIE xy color space)
  static COLOR_MAP = {
    red: [0.675, 0.322],
    green: [0.408, 0.517],
    blue: [0.167, 0.04],
    yellow: [0.508, 0.474],
    purple: [0.252, 0.09],
    orange: [0.611, 0.362],
    pink: [0.452, 0.233],
    white: [0.3127, 0.329],
    cyan: [0.17, 0.62],
  };

  constructor(bridgeIp = "192.168.2.4") {
    this.bridgeIp = bridgeIp;
    this.username = null;
    this.lights = [];
    this.baseUrl = null;
  }

  /**
   * Connect to the Philips Hue bridge
   * @returns {Promise<boolean>} True if connection successful
   */
  async connect() {
    try {
      // Try to get existing username from localStorage
      this.username = localStorage.getItem(`hue_username_${this.bridgeIp}`);

      if (!this.username) {
        // Need to register with the bridge
        const registered = await this.register();
        if (!registered) {
          return false;
        }
      }

      this.baseUrl = `http://${this.bridgeIp}/api/${this.username}`;

      // Test connection by getting lights
      const response = await fetch(`${this.baseUrl}/lights`);
      const data = await response.json();

      if (data[0]?.error) {
        // Username is invalid, need to re-register
        localStorage.removeItem(`hue_username_${this.bridgeIp}`);
        return await this.connect();
      }

      // Parse lights
      this.lights = Object.entries(data).map(([id, light]) => ({
        light_id: parseInt(id),
        name: light.name,
        type: light.type,
        on: light.state.on,
        reachable: light.state.reachable,
        xy: light.state.xy,
        bri: light.state.bri,
      }));

      console.log(
        `Connected to Hue bridge. Found ${this.lights.length} lights.`,
      );
      return true;
    } catch (error) {
      console.error("Error connecting to Hue bridge:", error);
      throw new Error(
        `Failed to connect to bridge at ${this.bridgeIp}. Make sure the bridge is on the same network.`,
      );
    }
  }

  /**
   * Register with the Hue bridge (requires button press)
   * @returns {Promise<boolean>} True if registration successful
   */
  async register() {
    try {
      const response = await fetch(`http://${this.bridgeIp}/api`, {
        method: "POST",
        body: JSON.stringify({ devicetype: "hue_web_control#browser" }),
      });
      const data = await response.json();

      if (data[0]?.error?.type === 101) {
        throw new Error(
          "Please press the link button on the Hue bridge, then try connecting again.",
        );
      }

      if (data[0]?.success?.username) {
        this.username = data[0].success.username;
        localStorage.setItem(`hue_username_${this.bridgeIp}`, this.username);
        return true;
      }

      throw new Error("Unexpected response from bridge");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Turn on a specific light
   * @param {number} lightId - ID of the light
   * @returns {Promise<string>} Result message
   */
  async turnOnLight(lightId) {
    try {
      await fetch(`${this.baseUrl}/lights/${lightId}/state`, {
        method: "PUT",
        body: JSON.stringify({ on: true }),
      });
      const light = this.lights.find((l) => l.light_id === lightId);
      if (light) light.on = true;
      return `Turned on the '${light?.name || lightId}' light.`;
    } catch (error) {
      return `Error turning on light ${lightId}: ${error.message}`;
    }
  }

  /**
   * Turn off a specific light
   * @param {number} lightId - ID of the light
   * @returns {Promise<string>} Result message
   */
  async turnOffLight(lightId) {
    try {
      await fetch(`${this.baseUrl}/lights/${lightId}/state`, {
        method: "PUT",
        body: JSON.stringify({ on: false }),
      });
      const light = this.lights.find((l) => l.light_id === lightId);
      if (light) light.on = false;
      return `Turned off the '${light?.name || lightId}' light.`;
    } catch (error) {
      return `Error turning off light ${lightId}: ${error.message}`;
    }
  }

  /**
   * Set the color of a specific light
   * @param {number} lightId - ID of the light
   * @param {string} color - Color name
   * @returns {Promise<string>} Result message
   */
  async setColor(lightId, color) {
    try {
      const colorLower = color.toLowerCase();
      if (!(colorLower in HueBridge.COLOR_MAP)) {
        return `Color '${color}' not recognized. Available colors: ${Object.keys(
          HueBridge.COLOR_MAP,
        ).join(", ")}`;
      }

      const xyColor = HueBridge.COLOR_MAP[colorLower];
      await fetch(`${this.baseUrl}/lights/${lightId}/state`, {
        method: "PUT",
        body: JSON.stringify({ xy: xyColor, on: true }),
      });

      const light = this.lights.find((l) => l.light_id === lightId);
      return `Set '${light?.name || lightId}' light to ${color}.`;
    } catch (error) {
      return `Error setting color for light ${lightId}: ${error.message}`;
    }
  }

  /**
   * Set the color of all lights
   * @param {string} color - Color name
   * @returns {Promise<string>} Result message
   */
  async setAllColors(color) {
    try {
      const colorLower = color.toLowerCase();
      if (!(colorLower in HueBridge.COLOR_MAP)) {
        return `Color '${color}' not recognized. Available colors: ${Object.keys(
          HueBridge.COLOR_MAP,
        ).join(", ")}`;
      }

      const xyColor = HueBridge.COLOR_MAP[colorLower];
      const promises = this.lights.map((light) =>
        fetch(`${this.baseUrl}/lights/${light.light_id}/state`, {
          method: "PUT",
          body: JSON.stringify({ xy: xyColor, on: true }),
        }).catch(() => {}),
      );

      await Promise.all(promises);
      return `Set all lights to ${color}.`;
    } catch (error) {
      return `Error setting color for all lights: ${error.message}`;
    }
  }

  /**
   * Turn on all lights
   * @returns {Promise<string>} Result message
   */
  async turnOnAllLights() {
    try {
      const promises = this.lights.map((light) =>
        fetch(`${this.baseUrl}/lights/${light.light_id}/state`, {
          method: "PUT",
          body: JSON.stringify({ on: true }),
        }).catch(() => {}),
      );

      await Promise.all(promises);
      this.lights.forEach((l) => (l.on = true));
      return "Turned on all lights.";
    } catch (error) {
      return `Error turning on all lights: ${error.message}`;
    }
  }

  /**
   * Turn off all lights
   * @returns {Promise<string>} Result message
   */
  async turnOffAllLights() {
    try {
      const promises = this.lights.map((light) =>
        fetch(`${this.baseUrl}/lights/${light.light_id}/state`, {
          method: "PUT",
          body: JSON.stringify({ on: false }),
        }).catch(() => {}),
      );

      await Promise.all(promises);
      this.lights.forEach((l) => (l.on = false));
      return "Turned off all lights.";
    } catch (error) {
      return `Error turning off all lights: ${error.message}`;
    }
  }

  /**
   * Refresh lights state from bridge
   * @returns {Promise<void>}
   */
  async refreshLights() {
    try {
      const response = await fetch(`${this.baseUrl}/lights`);
      const data = await response.json();

      this.lights = Object.entries(data).map(([id, light]) => ({
        light_id: parseInt(id),
        name: light.name,
        type: light.type,
        on: light.state.on,
        reachable: light.state.reachable,
        xy: light.state.xy,
        bri: light.state.bri,
      }));
    } catch (error) {
      console.error("Error refreshing lights:", error);
    }
  }

  /**
   * Check if any light is on
   * @returns {boolean} True if any light is on, false otherwise
   */
  anyLightOn() {
    return this.lights.some((light) => light.on);
  }
}
