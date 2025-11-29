interface AppConfig {
  apiKey: string | null;
}

class ConfigService {
  private config: AppConfig = {
    apiKey: null,
  };

  private initializationPromise: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this._loadConfig();
    }
    return this.initializationPromise;
  }

  private async _loadConfig(): Promise<void> {
    try {
      // Use a cache-busting query parameter to ensure the latest version is fetched
      const response = await fetch(`/config.json?t=${new Date().getTime()}`);
      if (!response.ok) {
        throw new Error(`Failed to load config.json: ${response.statusText}`);
      }
      const configData = await response.json();
      if (!configData.API_KEY) {
        throw new Error('API_KEY is missing in config.json');
      }
      this.config.apiKey = configData.API_KEY;
      console.log('Configuration loaded successfully.');
    } catch (error) {
      console.error('Failed to load application configuration:', error);
      // Re-throw the error to be caught by the App component
      throw error;
    }
  }

  getApiKey(): string {
    if (!this.config.apiKey) {
      throw new Error('API Key not found. Ensure config.json is present and correctly configured, then refresh the page.');
    }
    return this.config.apiKey;
  }
}

export const configService = new ConfigService();
