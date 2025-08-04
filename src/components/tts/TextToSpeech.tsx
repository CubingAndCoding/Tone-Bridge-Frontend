import React, { useState, useRef, useEffect } from 'react';
import {
  IonButton,
  IonIcon,
  IonTextarea,
  IonRange,
  IonLabel,
  IonItem,
  IonFabButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItemGroup,
  IonChip,
  IonBadge,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import { 
  playOutline, 
  pauseOutline, 
  stopOutline, 
  volumeHighOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline
} from 'ionicons/icons';
import { VoiceOption, TTSRequest, TTSResponse } from '../../types';
import { ApiUtils } from '../../utils';

interface TextToSpeechProps {
  isOpen: boolean;
  onClose: () => void;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ isOpen, onClose }) => {
  const modal = useRef<HTMLIonModalElement>(null);
  const [presentingElement, setPresentingElement] = useState<HTMLElement | null>(null);
  
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);

  // Set presenting element for card modal
  useEffect(() => {
    setPresentingElement(document.querySelector('ion-router-outlet') || document.body);
  }, []);

  // Prevent body scrolling and adjust navbar z-index when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Lower the navbar z-index so it appears behind the backdrop
      const header = document.querySelector('ion-header');
      if (header) {
        header.style.zIndex = '1';
      }
    } else {
      document.body.style.overflow = '';
      // Restore the navbar z-index
      const header = document.querySelector('ion-header');
      if (header) {
        header.style.zIndex = '';
      }
    }

    return () => {
      document.body.style.overflow = '';
      // Ensure navbar z-index is restored when component unmounts
      const header = document.querySelector('ion-header');
      if (header) {
        header.style.zIndex = '';
      }
    };
  }, [isOpen]);

  // Load available voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const professionalVoices = voices
          .filter(voice => voice.lang.startsWith('en'))
          .filter(voice => {
            const voiceName = voice.name.toLowerCase();
            // Block novelty voices but allow professional ones
            const isNovelty = voiceName.includes('funny') || 
                             voiceName.includes('joke') || 
                             voiceName.includes('cartoon') ||
                             voiceName.includes('robot') ||
                             voiceName.includes('alien') ||
                             voiceName.includes('monster') ||
                             voiceName.includes('baby') ||
                             voiceName.includes('child') ||
                             voiceName.includes('whisper') ||
                             voiceName.includes('singing') ||
                             voiceName.includes('echo') ||
                             voiceName.includes('chorus') ||
                             voiceName.includes('rocko') ||
                             voiceName.includes('shelley') ||
                             voiceName.includes('grandma') ||
                             voiceName.includes('grandpa') ||
                             voiceName.includes('flo') ||
                             voiceName.includes('eddy') ||
                             voiceName.includes('reed') ||
                             voiceName.includes('sandy') ||
                             voiceName.includes('bahh') ||
                             voiceName.includes('albert') ||
                             voiceName.includes('jester') ||
                             voiceName.includes('organ') ||
                             voiceName.includes('cellos') ||
                             voiceName.includes('zarvox') ||
                             voiceName.includes('bells') ||
                             voiceName.includes('trinoids') ||
                             voiceName.includes('boing') ||
                             voiceName.includes('good news') ||
                             voiceName.includes('wobble') ||
                             voiceName.includes('bad news') ||
                             voiceName.includes('bubbles') ||
                             voiceName.includes('tessa');
            
            // Allow all voices except novelty ones
            return !isNovelty;
          })
          .map((voice) => {
            const voiceName = voice.name.toLowerCase();
            let gender: 'female' | 'male' | 'neutral' = 'neutral';
            
            // Professional gender detection based on voice name patterns
            if (voiceName.includes('female') || voiceName.includes('woman') || voiceName.includes('zira') || voiceName.includes('samantha') || voiceName.includes('victoria')) {
              gender = 'female';
            } else if (voiceName.includes('male') || voiceName.includes('man') || voiceName.includes('david') || voiceName.includes('alex') || voiceName.includes('daniel')) {
              gender = 'male';
            }

            // Create professional description based on actual voice characteristics
            let description = '';
            if (voiceName.includes('google')) {
              description = `Google's high-quality ${voice.lang} voice`;
            } else if (voiceName.includes('microsoft')) {
              description = `Microsoft's professional ${voice.lang} voice`;
            } else if (voiceName.includes('apple') || voiceName.includes('siri')) {
              description = `Apple's natural ${voice.lang} voice`;
            } else if (voiceName.includes('amazon') || voiceName.includes('alexa')) {
              description = `Amazon's clear ${voice.lang} voice`;
            } else {
              description = `Professional ${voice.lang} voice`;
            }

            return {
              id: voice.name,
              name: voice.name,
              language: voice.lang,
              gender,
              description
            };
          })
          // Remove duplicates based on voice name
          .filter((voice, index, self) => 
            index === self.findIndex(v => v.name === voice.name)
          );

        setVoiceOptions(professionalVoices);
        
        // Set default voice if none selected
        if (!selectedVoice && professionalVoices.length > 0) {
          setSelectedVoice(professionalVoices[0].id);
        }
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also load voices when they become available (some browsers load them asynchronously)
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  const handleTextToSpeech = async () => {
    if (!text.trim()) return;

    setIsProcessing(true);
    try {
      // Check if speech synthesis is supported
      if (!window.speechSynthesis) {
        throw new Error('Speech synthesis not supported in this browser');
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text.trim());
      
      // Set voice if available
      const voices = window.speechSynthesis.getVoices();
      const selectedVoiceObj = voices.find(v => v.name === selectedVoice);
      
      if (selectedVoiceObj) {
        utterance.voice = selectedVoiceObj;
      }

      // Set speech parameters
      utterance.rate = speed;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Set event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsProcessing(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsProcessing(false);
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS Error:', error);
      setIsProcessing(false);
    }
  };

  // Function to preview a specific voice
  const previewVoice = (voiceId: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const voiceObj = voices.find(v => v.name === voiceId);
    
    if (voiceObj) {
      const utterance = new SpeechSynthesisUtterance("This is a preview of this voice for accessibility purposes.");
      utterance.voice = voiceObj;
      utterance.rate = speed;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      utterance.onend = () => {
        // Voice preview completed
      };
      
      utterance.onerror = (event) => {
        console.error('Voice preview error:', event);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePlay = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

      return (
        <IonModal
          isOpen={isOpen}
          onDidDismiss={onClose}
          presentingElement={presentingElement!}
          style={{
            '--height': '85vh',
            '--width': '500px',
            '--max-width': '500px',
            '--border-radius': '16px',
            '--box-shadow': '0 8px 32px rgba(0, 0, 0, 0.5)',
            '--backdrop-opacity': '0.7'
          }}
        >
          <IonHeader>
            <IonToolbar style={{
              '--background': 'var(--ion-background-color)',
              '--color': 'var(--ion-text-color)',
              borderBottom: '1px solid var(--ion-color-light-shade)',
              padding: '1rem 1.5rem'
            }}>
              <IonTitle style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--ion-text-color)'
              }}>
                Text to Speech (Beta)
              </IonTitle>
              <IonButton
                fill="clear"
                size="small"
                slot="end"
                onClick={onClose}
                style={{
                  '--padding-start': '8px',
                  '--padding-end': '8px',
                  minWidth: 'auto',
                  height: '40px',
                  width: '40px',
                  borderRadius: '50%',
                  background: 'var(--ion-color-light)',
                  color: 'var(--ion-color-medium)'
                }}
              >
                <IonIcon icon={closeOutline} size="small" />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          
          <IonContent style={{
            padding: '1.5rem',
            '--padding-start': '1.5rem',
            '--padding-end': '1.5rem',
            '--padding-top': '1.5rem',
            '--padding-bottom': '1.5rem',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{ padding: '0.5rem' }}>
              {/* Beta Testing Notice */}
              <div
                style={{
                  background: 'var(--ion-color-primary-tint)',
                  color: 'var(--ion-color-primary-contrast)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  fontSize: '0.9rem',
                  border: '1px solid var(--ion-color-primary-shade)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center'
                }}
              >
                <IonIcon 
                  icon={volumeHighOutline} 
                  style={{ 
                    fontSize: '1.5rem',
                    marginBottom: '8px',
                    display: 'block',
                    margin: '0 auto 8px auto'
                  }} 
                />
                <div>
                  <strong style={{ display: 'block', marginBottom: '6px', fontSize: '1rem' }}>
                    Beta Testing
                  </strong>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Voice options may vary by device. Deaf users may need family/friends to help choose a suitable voice.
                  </div>
                </div>
              </div>

          {/* Text input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '0.5rem', 
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--ion-text-color)'
            }}>
              Text to Convert
            </h3>
            <IonItem style={{ 
              background: 'transparent',
              '--border-color': 'var(--ion-color-light-shade)',
              '--border-radius': '8px',
              '--padding-start': '0',
              '--padding-end': '0',
              '--inner-padding-start': '0',
              '--inner-padding-end': '0',
              margin: '0',
              borderRadius: '8px'
            }}>
              <IonTextarea
                value={text}
                onIonInput={(e) => setText(e.detail.value || '')}
                placeholder="Enter text to convert to speech..."
                rows={4}
                style={{ 
                  fontSize: '1rem',
                  '--border-radius': '8px',
                  '--border-color': 'var(--ion-color-medium)',
                  '--border-style': 'solid',
                  '--border-width': '1px',
                  '--padding-start': '12px',
                  '--padding-end': '12px',
                  '--padding-top': '12px',
                  '--padding-bottom': '12px'
                }}
              />
            </IonItem>
          </div>

          {/* Convert to Speech Button - Moved to top for accessibility */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <IonButton
              color="primary"
              onClick={handleTextToSpeech}
              disabled={!text.trim() || isProcessing}
              style={{ flex: 1 }}
            >
              {isProcessing ? 'Processing...' : 'Convert to Speech'}
            </IonButton>
          </div>

          {/* Volume control */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '0.5rem', 
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--ion-text-color)'
            }}>
              Volume
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem'
            }}>
              <IonRange
                value={volume}
                onIonInput={(e) => setVolume(e.detail.value as number)}
                min={0}
                max={1}
                step={0.1}
                style={{ flex: 1 }}
              />
              <span style={{ 
                minWidth: '3rem',
                textAlign: 'center',
                color: 'var(--ion-text-color)'
              }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Voice selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--ion-text-color)'
            }}>
              Voice Selection
            </h3>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.75rem',
              width: '100%',
              alignItems: 'center'
            }}>
              {voiceOptions.map((voice) => (
                <div
                  key={voice.id}
                  style={{
                    width: '95%',
                    position: 'relative',
                    margin: '0 auto'
                  }}
                >
                  <IonButton
                    fill={selectedVoice === voice.id ? 'solid' : 'outline'}
                    color={selectedVoice === voice.id ? 'primary' : 'primary'}
                    style={{
                      width: '100%',
                      height: 'auto',
                      padding: '0.2rem',
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: '500',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '--border-radius': '12px',
                    }}
                    onClick={() => setSelectedVoice(voice.id)}
                  >
                    <div style={{ 
                      width: '100%',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                      }}>
                        {voice.name}
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem',
                        opacity: 0.8
                      }}>
                        {voice.language} • {voice.gender}
                        {voice.gender === 'neutral' && (
                          <span style={{ 
                            fontSize: '0.7rem',
                            opacity: 0.6,
                            marginLeft: '0.25rem'
                          }}>
                            (auto-detected)
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        marginTop: '0.25rem'
                      }}>
                        {voice.description}
                      </div>
                    </div>
                  </IonButton>
                  
                                      {/* Preview button - positioned as a floating action button */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)',
                        zIndex: 10,
                        transition: 'all 0.2s ease',
                        background: 'var(--ion-color-success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice.id);
                      }}
                      title="Preview this voice"
                    >
                      <IonIcon 
                        icon={playOutline} 
                        style={{ 
                          fontSize: '14px',
                          color: 'var(--ion-color-success-contrast)'
                        }} 
                      />
                    </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h3 style={{ 
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--ion-text-color)'
              }}>
                Advanced Settings
              </h3>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                style={{ 
                  color: 'var(--ion-color-primary)',
                  padding: '0.5rem'
                }}
              >
                <IonIcon 
                  icon={showAdvancedSettings ? chevronUpOutline : chevronDownOutline}
                  style={{ fontSize: '1rem' }}
                />
              </IonButton>
            </div>
            
            {showAdvancedSettings && (
              <div
                style={{
                  overflow: 'hidden',
                  border: '1px solid var(--ion-border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: 'var(--ion-color-light-shade)',
                  marginTop: '0.5rem'
                }}
              >
                {/* Speed control */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                      Speed
                    </IonLabel>
                    <span style={{ 
                      color: 'var(--ion-text-color)',
                      fontSize: '0.875rem'
                    }}>
                      {speed}x
                    </span>
                  </div>
                  <IonRange
                    value={speed}
                    onIonInput={(e) => setSpeed(e.detail.value as number)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Pitch control */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <IonLabel style={{ color: 'var(--ion-text-color)' }}>
                      Pitch
                    </IonLabel>
                    <span style={{ 
                      color: 'var(--ion-text-color)',
                      fontSize: '0.875rem'
                    }}>
                      {pitch}x
                    </span>
                  </div>
                  <IonRange
                    value={pitch}
                    onIonInput={(e) => setPitch(e.detail.value as number)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Audio controls */}
          {audioUrl && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              {isPlaying ? (
                <IonButton
                  color="warning"
                  onClick={handlePause}
                  style={{ flex: 1 }}
                >
                  <IonIcon icon={pauseOutline} slot="start" />
                  Pause
                </IonButton>
              ) : (
                <IonButton
                  color="success"
                  onClick={handlePlay}
                  style={{ flex: 1 }}
                >
                  <IonIcon icon={playOutline} slot="start" />
                  Play
                </IonButton>
              )}
              <IonButton
                color="danger"
                onClick={handleStop}
                style={{ flex: 1 }}
              >
                <IonIcon icon={stopOutline} slot="start" />
                Stop
              </IonButton>
            </div>
          )}
            </div>
          </IonContent>
        </IonModal>
      );
    };

    export default TextToSpeech; 