/**
 * Debug utilities for ToneBridge Frontend
 */

import { ApiUtils } from './index';

export class DebugUtils {
  /**
   * Test audio data before sending to backend
   */
  static async testAudioData(blob: Blob, format: string): Promise<void> {
    try {
      console.log('=== Audio Debug Info ===');
      console.log('Blob size:', blob.size, 'bytes');
      console.log('Blob type:', blob.type);
      console.log('Format:', format);
      
      // Convert to base64
      const base64 = await this.blobToBase64(blob);
      console.log('Base64 length:', base64.length);
      console.log('Base64 preview:', base64.substring(0, 100) + '...');
      
      // Test with debug endpoint
      const response = await ApiUtils.post('/api/debug/audio', {
        audio: base64,
        format: format
      });
      
      console.log('Debug endpoint response:', response);
      console.log('=== End Debug Info ===');
      
    } catch (error) {
      console.error('Debug test failed:', error);
    }
  }
  
  /**
   * Convert blob to base64 (same as AudioUtils)
   */
  private static async blobToBase64(blob: Blob): Promise<string> {
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
} 