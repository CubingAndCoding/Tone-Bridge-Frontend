/**
 * ToneBridge Frontend - Centralized Utility Functions
 * Following DRY principles by providing reusable utilities
 */

import { AppError, ApiResponse, UserSettings, TranscriptionSegment, DailyStorageData, StorageInfo } from '../types';

// API Utilities
export class ApiUtils {
  private static baseUrl = import.meta.env.VITE_REACT_APP_API_URL || 'https://localhost:5000';
  private static timeout = 120000; // 2 minutes for audio processing
  private static maxRetries = 3;
  private static retryDelay = 1000;

  // Detect iOS Safari
  private static isIOSSafari(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  }

  // Detect mobile device
  private static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Add mobile-specific headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': navigator.userAgent,
    };

    // Add iOS-specific headers
    if (this.isIOSSafari()) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    // Merge with existing headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers[key] = String(value);
      });
    }

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`API request attempt ${attempt}/${this.maxRetries}: ${url}`);
        
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP ${response.status}: ${errorText}`);
          
          // Handle specific HTTP errors
          if (response.status === 0) {
            throw new Error('Network error - check your connection and try again');
          } else if (response.status === 404) {
            throw new Error('API endpoint not found - please check the server configuration');
          } else if (response.status === 413) {
            throw new Error('Audio file too large - please record a shorter message');
          } else if (response.status === 500) {
            throw new Error('Server error - please try again later');
          } else if (response.status === 503) {
            throw new Error('Service temporarily unavailable - please try again later');
          } else {
            throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
          }
        }

        const data = await response.json();
        console.log(`API request successful: ${url}`);
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`API request attempt ${attempt} failed:`, lastError.message);
        
        // Don't retry on certain errors
        if (lastError.message.includes('abort') || 
            lastError.message.includes('signal is aborted') ||
            lastError.message.includes('Network error') ||
            lastError.message.includes('API endpoint not found')) {
          break;
        }
        
        // Wait before retrying (except on last attempt)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    clearTimeout(timeoutId);
    
    // Provide user-friendly error messages
    let errorMessage = 'API request failed';
    if (lastError) {
      if (lastError.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      } else if (lastError.message.includes('abort') || lastError.message.includes('signal is aborted')) {
        errorMessage = 'Request timed out. The server is taking longer than expected to process your audio. Please try again.';
      } else if (lastError.message.includes('Network error')) {
        errorMessage = 'Network connection issue. Please check your connection and try again.';
      } else {
        errorMessage = lastError.message;
      }
    }
    
    throw new Error(errorMessage);
  }

  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    // For mobile devices, add additional logging
    if (this.isMobile()) {
      console.log('Mobile API request:', {
        endpoint,
        dataSize: JSON.stringify(data).length,
        userAgent: navigator.userAgent,
        isIOS: this.isIOSSafari()
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    // Add mobile-specific headers for file uploads
    const headers: Record<string, string> = {};
    if (this.isIOSSafari()) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers, // Let browser set Content-Type for FormData
    });
  }

  // Test API connectivity
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // Get API status with detailed info
  static async getApiStatus(): Promise<{
    connected: boolean;
    url: string;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.get('/health');
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        url: this.baseUrl,
        responseTime
      };
    } catch (error) {
      return {
        connected: false,
        url: this.baseUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }
}

// Audio Utilities
export class AudioUtils {
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  static async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.src = URL.createObjectURL(blob);
    });
  }

  static validateAudioFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 16 * 1024 * 1024; // 16MB
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/flac'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 16MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Unsupported file format' };
    }

    return { isValid: true };
  }
}

// Storage Utilities
export class StorageUtils {
  private static prefix = 'tonebridge_';

  static set(key: string, value: any, expiresIn?: number): void {
    const item = {
      value,
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(item));
  }

  static get<T>(key: string): T | null {
    const item = localStorage.getItem(this.prefix + key);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      return parsed.value;
    } catch {
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  static clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }

  static getSettings(): UserSettings {
    const savedSettings = this.get<UserSettings>('settings');
    
    // If no saved settings, return defaults
    if (!savedSettings) {
      return {
        theme: 'modern-blue',
        fontSize: 'medium',
        showEmojis: true,
        showTags: true,
        autoSave: true,
        displayMode: {
          id: 'combined',
          name: 'Combined',
          description: 'Show both emojis and tags',
          icon: 'heartOutline',
        },
        accessibility: {
          reducedMotion: false,
          dyslexiaFriendly: false,
        },
      };
    }

    // Migration: Add displayMode if it doesn't exist
    if (!savedSettings.displayMode) {
      const migratedSettings: UserSettings = {
        ...savedSettings,
        displayMode: {
          id: 'combined',
          name: 'Combined',
          description: 'Show both emojis and tags',
          icon: 'heartOutline',
        },
      };
      // Save the migrated settings
      this.saveSettings(migratedSettings);
      return migratedSettings;
    }

    return savedSettings;
  }

  static saveSettings(settings: UserSettings): void {
    this.set('settings', settings);
  }
}

// Daily Storage Manager for scalable local storage
export class DailyStorageManager {
  private static readonly STORAGE_KEY = 'daily_data';
  private static readonly MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB safe limit

  // Get current date in YYYY-MM-DD format
  private static getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Check if stored data is from today
  static isNewDay(): boolean {
    const stored = StorageUtils.get<DailyStorageData>(this.STORAGE_KEY);
    const today = this.getCurrentDate();
    return !stored || stored.date !== today;
  }

  // Get current day's data, create new if needed
  static getCurrentData(): DailyStorageData {
    const stored = StorageUtils.get<DailyStorageData>(this.STORAGE_KEY);
    const today = this.getCurrentDate();

    if (!stored || stored.date !== today) {
      // Create new daily data
      const newData: DailyStorageData = {
        date: today,
        settings: this.getDefaultSettings(),
        transcripts: [],
        metadata: {
          lastUpdated: Date.now(),
          storageSize: 0,
          transcriptCount: 0,
          themeLastChanged: Date.now()
        }
      };
      
      // Save the new data
      this.saveData(newData);
      return newData;
    }

    // Migration: Add displayMode if it doesn't exist in stored settings
    if (stored.settings && !stored.settings.displayMode) {
      const migratedData: DailyStorageData = {
        ...stored,
        settings: {
          ...stored.settings,
          displayMode: {
            id: 'combined',
            name: 'Combined',
            description: 'Show both emojis and tags',
            icon: 'heartOutline',
          },
        },
      };
      
      // Save the migrated data
      this.saveData(migratedData);
      return migratedData;
    }

    return stored;
  }

  // Save current day's data
  static saveData(data: DailyStorageData): void {
    // Update metadata
    data.metadata.lastUpdated = Date.now();
    data.metadata.storageSize = this.calculateStorageSize(data);
    
    // Save to localStorage
    StorageUtils.set(this.STORAGE_KEY, data);
  }

  // Get default settings
  private static getDefaultSettings(): UserSettings {
    return {
      theme: 'modern-blue',
      fontSize: 'medium',
      showEmojis: true,
      showTags: true,
      autoSave: true,
      displayMode: {
        id: 'combined',
        name: 'Combined',
        description: 'Show both emojis and tags',
        icon: 'heartOutline',
      },
      accessibility: {
        reducedMotion: false,
        dyslexiaFriendly: false,
      },
    };
  }

  // Calculate approximate storage size
  private static calculateStorageSize(data: DailyStorageData): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  // Check if storage is approaching limit
  static isStorageNearLimit(): boolean {
    const data = this.getCurrentData();
    return data.metadata.storageSize > this.MAX_STORAGE_SIZE * 0.8; // 80% of limit
  }

  // Get storage usage info
  static getStorageInfo(): StorageInfo {
    const data = this.getCurrentData();
    return {
      used: data.metadata.storageSize,
      limit: this.MAX_STORAGE_SIZE,
      percentage: (data.metadata.storageSize / this.MAX_STORAGE_SIZE) * 100,
      transcriptCount: data.metadata.transcriptCount,
      date: data.date
    };
  }

  // Clear current day's data (for testing or manual reset)
  static clearCurrentData(): void {
    StorageUtils.remove(this.STORAGE_KEY);
  }

  // Initialize daily storage system
  static initialize(): void {
    // Check if it's a new day and create fresh data if needed
    this.getCurrentData();
    
    // Set up midnight reset
    this.scheduleMidnightReset();
  }

  // Schedule automatic reset at midnight
  private static scheduleMidnightReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyData();
      this.scheduleMidnightReset(); // Schedule next day
    }, timeUntilMidnight);
  }

  // Reset daily data (keeps settings, clears transcripts)
  private static resetDailyData(): void {
    const data = this.getCurrentData();
    const newData: DailyStorageData = {
      ...data,
      date: this.getCurrentDate(),
      transcripts: [],
      metadata: {
        ...data.metadata,
        transcriptCount: 0,
        storageSize: 0,
        lastUpdated: Date.now()
      }
    };
    
    this.saveData(newData);
    
    // Notify user (optional)
    this.notifyDailyReset();
  }

  // Notify user of daily reset
  private static notifyDailyReset(): void {
    // This could trigger a toast notification
    console.log('Daily storage reset completed');
  }
}

// Theme Storage Manager - handles theme persistence with daily storage
export class ThemeStorageManager {
  // Get current theme from daily storage
  static getCurrentTheme(): UserSettings['theme'] {
    const data = DailyStorageManager.getCurrentData();
    return data.settings.theme;
  }

  // Save theme to daily storage
  static saveTheme(theme: UserSettings['theme']): void {
    const data = DailyStorageManager.getCurrentData();
    
    // Update theme and metadata
    data.settings.theme = theme;
    data.metadata.themeLastChanged = Date.now();
    
    // Save to daily storage
    DailyStorageManager.saveData(data);
    
    // Also save to legacy storage for backward compatibility
    StorageUtils.saveSettings(data.settings);
  }

  // Get all settings from daily storage
  static getSettings(): UserSettings {
    const data = DailyStorageManager.getCurrentData();
    return data.settings;
  }

  // Save all settings to daily storage
  static saveSettings(settings: UserSettings): void {
    const data = DailyStorageManager.getCurrentData();
    
    // Update settings and metadata
    data.settings = settings;
    data.metadata.themeLastChanged = Date.now();
    
    // Save to daily storage
    DailyStorageManager.saveData(data);
    
    // Also save to legacy storage for backward compatibility
    StorageUtils.saveSettings(settings);
  }

  // Initialize theme storage (migrate from legacy if needed)
  static initialize(): void {
    // Check if we have legacy settings to migrate
    const legacySettings = StorageUtils.get<UserSettings>('settings');
    
    if (legacySettings) {
      // Migrate legacy settings to daily storage
      this.saveSettings(legacySettings);
      console.log('Migrated legacy settings to daily storage');
    }
  }
}

// Transcript Storage Manager
export class TranscriptStorageManager {
  private static readonly TRANSCRIPTS_KEY = 'transcripts';
  private static readonly MAX_TRANSCRIPTS = 1000; // Maximum number of transcripts to store
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  // Get all transcripts from storage
  static getTranscripts(): TranscriptionSegment[] {
    try {
      const stored = StorageUtils.get<TranscriptionSegment[]>(this.TRANSCRIPTS_KEY);
      if (!stored) return [];
      
      // Convert timestamp strings back to Date objects
      return stored.map(segment => ({
        ...segment,
        timestamp: new Date(segment.timestamp)
      }));
    } catch (error) {
      console.error('Error loading transcripts from storage:', error);
      return [];
    }
  }

  // Save transcripts to storage
  static saveTranscripts(transcripts: TranscriptionSegment[]): void {
    try {
      // Limit the number of transcripts to prevent storage overflow
      const limitedTranscripts = transcripts.slice(-this.MAX_TRANSCRIPTS);
      
      // Check storage size
      const storageSize = new Blob([JSON.stringify(limitedTranscripts)]).size;
      if (storageSize > this.MAX_STORAGE_SIZE) {
        // Remove oldest transcripts to fit within storage limit
        const reducedTranscripts = this.reduceTranscriptsToFit(limitedTranscripts);
        StorageUtils.set(this.TRANSCRIPTS_KEY, reducedTranscripts);
      } else {
        StorageUtils.set(this.TRANSCRIPTS_KEY, limitedTranscripts);
      }
    } catch (error) {
      console.error('Error saving transcripts to storage:', error);
    }
  }

  // Add a single transcript
  static addTranscript(transcript: TranscriptionSegment): void {
    const transcripts = this.getTranscripts();
    transcripts.push(transcript);
    this.saveTranscripts(transcripts);
  }

  // Add multiple transcripts
  static addTranscripts(newTranscripts: TranscriptionSegment[]): void {
    const transcripts = this.getTranscripts();
    transcripts.push(...newTranscripts);
    this.saveTranscripts(transcripts);
  }

  // Clear all transcripts
  static clearTranscripts(): void {
    StorageUtils.remove(this.TRANSCRIPTS_KEY);
  }

  // Get storage info
  static getStorageInfo(): { count: number; size: number; limit: number } {
    const transcripts = this.getTranscripts();
    const size = new Blob([JSON.stringify(transcripts)]).size;
    return {
      count: transcripts.length,
      size,
      limit: this.MAX_STORAGE_SIZE
    };
  }

  // Reduce transcripts to fit within storage limit
  private static reduceTranscriptsToFit(transcripts: TranscriptionSegment[]): TranscriptionSegment[] {
    let reduced = [...transcripts];
    while (reduced.length > 0) {
      const size = new Blob([JSON.stringify(reduced)]).size;
      if (size <= this.MAX_STORAGE_SIZE) break;
      reduced = reduced.slice(1); // Remove oldest transcript
    }
    return reduced;
  }

  // Check if storage is near limit
  static isStorageNearLimit(): boolean {
    const info = this.getStorageInfo();
    return info.size > this.MAX_STORAGE_SIZE * 0.8; // 80% of limit
  }

  // Export transcripts as JSON
  static exportTranscripts(): string {
    const transcripts = this.getTranscripts();
    return JSON.stringify(transcripts, null, 2);
  }

  // Import transcripts from JSON
  static importTranscripts(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData) as TranscriptionSegment[];
      
      // Validate the imported data
      if (!Array.isArray(imported)) {
        throw new Error('Invalid data format: expected array');
      }
      
      // Convert timestamp strings to Date objects
      const validatedTranscripts = imported.map(segment => ({
        ...segment,
        timestamp: new Date(segment.timestamp)
      }));
      
      this.saveTranscripts(validatedTranscripts);
      return true;
    } catch (error) {
      console.error('Error importing transcripts:', error);
      return false;
    }
  }
}

// Error Utilities
export class ErrorUtils {
  static createError(code: string, message: string, details?: any): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
    };
  }

  static handleError(error: unknown): AppError {
    if (error instanceof Error) {
      return this.createError('UNKNOWN_ERROR', error.message);
    }
    return this.createError('UNKNOWN_ERROR', 'An unknown error occurred');
  }

  static isNetworkError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('fetch') || message.includes('network') || message.includes('abort');
  }
}

// Formatting Utilities
export class FormatUtils {
  static formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Validation Utilities
export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isNotEmpty(value: string): boolean {
    return value.trim().length > 0;
  }

  static isMinLength(value: string, minLength: number): boolean {
    return value.length >= minLength;
  }

  static isMaxLength(value: string, maxLength: number): boolean {
    return value.length <= maxLength;
  }
}

// Accessibility Utilities
export class AccessibilityUtils {
  static announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  static getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real app, you'd use a proper color contrast library
    return 4.5; // Placeholder
  }

  static isHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  static isReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

// Analytics Utilities
export class AnalyticsUtils {
  static trackEvent(name: string, properties?: Record<string, any>): void {
    // In a real app, you'd integrate with Google Analytics, Mixpanel, etc.
    console.log('Analytics Event:', { name, properties, timestamp: new Date() });
  }

  static trackError(error: AppError): void {
    this.trackEvent('error', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  static trackTranscription(segment: TranscriptionSegment): void {
    this.trackEvent('transcription_segment', {
      textLength: segment.text.length,
      emotion: segment.emotion,
      confidence: segment.confidence,
    });
  }
}

// Theme Utilities
export class ThemeUtils {
  static getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  static applyTheme(theme: 'light' | 'dark' | 'system' | 'modern-blue' | 'warm-sunset' | 'forest-green' | 'ocean-depth' | 'neutral-gray' | 'high-contrast'): void {
    // Remove all existing theme classes
    document.documentElement.classList.remove(
      'theme-modern-blue',
      'theme-warm-sunset', 
      'theme-forest-green',
      'theme-ocean-depth',
      'theme-neutral-gray',
      'theme-high-contrast'
    );

    // Handle legacy light/dark/system themes
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      const actualTheme = theme === 'system' ? this.getSystemTheme() : theme;
      document.documentElement.setAttribute('data-theme', actualTheme);
      return;
    }

    // Apply new color palette themes
    const themeClass = `theme-${theme}`;
    document.documentElement.classList.add(themeClass);
    
    // Preserve current light/dark mode state instead of using system preference
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    
    // Apply CSS variables immediately for instant theme change
    this.applyThemeVariables(theme, isDarkMode);
    
    // Debug: Log the applied theme
    console.log('Theme applied:', {
      theme,
      themeClass,
      isDarkMode,
      dataTheme: isDarkMode ? 'dark' : 'light',
      element: document.documentElement,
      classes: document.documentElement.className,
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--ion-background-color')
    });
  }

  private static applyThemeVariables(theme: string, isDarkMode: boolean): void {
    // Define theme variables (same as in Home.tsx toggleColorScheme)
    const themeVariables: Record<string, Record<string, Record<string, string>>> = {
      'modern-blue': {
        light: {
          '--ion-color-primary': '#2563eb',
          '--ion-color-primary-rgb': '37, 99, 235',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#1e40af',
          '--ion-color-primary-tint': '#3b82f6',
          '--ion-background-color': '#f8fafc',
          '--ion-background-color-rgb': '248, 250, 252',
          '--ion-text-color': '#1e293b',
          '--ion-text-color-rgb': '30, 41, 59',
          '--ion-toolbar-background': '#f8fafc',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#f1f5f9',
          '--ion-border-color': '#2563eb',
          '--ion-outline-color': '#1e40af',
          '--ion-color-light': '#f8fafc',
          '--ion-color-light-rgb': '248, 250, 252',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#e2e8f0',
          '--ion-color-light-tint': '#f1f5f9',
          '--ion-color-dark': '#1e293b',
          '--ion-color-dark-rgb': '30, 41, 59',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#0f172a',
          '--ion-color-dark-tint': '#334155',
          '--ion-color-medium': '#64748b',
          '--ion-color-medium-rgb': '100, 116, 139',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#475569',
          '--ion-color-medium-tint': '#94a3b8',
          '--ion-color-warning': '#f59e0b',
          '--ion-color-warning-rgb': '245, 158, 11',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#d97706',
          '--ion-color-warning-tint': '#fbbf24',
          '--ion-color-success': '#10b981',
          '--ion-color-success-rgb': '16, 185, 129',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#059669',
          '--ion-color-success-tint': '#34d399',
          '--ion-color-danger': '#ef4444',
          '--ion-color-danger-rgb': '239, 68, 68',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#dc2626',
          '--ion-color-danger-tint': '#f87171'
        },
        dark: {
          '--ion-color-primary': '#3b82f6',
          '--ion-color-primary-rgb': '59, 130, 246',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#2563eb',
          '--ion-color-primary-tint': '#60a5fa',
          '--ion-background-color': '#0f172a',
          '--ion-background-color-rgb': '15, 23, 42',
          '--ion-text-color': '#f1f5f9',
          '--ion-text-color-rgb': '241, 245, 249',
          '--ion-toolbar-background': '#1e293b',
          '--ion-card-background': '#1e293b',
          '--ion-modal-background': '#1e293b',
          '--ion-item-background': '#334155',
          '--ion-border-color': '#3b82f6',
          '--ion-outline-color': '#60a5fa',
          '--ion-color-light': '#1e293b',
          '--ion-color-light-rgb': '30, 41, 59',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#0f172a',
          '--ion-color-light-tint': '#334155',
          '--ion-color-dark': '#f1f5f9',
          '--ion-color-dark-rgb': '241, 245, 249',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#e2e8f0',
          '--ion-color-dark-tint': '#ffffff',
          '--ion-color-medium': '#94a3b8',
          '--ion-color-medium-rgb': '148, 163, 184',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#cbd5e1',
          '--ion-color-medium-tint': '#e2e8f0',
          '--ion-color-warning': '#fbbf24',
          '--ion-color-warning-rgb': '251, 191, 36',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#f59e0b',
          '--ion-color-warning-tint': '#fcd34d',
          '--ion-color-success': '#34d399',
          '--ion-color-success-rgb': '52, 211, 153',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#10b981',
          '--ion-color-success-tint': '#6ee7b7',
          '--ion-color-danger': '#f87171',
          '--ion-color-danger-rgb': '248, 113, 113',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ef4444',
          '--ion-color-danger-tint': '#fca5a5'
        }
      },
      'warm-sunset': {
        light: {
          '--ion-color-primary': '#f97316',
          '--ion-color-primary-rgb': '249, 115, 22',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#ea580c',
          '--ion-color-primary-tint': '#fb923c',
          '--ion-background-color': '#fef7ed',
          '--ion-background-color-rgb': '254, 247, 237',
          '--ion-text-color': '#292524',
          '--ion-text-color-rgb': '41, 37, 36',
          '--ion-toolbar-background': '#fef7ed',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#ffedd5',
          '--ion-border-color': '#f97316',
          '--ion-outline-color': '#ea580c',
          '--ion-color-light': '#fef7ed',
          '--ion-color-light-rgb': '254, 247, 237',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#fed7aa',
          '--ion-color-light-tint': '#ffedd5',
          '--ion-color-dark': '#292524',
          '--ion-color-dark-rgb': '41, 37, 36',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#1c1917',
          '--ion-color-dark-tint': '#44403c',
          '--ion-color-medium': '#78716c',
          '--ion-color-medium-rgb': '120, 113, 108',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#57534e',
          '--ion-color-medium-tint': '#a8a29e',
          '--ion-color-warning': '#f59e0b',
          '--ion-color-warning-rgb': '245, 158, 11',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#d97706',
          '--ion-color-warning-tint': '#fbbf24',
          '--ion-color-success': '#10b981',
          '--ion-color-success-rgb': '16, 185, 129',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#059669',
          '--ion-color-success-tint': '#34d399',
          '--ion-color-danger': '#ef4444',
          '--ion-color-danger-rgb': '239, 68, 68',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#dc2626',
          '--ion-color-danger-tint': '#f87171'
        },
        dark: {
          '--ion-color-primary': '#fb923c',
          '--ion-color-primary-rgb': '251, 146, 60',
          '--ion-color-primary-contrast': '#000000',
          '--ion-color-primary-shade': '#f97316',
          '--ion-color-primary-tint': '#fdba74',
          '--ion-background-color': '#1c1917',
          '--ion-background-color-rgb': '28, 25, 23',
          '--ion-text-color': '#fef7ed',
          '--ion-text-color-rgb': '254, 247, 237',
          '--ion-toolbar-background': '#292524',
          '--ion-card-background': '#292524',
          '--ion-modal-background': '#292524',
          '--ion-item-background': '#44403c',
          '--ion-border-color': '#fb923c',
          '--ion-outline-color': '#fdba74',
          '--ion-color-light': '#292524',
          '--ion-color-light-rgb': '41, 37, 36',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#1c1917',
          '--ion-color-light-tint': '#44403c',
          '--ion-color-dark': '#fef7ed',
          '--ion-color-dark-rgb': '254, 247, 237',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#fde68a',
          '--ion-color-dark-tint': '#ffffff',
          '--ion-color-medium': '#a8a29e',
          '--ion-color-medium-rgb': '168, 162, 158',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#d6d3d1',
          '--ion-color-medium-tint': '#e7e5e4',
          '--ion-color-warning': '#fbbf24',
          '--ion-color-warning-rgb': '251, 191, 36',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#f59e0b',
          '--ion-color-warning-tint': '#fcd34d',
          '--ion-color-success': '#34d399',
          '--ion-color-success-rgb': '52, 211, 153',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#10b981',
          '--ion-color-success-tint': '#6ee7b7',
          '--ion-color-danger': '#f87171',
          '--ion-color-danger-rgb': '248, 113, 113',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ef4444',
          '--ion-color-danger-tint': '#fca5a5'
        }
      },
      'forest-green': {
        light: {
          '--ion-color-primary': '#059669',
          '--ion-color-primary-rgb': '5, 150, 105',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#047857',
          '--ion-color-primary-tint': '#10b981',
          '--ion-background-color': '#f0fdf4',
          '--ion-background-color-rgb': '240, 253, 244',
          '--ion-text-color': '#064e3b',
          '--ion-text-color-rgb': '6, 78, 59',
          '--ion-toolbar-background': '#f0fdf4',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#dcfce7',
          '--ion-border-color': '#059669',
          '--ion-outline-color': '#047857',
          '--ion-color-light': '#f0fdf4',
          '--ion-color-light-rgb': '240, 253, 244',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#bbf7d0',
          '--ion-color-light-tint': '#dcfce7',
          '--ion-color-dark': '#064e3b',
          '--ion-color-dark-rgb': '6, 78, 59',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#022c22',
          '--ion-color-dark-tint': '#065f46',
          '--ion-color-medium': '#047857',
          '--ion-color-medium-rgb': '4, 120, 87',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#065f46',
          '--ion-color-medium-tint': '#10b981',
          '--ion-color-warning': '#f59e0b',
          '--ion-color-warning-rgb': '245, 158, 11',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#d97706',
          '--ion-color-warning-tint': '#fbbf24',
          '--ion-color-success': '#16a34a',
          '--ion-color-success-rgb': '22, 163, 74',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#15803d',
          '--ion-color-success-tint': '#4ade80',
          '--ion-color-danger': '#ef4444',
          '--ion-color-danger-rgb': '239, 68, 68',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#dc2626',
          '--ion-color-danger-tint': '#f87171'
        },
        dark: {
          '--ion-color-primary': '#10b981',
          '--ion-color-primary-rgb': '16, 185, 129',
          '--ion-color-primary-contrast': '#000000',
          '--ion-color-primary-shade': '#059669',
          '--ion-color-primary-tint': '#34d399',
          '--ion-background-color': '#022c22',
          '--ion-background-color-rgb': '2, 44, 34',
          '--ion-text-color': '#ecfdf5',
          '--ion-text-color-rgb': '236, 253, 245',
          '--ion-toolbar-background': '#064e3b',
          '--ion-card-background': '#064e3b',
          '--ion-modal-background': '#064e3b',
          '--ion-item-background': '#065f46',
          '--ion-border-color': '#10b981',
          '--ion-outline-color': '#34d399',
          '--ion-color-light': '#064e3b',
          '--ion-color-light-rgb': '6, 78, 59',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#022c22',
          '--ion-color-light-tint': '#065f46',
          '--ion-color-dark': '#ecfdf5',
          '--ion-color-dark-rgb': '236, 253, 245',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#d1fae5',
          '--ion-color-dark-tint': '#ffffff',
          '--ion-color-medium': '#34d399',
          '--ion-color-medium-rgb': '52, 211, 153',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#6ee7b7',
          '--ion-color-medium-tint': '#a7f3d0',
          '--ion-color-warning': '#fbbf24',
          '--ion-color-warning-rgb': '251, 191, 36',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#f59e0b',
          '--ion-color-warning-tint': '#fcd34d',
          '--ion-color-success': '#4ade80',
          '--ion-color-success-rgb': '74, 222, 128',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#16a34a',
          '--ion-color-success-tint': '#86efac',
          '--ion-color-danger': '#f87171',
          '--ion-color-danger-rgb': '248, 113, 113',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ef4444',
          '--ion-color-danger-tint': '#fca5a5'
        }
      },
      'ocean-depth': {
        light: {
          '--ion-color-primary': '#0891b2',
          '--ion-color-primary-rgb': '8, 145, 178',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#0e7490',
          '--ion-color-primary-tint': '#06b6d4',
          '--ion-background-color': '#f0f9ff',
          '--ion-background-color-rgb': '240, 249, 255',
          '--ion-text-color': '#0c4a6e',
          '--ion-text-color-rgb': '12, 74, 110',
          '--ion-toolbar-background': '#f0f9ff',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#e0f2fe',
          '--ion-border-color': '#0891b2',
          '--ion-outline-color': '#0e7490',
          '--ion-color-light': '#f0f9ff',
          '--ion-color-light-rgb': '240, 249, 255',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#bae6fd',
          '--ion-color-light-tint': '#e0f2fe',
          '--ion-color-dark': '#0c4a6e',
          '--ion-color-dark-rgb': '12, 74, 110',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#082f49',
          '--ion-color-dark-tint': '#155e75',
          '--ion-color-medium': '#0e7490',
          '--ion-color-medium-rgb': '14, 116, 144',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#155e75',
          '--ion-color-medium-tint': '#06b6d4',
          '--ion-color-warning': '#f59e0b',
          '--ion-color-warning-rgb': '245, 158, 11',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#d97706',
          '--ion-color-warning-tint': '#fbbf24',
          '--ion-color-success': '#059669',
          '--ion-color-success-rgb': '5, 150, 105',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#047857',
          '--ion-color-success-tint': '#10b981',
          '--ion-color-danger': '#ef4444',
          '--ion-color-danger-rgb': '239, 68, 68',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#dc2626',
          '--ion-color-danger-tint': '#f87171'
        },
        dark: {
          '--ion-color-primary': '#06b6d4',
          '--ion-color-primary-rgb': '6, 182, 212',
          '--ion-color-primary-contrast': '#000000',
          '--ion-color-primary-shade': '#0891b2',
          '--ion-color-primary-tint': '#22d3ee',
          '--ion-background-color': '#082f49',
          '--ion-background-color-rgb': '8, 47, 73',
          '--ion-text-color': '#f0f9ff',
          '--ion-text-color-rgb': '240, 249, 255',
          '--ion-toolbar-background': '#0c4a6e',
          '--ion-card-background': '#0c4a6e',
          '--ion-modal-background': '#0c4a6e',
          '--ion-item-background': '#155e75',
          '--ion-border-color': '#06b6d4',
          '--ion-outline-color': '#22d3ee',
          '--ion-color-light': '#0c4a6e',
          '--ion-color-light-rgb': '12, 74, 110',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#082f49',
          '--ion-color-light-tint': '#155e75',
          '--ion-color-dark': '#f0f9ff',
          '--ion-color-dark-rgb': '240, 249, 255',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#bae6fd',
          '--ion-color-dark-tint': '#ffffff',
          '--ion-color-medium': '#22d3ee',
          '--ion-color-medium-rgb': '34, 211, 238',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#67e8f9',
          '--ion-color-medium-tint': '#a5f3fc',
          '--ion-color-warning': '#fbbf24',
          '--ion-color-warning-rgb': '251, 191, 36',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#f59e0b',
          '--ion-color-warning-tint': '#fcd34d',
          '--ion-color-success': '#10b981',
          '--ion-color-success-rgb': '16, 185, 129',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#059669',
          '--ion-color-success-tint': '#34d399',
          '--ion-color-danger': '#f87171',
          '--ion-color-danger-rgb': '248, 113, 113',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ef4444',
          '--ion-color-danger-tint': '#fca5a5'
        }
      },
      'neutral-gray': {
        light: {
          '--ion-color-primary': '#6b7280',
          '--ion-color-primary-rgb': '107, 114, 128',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#4b5563',
          '--ion-color-primary-tint': '#9ca3af',
          '--ion-background-color': '#f9fafb',
          '--ion-background-color-rgb': '249, 250, 251',
          '--ion-text-color': '#111827',
          '--ion-text-color-rgb': '17, 24, 39',
          '--ion-toolbar-background': '#f9fafb',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#f3f4f6',
          '--ion-border-color': '#6b7280',
          '--ion-outline-color': '#4b5563',
          '--ion-color-light': '#f9fafb',
          '--ion-color-light-rgb': '249, 250, 251',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#d1d5db',
          '--ion-color-light-tint': '#f3f4f6',
          '--ion-color-dark': '#111827',
          '--ion-color-dark-rgb': '17, 24, 39',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#000000',
          '--ion-color-dark-tint': '#374151',
          '--ion-color-medium': '#4b5563',
          '--ion-color-medium-rgb': '75, 85, 99',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#374151',
          '--ion-color-medium-tint': '#6b7280',
          '--ion-color-warning': '#f59e0b',
          '--ion-color-warning-rgb': '245, 158, 11',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#d97706',
          '--ion-color-warning-tint': '#fbbf24',
          '--ion-color-success': '#10b981',
          '--ion-color-success-rgb': '16, 185, 129',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#059669',
          '--ion-color-success-tint': '#34d399',
          '--ion-color-danger': '#ef4444',
          '--ion-color-danger-rgb': '239, 68, 68',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#dc2626',
          '--ion-color-danger-tint': '#f87171'
        },
        dark: {
          '--ion-color-primary': '#9ca3af',
          '--ion-color-primary-rgb': '156, 163, 175',
          '--ion-color-primary-contrast': '#000000',
          '--ion-color-primary-shade': '#6b7280',
          '--ion-color-primary-tint': '#d1d5db',
          '--ion-background-color': '#111827',
          '--ion-background-color-rgb': '17, 24, 39',
          '--ion-text-color': '#f9fafb',
          '--ion-text-color-rgb': '249, 250, 251',
          '--ion-toolbar-background': '#1f2937',
          '--ion-card-background': '#1f2937',
          '--ion-modal-background': '#1f2937',
          '--ion-item-background': '#374151',
          '--ion-border-color': '#9ca3af',
          '--ion-outline-color': '#d1d5db',
          '--ion-color-light': '#1f2937',
          '--ion-color-light-rgb': '31, 41, 55',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#111827',
          '--ion-color-light-tint': '#374151',
          '--ion-color-dark': '#f9fafb',
          '--ion-color-dark-rgb': '249, 250, 251',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#d1d5db',
          '--ion-color-dark-tint': '#ffffff',
          '--ion-color-medium': '#d1d5db',
          '--ion-color-medium-rgb': '209, 213, 219',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#9ca3af',
          '--ion-color-medium-tint': '#e5e7eb',
          '--ion-color-warning': '#fbbf24',
          '--ion-color-warning-rgb': '251, 191, 36',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#f59e0b',
          '--ion-color-warning-tint': '#fcd34d',
          '--ion-color-success': '#34d399',
          '--ion-color-success-rgb': '52, 211, 153',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#10b981',
          '--ion-color-success-tint': '#6ee7b7',
          '--ion-color-danger': '#f87171',
          '--ion-color-danger-rgb': '248, 113, 113',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ef4444',
          '--ion-color-danger-tint': '#fca5a5'
        }
      },
      'high-contrast': {
        light: {
          '--ion-color-primary': '#000000',
          '--ion-color-primary-rgb': '0, 0, 0',
          '--ion-color-primary-contrast': '#ffffff',
          '--ion-color-primary-shade': '#000000',
          '--ion-color-primary-tint': '#333333',
          '--ion-background-color': '#ffffff',
          '--ion-background-color-rgb': '255, 255, 255',
          '--ion-text-color': '#000000',
          '--ion-text-color-rgb': '0, 0, 0',
          '--ion-toolbar-background': '#ffffff',
          '--ion-card-background': '#ffffff',
          '--ion-modal-background': '#ffffff',
          '--ion-item-background': '#f0f0f0',
          '--ion-border-color': '#000000',
          '--ion-outline-color': '#000000',
          '--ion-color-light': '#ffffff',
          '--ion-color-light-rgb': '255, 255, 255',
          '--ion-color-light-contrast': '#000000',
          '--ion-color-light-shade': '#f0f0f0',
          '--ion-color-light-tint': '#ffffff',
          '--ion-color-dark': '#000000',
          '--ion-color-dark-rgb': '0, 0, 0',
          '--ion-color-dark-contrast': '#ffffff',
          '--ion-color-dark-shade': '#000000',
          '--ion-color-dark-tint': '#333333',
          '--ion-color-medium': '#000000',
          '--ion-color-medium-rgb': '0, 0, 0',
          '--ion-color-medium-contrast': '#ffffff',
          '--ion-color-medium-shade': '#000000',
          '--ion-color-medium-tint': '#333333',
          '--ion-color-secondary': '#000000',
          '--ion-color-secondary-rgb': '0, 0, 0',
          '--ion-color-secondary-contrast': '#ffffff',
          '--ion-color-secondary-shade': '#000000',
          '--ion-color-secondary-tint': '#333333',
          '--ion-color-warning': '#000000',
          '--ion-color-warning-rgb': '0, 0, 0',
          '--ion-color-warning-contrast': '#ffffff',
          '--ion-color-warning-contrast-rgb': '255, 255, 255',
          '--ion-color-warning-shade': '#000000',
          '--ion-color-warning-tint': '#333333',
          '--ion-color-success': '#000000',
          '--ion-color-success-rgb': '0, 0, 0',
          '--ion-color-success-contrast': '#ffffff',
          '--ion-color-success-contrast-rgb': '255, 255, 255',
          '--ion-color-success-shade': '#000000',
          '--ion-color-success-tint': '#333333',
          '--ion-color-danger': '#000000',
          '--ion-color-danger-rgb': '0, 0, 0',
          '--ion-color-danger-contrast': '#ffffff',
          '--ion-color-danger-contrast-rgb': '255, 255, 255',
          '--ion-color-danger-shade': '#000000',
          '--ion-color-danger-tint': '#333333'
        },
        dark: {
          '--ion-color-primary': '#ffffff',
          '--ion-color-primary-rgb': '255, 255, 255',
          '--ion-color-primary-contrast': '#000000',
          '--ion-color-primary-shade': '#ffffff',
          '--ion-color-primary-tint': '#cccccc',
          '--ion-background-color': '#000000',
          '--ion-background-color-rgb': '0, 0, 0',
          '--ion-text-color': '#ffffff',
          '--ion-text-color-rgb': '255, 255, 255',
          '--ion-toolbar-background': '#000000',
          '--ion-card-background': '#000000',
          '--ion-modal-background': '#000000',
          '--ion-item-background': '#000000',
          '--ion-border-color': '#ffffff',
          '--ion-outline-color': '#ffffff',
          '--ion-color-light': '#000000',
          '--ion-color-light-rgb': '0, 0, 0',
          '--ion-color-light-contrast': '#ffffff',
          '--ion-color-light-shade': '#000000',
          '--ion-color-light-tint': '#333333',
          '--ion-color-dark': '#ffffff',
          '--ion-color-dark-rgb': '255, 255, 255',
          '--ion-color-dark-contrast': '#000000',
          '--ion-color-dark-shade': '#ffffff',
          '--ion-color-dark-tint': '#cccccc',
          '--ion-color-medium': '#ffffff',
          '--ion-color-medium-rgb': '255, 255, 255',
          '--ion-color-medium-contrast': '#000000',
          '--ion-color-medium-shade': '#ffffff',
          '--ion-color-medium-tint': '#cccccc',
          '--ion-color-secondary': '#ffffff',
          '--ion-color-secondary-rgb': '255, 255, 255',
          '--ion-color-secondary-contrast': '#000000',
          '--ion-color-secondary-shade': '#ffffff',
          '--ion-color-secondary-tint': '#cccccc',
          '--ion-color-warning': '#ffffff',
          '--ion-color-warning-rgb': '255, 255, 255',
          '--ion-color-warning-contrast': '#000000',
          '--ion-color-warning-contrast-rgb': '0, 0, 0',
          '--ion-color-warning-shade': '#ffffff',
          '--ion-color-warning-tint': '#cccccc',
          '--ion-color-success': '#ffffff',
          '--ion-color-success-rgb': '255, 255, 255',
          '--ion-color-success-contrast': '#000000',
          '--ion-color-success-contrast-rgb': '0, 0, 0',
          '--ion-color-success-shade': '#ffffff',
          '--ion-color-success-tint': '#cccccc',
          '--ion-color-danger': '#ffffff',
          '--ion-color-danger-rgb': '255, 255, 255',
          '--ion-color-danger-contrast': '#000000',
          '--ion-color-danger-contrast-rgb': '0, 0, 0',
          '--ion-color-danger-shade': '#ffffff',
          '--ion-color-danger-tint': '#cccccc'
        }
      }
    };

    // Apply the theme variables
    const mode = isDarkMode ? 'dark' : 'light';
    const variables = themeVariables[theme]?.[mode];
    
    if (variables) {
      Object.entries(variables).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value, 'important');
      });
    }
  }

  static applyFontSize(fontSize: 'small' | 'medium' | 'large'): void {
    // Remove existing font size classes from both html and body
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    
    // Apply new font size class to both html and body
    document.documentElement.classList.add(`font-size-${fontSize}`);
    document.body.classList.add(`font-size-${fontSize}`);
    
    // Also apply to the root element
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
      rootElement.classList.add(`font-size-${fontSize}`);
    }
    
    // Set CSS custom property on root for global access
    const fontSizeValue = fontSize === 'small' ? '0.875rem' : fontSize === 'medium' ? '1rem' : '1.25rem';
    document.documentElement.style.setProperty('--app-font-size', fontSizeValue);
    document.body.style.setProperty('--app-font-size', fontSizeValue);
    if (rootElement) {
      rootElement.style.setProperty('--app-font-size', fontSizeValue);
    }
    
    // Apply font size directly to body and root for immediate effect
    document.body.style.fontSize = fontSizeValue;
    if (rootElement) {
      rootElement.style.fontSize = fontSizeValue;
    }
    
    // Debug: Log the applied font size
    console.log('Font size applied:', {
      fontSize,
      class: `font-size-${fontSize}`,
      fontSizeValue,
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      rootClasses: rootElement?.className,
      customProperty: getComputedStyle(document.documentElement).getPropertyValue('--app-font-size'),
      bodyFontSize: getComputedStyle(document.body).fontSize,
      rootFontSize: rootElement ? getComputedStyle(rootElement).fontSize : 'N/A'
    });
  }

  static getThemeColors(): Record<string, string> {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--ion-color-primary').trim(),
      secondary: style.getPropertyValue('--ion-color-secondary').trim(),
      background: style.getPropertyValue('--ion-background-color').trim(),
      surface: style.getPropertyValue('--ion-color-light').trim(),
      text: style.getPropertyValue('--ion-text-color').trim(),
    };
  }
} 