import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonFab,
  IonFabButton,
  IonSpinner,
} from '@ionic/react';
import {
  settingsOutline,
  downloadOutline,
  shareOutline,
  mic,
  heartOutline,
  trashOutline,
  sunnyOutline,
  moonOutline,
  volumeHighOutline,
  closeOutline,
} from 'ionicons/icons';
import { AudioRecording, TranscriptionSegment, DisplayMode, UserSettings } from '../types';
import { ApiUtils, AudioUtils, StorageUtils, AnalyticsUtils, ErrorUtils, ThemeUtils, DailyStorageManager, ThemeStorageManager, TranscriptStorageManager } from '../utils';
import { DebugUtils } from '../utils/debug';
import { Loading, Toast } from '../components/common';
import AudioRecorder from '../components/audio/AudioRecorder';
import TranscriptionDisplay from '../components/transcription/TranscriptionDisplay';
import SettingsPanel from '../components/settings/SettingsPanel';
import { TextToSpeech } from '../components/tts';

const Home: React.FC = () => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);

  const [settings, setSettings] = useState<UserSettings>(StorageUtils.getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showTTS, setShowTTS] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Display modes
  const displayModes: DisplayMode[] = [
    {
      id: 'combined',
      name: 'Combined',
      description: 'Show both emojis and tags',
      icon: 'heartOutline',
    },
    {
      id: 'emoji-only',
      name: 'Emojis Only',
      description: 'Show only emotion emojis',
      icon: 'happyOutline',
    },
    {
      id: 'tag-only',
      name: 'Tags Only',
      description: 'Show only emotion tags',
      icon: 'textOutline',
    },
  ];

  // Initialize app
  useEffect(() => {
    AnalyticsUtils.trackEvent('page_view', { page: 'home' });
    
    // Initialize daily storage system
    DailyStorageManager.initialize();
    ThemeStorageManager.initialize();
    
    // Get settings from daily storage
    const savedSettings = ThemeStorageManager.getSettings();
    setSettings(savedSettings);
    ThemeUtils.applyTheme(savedSettings.theme);
    
    // Load transcripts from storage
    const savedTranscripts = TranscriptStorageManager.getTranscripts();
    if (savedTranscripts.length > 0) {
      setTranscriptionSegments(savedTranscripts);
      showToast(`Loaded ${savedTranscripts.length} saved transcripts`, 'info');
    }
    
    // Detect current color scheme and apply it
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initialDarkMode = mediaQuery.matches;
    setIsDarkMode(initialDarkMode);
    
    // Apply the initial light/dark mode classes
    document.documentElement.classList.remove('light-mode', 'dark-mode');
    document.documentElement.classList.add(initialDarkMode ? 'dark-mode' : 'light-mode');
    
    // Listen for system theme changes
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const newDarkMode = e.matches;
      setIsDarkMode(newDarkMode);
      
      // Update classes when system preference changes
      document.documentElement.classList.remove('light-mode', 'dark-mode');
      document.documentElement.classList.add(newDarkMode ? 'dark-mode' : 'light-mode');
      
      // Re-apply current theme to ensure proper variables
      ThemeUtils.applyTheme(savedSettings.theme);
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Save transcripts to storage whenever they change
  useEffect(() => {
    if (transcriptionSegments.length > 0) {
      TranscriptStorageManager.saveTranscripts(transcriptionSegments);
      
      // Check if storage is near limit
      if (TranscriptStorageManager.isStorageNearLimit()) {
        const storageInfo = TranscriptStorageManager.getStorageInfo();
        showToast(`Storage warning: ${storageInfo.count} transcripts (${Math.round(storageInfo.size / 1024)}KB)`, 'warning');
      }
    }
  }, [transcriptionSegments]);

  // Toggle light/dark mode
  const toggleColorScheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Update classes
    document.documentElement.classList.remove('light-mode', 'dark-mode');
    document.documentElement.classList.add(newDarkMode ? 'dark-mode' : 'light-mode');
    
    // Re-apply current theme to ensure proper variables
    ThemeUtils.applyTheme(settings.theme);
  };

  // Handle recording completion
  const handleRecordingComplete = async (recording: AudioRecording) => {
    setIsProcessing(true);
    setIsRecording(false);

    try {
      console.log('Processing recording:', {
        size: recording.blob.size,
        duration: recording.duration,
        format: recording.format,
        timestamp: recording.timestamp
      });

      // Debug: Test audio data first
      await DebugUtils.testAudioData(recording.blob, recording.format);
      
      // Convert audio to base64
      const audioBase64 = await AudioUtils.blobToBase64(recording.blob);
      console.log('Audio converted to base64, length:', audioBase64.length);

      // Test API connection first
      const apiStatus = await ApiUtils.getApiStatus();
      if (!apiStatus.connected) {
        throw new Error(`Cannot connect to server: ${apiStatus.error || 'Unknown error'}`);
      }

      // Send to backend
      const response = await ApiUtils.post<any>('/api/transcribe', {
        audio: audioBase64,
        format: recording.format,
        include_emotion: true,
      });

      if (response.success) {
        const newSegment: TranscriptionSegment = {
          id: Date.now().toString(),
          text: response.data.transcript,
          emotion: response.data.emotion,
          emoji: response.data.emotion_emoji,
          confidence: response.data.confidence,
          timestamp: new Date(),
        };

        setTranscriptionSegments(prev => {
          const updatedSegments = [...prev, newSegment];
          // Save to storage
          TranscriptStorageManager.saveTranscripts(updatedSegments);
          return updatedSegments;
        });
        
        // Track analytics
        AnalyticsUtils.trackTranscription(newSegment);
        
        // Show success message
        showToast('Transcription completed successfully!', 'success');
      } else {
        throw new Error(response.message || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      
      let errorMessage = 'Transcription failed';
      if (error instanceof Error) {
        if (error.message.includes('Cannot connect to server')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network connection issue. Please check your connection and try again.';
        } else if (error.message.includes('Request timed out')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('Audio file too large')) {
          errorMessage = 'Recording too long. Please record a shorter message.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(`Transcription failed: ${errorMessage}`, 'error');
      AnalyticsUtils.trackError(ErrorUtils.createError('TRANSCRIPTION_FAILED', errorMessage));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle recording error
  const handleRecordingError = (error: string) => {
    showToast(`Recording error: ${error}`, 'error');
    setIsRecording(false);
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
    
    // Save settings to daily storage
    ThemeStorageManager.saveSettings(newSettings);
    
    // Apply theme changes immediately
    ThemeUtils.applyTheme(newSettings.theme);
    
    showToast('Settings updated', 'success');
  };

  // Show toast message
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  // Download transcript
  const downloadTranscript = () => {
    if (transcriptionSegments.length === 0) {
      showToast('No transcript to download', 'warning');
      return;
    }

    const transcriptText = transcriptionSegments
      .map(segment => {
        const timestamp = segment.timestamp.toLocaleTimeString();
        const emotion = segment.emotion ? ` [${segment.emotion}]` : '';
        return `[${timestamp}]${emotion}: ${segment.text}`;
      })
      .join('\n\n');

    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tonebridge-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Transcript downloaded successfully!', 'success');
    AnalyticsUtils.trackEvent('transcript_downloaded', {
      segmentCount: transcriptionSegments.length,
    });
  };

  // Copy transcripts to clipboard
  const copyTranscripts = async () => {
    if (transcriptionSegments.length === 0) {
      showToast('No transcripts to copy', 'warning');
      return;
    }

    try {
      const transcriptText = transcriptionSegments
        .map(segment => {
          const timestamp = segment.timestamp.toLocaleTimeString();
          const emotion = segment.emotion ? ` [${segment.emotion}]` : '';
          return `[${timestamp}]${emotion}: ${segment.text}`;
        })
        .join('\n\n');

      await navigator.clipboard.writeText(transcriptText);
      showToast('Transcripts copied to clipboard!', 'success');
      AnalyticsUtils.trackEvent('transcripts_copied', {
        segmentCount: transcriptionSegments.length,
      });
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
      console.error('Copy to clipboard failed:', error);
    }
  };

  // Export transcripts as JSON
  const exportTranscripts = () => {
    if (transcriptionSegments.length === 0) {
      showToast('No transcripts to export', 'warning');
      return;
    }

    const jsonData = TranscriptStorageManager.exportTranscripts();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tonebridge-transcripts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Transcripts exported as JSON successfully!', 'success');
    AnalyticsUtils.trackEvent('transcripts_exported', {
      segmentCount: transcriptionSegments.length,
    });
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscriptionSegments([]);
    TranscriptStorageManager.clearTranscripts();
    showToast('Transcript cleared', 'info');
  };

  // Delete individual transcript
  const deleteTranscript = (segmentId: string) => {
    const updatedSegments = transcriptionSegments.filter(segment => segment.id !== segmentId);
    setTranscriptionSegments(updatedSegments);
    TranscriptStorageManager.saveTranscripts(updatedSegments);
    showToast('Transcript deleted', 'success');
    AnalyticsUtils.trackEvent('transcript_deleted', {
      segmentId,
    });
  };

  // Share transcript
  const shareTranscript = async () => {
    if (transcriptionSegments.length === 0) {
      showToast('No transcript to share', 'warning');
      return;
    }

    const transcriptText = transcriptionSegments
      .map(segment => {
        const emotion = segment.emoji ? `${segment.emoji} ` : '';
        return `${emotion}${segment.text}`;
      })
      .join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ToneBridge Transcript',
          text: transcriptText,
        });
        showToast('Transcript shared successfully!', 'success');
      } catch (error) {
        showToast('Failed to share transcript', 'error');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(transcriptText);
        showToast('Transcript copied to clipboard!', 'success');
      } catch (error) {
        showToast('Failed to copy transcript', 'error');
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{
          background: 'var(--ion-toolbar-background)',
          '--background': 'var(--ion-toolbar-background)',
          '--color': 'var(--ion-text-color)',
          ...(document.documentElement.classList.contains('theme-high-contrast') && 
               document.documentElement.classList.contains('dark-mode') && {
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)'
          })
        }}>
          <IonTitle style={{
            color: 'var(--ion-text-color)',
            '--color': 'var(--ion-text-color)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'var(--ion-text-color)'
            }}>
              <IonIcon icon={heartOutline} style={{ color: 'var(--ion-text-color)' }} />
              <span style={{ color: 'var(--ion-text-color)' }}>ToneBridge</span>
            </div>
          </IonTitle>
          <IonButton
            fill="clear"
            slot="end"
            onClick={toggleColorScheme}
            style={{ 
              marginRight: '0.5rem',
              color: 'var(--ion-text-color)',
              '--color': 'var(--ion-text-color)'
            }}
          >
            <IonIcon icon={isDarkMode ? moonOutline : sunnyOutline} style={{ color: 'var(--ion-text-color)' }} />
          </IonButton>
          <IonButton
            fill="clear"
            slot="end"
            onClick={() => !isProcessing && setShowSettings(!showSettings)}
            disabled={showTTS || isProcessing}
            style={{ 
              marginRight: '0.5rem',
              color: (showTTS || isProcessing) ? 'var(--ion-color-medium)' : 'var(--ion-text-color)',
              '--color': (showTTS || isProcessing) ? 'var(--ion-color-medium)' : 'var(--ion-text-color)',
              opacity: (showTTS || isProcessing) ? 0.5 : 1
            }}
          >
            <IonIcon icon={settingsOutline} style={{ color: (showTTS || isProcessing) ? 'var(--ion-color-medium)' : 'var(--ion-text-color)' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Hero Section */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          padding: '1.5rem 1rem'
        }}>
          <h1 
            style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem',
              background: 'linear-gradient(45deg, var(--ion-color-primary), var(--ion-color-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
            Hear Beyond Words
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: 'var(--ion-text-color)',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            Real-time speech-to-text with emotion detection for accessibility
          </p>
          
          {/* Main Recording Button */}
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onRecordingError={handleRecordingError}
            disabled={isProcessing}
            isProcessing={isProcessing}
            maxDuration={300}
          />
        </div>

        {/* Transcription Display */}
        {transcriptionSegments.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <h3 style={{ 
                fontSize: '1.2rem',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                Live Transcript
                <IonBadge 
                  color="primary" 
                  style={{ 
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  {transcriptionSegments.length}
                </IonBadge>
              </h3>
              <div style={{ 
                fontSize: '0.8rem',
                color: 'var(--ion-color-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>Storage: {Math.round(TranscriptStorageManager.getStorageInfo().size / 1024)}KB</span>
                {TranscriptStorageManager.isStorageNearLimit() && (
                  <IonBadge color="warning" style={{ fontSize: '0.7rem' }}>
                    Near Limit
                  </IonBadge>
                )}
              </div>
            </div>
            <TranscriptionDisplay
              segments={transcriptionSegments}
              displayMode={settings.displayMode}
              showTimestamps={true}
              showConfidence={settings.showTags}
              highlightCurrent={true}
              onSegmentClick={(segment) => {
                showToast(`Clicked: ${segment.text}`, 'info');
              }}
              onDelete={deleteTranscript}
              showDeleteButton={true}
              reducedMotion={settings.accessibility.reducedMotion}
            />
          </div>
        )}

        {/* Action Buttons */}
        {transcriptionSegments.length > 0 && (
          <div 
            className="action-buttons-container"
            style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '1rem',
              background: 'var(--ion-card-background)',
              borderRadius: '12px',
              marginTop: '1rem',
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >


            
            <IonButton
              onClick={copyTranscripts}
              disabled={isProcessing}
              color={settings.theme === 'high-contrast' && !isDarkMode ? 'dark' : 'primary'}
              fill="outline"
              size="default"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                minWidth: window.innerWidth <= 460 ? 'auto' : undefined,
                padding: window.innerWidth <= 460 ? '0.5rem' : undefined,
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              <IonIcon icon={downloadOutline} />
              <span style={{ marginLeft: '0.5rem' }}>Copy</span>
            </IonButton>

            <IonButton
              onClick={shareTranscript}
              disabled={isProcessing}
              color={settings.theme === 'high-contrast' && !isDarkMode ? 'dark' : 'warning'}
              fill="outline"
              size="default"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                minWidth: window.innerWidth <= 460 ? 'auto' : undefined,
                padding: window.innerWidth <= 460 ? '0.5rem' : undefined,
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              <IonIcon icon={shareOutline} />
              <span style={{ marginLeft: '0.5rem' }}>Share</span>
            </IonButton>

            <IonButton
              onClick={clearTranscript}
              disabled={isProcessing}
              color={settings.theme === 'high-contrast' && !isDarkMode ? 'dark' : 'danger'}
              fill="outline"
              size="default"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                minWidth: window.innerWidth <= 460 ? 'auto' : undefined,
                padding: window.innerWidth <= 460 ? '0.5rem' : undefined,
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              <IonIcon icon={trashOutline} />
              <span style={{ marginLeft: '0.5rem' }}>Clear All</span>
            </IonButton>
          </div>
        )}

        {/* Empty State */}
        {transcriptionSegments.length === 0 && !isProcessing && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem 1rem',
            color: 'var(--ion-text-color)'
          }}>
            <IonIcon 
              icon={mic} 
              size="large"
              style={{ 
                marginBottom: '1rem',
                opacity: 0.5
              }} 
            />
            <h3 style={{ marginBottom: '0.5rem' }}>Ready to Record</h3>
            <p style={{ margin: '0', fontSize: '0.9rem' }}>
              Tap the microphone button above to start your first recording
            </p>
          </div>
        )}

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={handleSettingsChange}
                          currentDisplayMode={settings.displayMode}
                onDisplayModeChange={(mode) => {
                  const newSettings = { ...settings, displayMode: mode };
                  setSettings(newSettings);
                  StorageUtils.saveSettings(newSettings);
                }}
        />

        {/* Loading overlay */}
        {isProcessing && (
          <Loading
            message="Processing audio..."
            spinner="bubbles"
          />
        )}

        {/* TTS Modal */}
        <TextToSpeech
          isOpen={showTTS}
          onClose={() => setShowTTS(false)}
        />

        {/* TTS FAB */}
        {!showSettings && !showTTS && (
          <IonFab 
            vertical="bottom" 
            horizontal="end" 
            slot="fixed"
          >
            <motion.div
              whileHover={{ scale: isProcessing ? 1 : 1.05 }}
              whileTap={{ scale: isProcessing ? 1 : 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <IonFabButton
                onClick={() => !isProcessing && setShowTTS(!showTTS)}
                disabled={isProcessing}
                color={isProcessing ? 'medium' : 'primary'}
                style={{
                  opacity: isProcessing ? 0.5 : 1
                }}
              >
                <motion.div
                  animate={{
                    scale: 1,
                    rotate: 0
                  }}
                  transition={{
                    duration: 2,
                    repeat: 0,
                    ease: "easeInOut"
                  }}
                >
                  <IonIcon size="large" icon={volumeHighOutline} />
                </motion.div>
              </IonFabButton>
            </motion.div>
          </IonFab>
        )}

        {/* Toast notifications */}
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;