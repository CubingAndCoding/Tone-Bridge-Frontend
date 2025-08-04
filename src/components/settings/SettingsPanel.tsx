import React, { useState, useEffect, useRef } from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonText,
  IonIcon,
  IonButton,
  IonItemDivider,
  IonCard,
  IonCardContent,
  IonAlert,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/react';
import {
  settingsOutline,
  accessibilityOutline,
  colorPaletteOutline,
  textOutline,
  eyeOutline,
  speedometerOutline,
  closeOutline,
  sunnyOutline,
  moonOutline,
} from 'ionicons/icons';
import { UserSettings, DisplayMode, TranscriptionSegment } from '../../types';
import { StorageUtils, ThemeUtils, TranscriptStorageManager } from '../../utils';
import { Button } from '../common';
import ThemeSelector from './ThemeSelector';
import TranscriptionCard from '../transcription/TranscriptionCard';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: UserSettings) => void;
  currentDisplayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  className?: string;
}

/**
 * Modal Settings Panel Component
 * Clean, modern modal design with smooth animations
 */
const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
  currentDisplayMode,
  onDisplayModeChange,
  className = '',
}) => {
  const modal = useRef<HTMLIonModalElement>(null);
  const [presentingElement, setPresentingElement] = useState<HTMLElement | null>(null);
  const [settings, setSettings] = useState<UserSettings>(StorageUtils.getSettings());
  const [supportsHover, setSupportsHover] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Set presenting element for card modal
  useEffect(() => {
    setPresentingElement(document.querySelector('ion-router-outlet') || document.body);
  }, []);

  // Set initial toolbar background and detect hover support
  useEffect(() => {
    const toolbar = document.querySelector('ion-toolbar');
    if (!toolbar) return;
    
    // Set initial toolbar background
    toolbar.style.setProperty('--background', 'var(--ion-toolbar-background, var(--ion-color-dark))', 'important');
    toolbar.style.setProperty('background', 'var(--ion-toolbar-background, var(--ion-color-dark))', 'important');
    
    // Check if device supports hover
    const mediaQuery = window.matchMedia('(hover: hover)');
    setSupportsHover(mediaQuery.matches);
    
    const handleHoverChange = (e: MediaQueryListEvent) => {
      setSupportsHover(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleHoverChange);
    return () => mediaQuery.removeEventListener('change', handleHoverChange);
  }, []);

  // Apply font size and accessibility settings on component mount
  React.useEffect(() => {
    ThemeUtils.applyFontSize(settings.fontSize);
    applyAccessibilitySettings(settings.accessibility);
  }, [settings.fontSize, settings.accessibility]);

  // Prevent body scrolling and adjust navbar z-index when modal is open
  React.useEffect(() => {
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

  const applyAccessibilitySettings = (accessibility: UserSettings['accessibility']) => {
    // Apply reduced motion
    if (accessibility.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
      document.body.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
      document.body.classList.remove('reduced-motion');
    }
    
    // Apply dyslexia-friendly font
    if (accessibility.dyslexiaFriendly) {
      document.documentElement.classList.add('dyslexia-friendly');
      document.body.classList.add('dyslexia-friendly');
    } else {
      document.documentElement.classList.remove('dyslexia-friendly');
      document.body.classList.remove('dyslexia-friendly');
    }
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    StorageUtils.saveSettings(updatedSettings);
    onSettingsChange(updatedSettings);
    
    // Only apply theme changes immediately if theme actually changed
    if (newSettings.theme && newSettings.theme !== settings.theme) {
      ThemeUtils.applyTheme(newSettings.theme);
    }
    
    // Apply accessibility settings immediately
    if (newSettings.accessibility) {
      applyAccessibilitySettings(newSettings.accessibility);
    }
  };

  const resetSettings = () => {
    const defaultSettings: UserSettings = {
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
    setSettings(defaultSettings);
    StorageUtils.saveSettings(defaultSettings);
    onSettingsChange(defaultSettings);
    
    // Apply the default theme and accessibility settings immediately
    ThemeUtils.applyTheme(defaultSettings.theme);
    ThemeUtils.applyFontSize(defaultSettings.fontSize);
    applyAccessibilitySettings(defaultSettings.accessibility);
    
    setShowResetConfirm(false);
  };



  const setFontSize = (value: 'small' | 'medium' | 'large' | number | { lower: number; upper: number }) => {
    let fontSize: 'small' | 'medium' | 'large';
    
    if (typeof value === 'string') {
      fontSize = value;
    } else {
      const numericValue = typeof value === 'number' ? value : value.lower;
      fontSize = numericValue === 0 ? 'small' : numericValue === 2 ? 'large' : 'medium';
    }
    
    // Only apply font size directly, don't update settings state
    ThemeUtils.applyFontSize(fontSize);
    
    // Update settings in background without triggering callbacks
    const updatedSettings = { ...settings, fontSize };
    StorageUtils.saveSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  // Download transcripts function
  const downloadTranscripts = () => {
    const transcripts = TranscriptStorageManager.getTranscripts();
    if (transcripts.length === 0) {
      // Show alert or toast that there are no transcripts
      return;
    }

    const transcriptText = transcripts
      .map((segment: TranscriptionSegment) => {
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
            Settings
          </IonTitle>
              <IonButton
                fill="clear"
                size="small"
                slot="end"
                onClick={onClose}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          
          <IonContent style={{
            padding: '1.5rem',
            '--padding-start': '1.5rem',
            '--padding-end': '1.5rem',
            '--padding-top': '1.5rem',
            '--padding-bottom': '1.5rem',
            position: 'relative'
          }}>
            <div style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              {/* Scrollable Content */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '1rem 1.5rem', 
                paddingLeft: '2rem', 
                paddingRight: '2rem',
                paddingBottom: '120px', // Add space for fixed preview card
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                <IonList style={{ background: 'transparent' }}>
                {/* Display Mode Settings */}
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      marginBottom: '0.5rem', 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--ion-text-color)'
                    }}>
                      <IonIcon 
                        icon={textOutline} 
                        style={{ 
                          marginRight: '0.5rem',
                          verticalAlign: 'middle'
                        }} 
                      />
                      Display Style
                    </h3>
                    <p style={{
                      margin: '0 0 1rem 0',
                      fontSize: '0.9rem',
                      color: 'var(--ion-text-color)'
                    }}>
                      Choose how emotions appear in your transcriptions
                    </p>

                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                             {displayModes.map((mode, index) => (
                                                   <IonButton
                            key={mode.id}
                            fill={currentDisplayMode.id === mode.id ? 'solid' : 'outline'}
                            color="primary"
                            className={`display-mode-button ${currentDisplayMode.id === mode.id ? 'selected' : ''}`}
                            onClick={() => onDisplayModeChange(mode)}
                                                          style={{
                                width: '95%',
                                height: 'auto',
                                padding: '0.2rem',
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: '500',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2rem',
                                textAlign: 'left',
                                minHeight: '48px',
                                position: 'relative',
                                '--border-radius': '12px',
                                '--padding-start': '0.75rem',
                                '--padding-end': '0.75rem',
                                '--padding-top': '0.75rem',
                                '--padding-bottom': '0.75rem'
                              }}
                          >
                          <span 
                            key={`${mode.id}`}
                            style={{ 
                              fontSize: '1.2rem',
                              minWidth: '24px',
                              textAlign: 'center'
                            }}
                          >
                            {mode.id === 'combined' ? '😊' : mode.id === 'emoji-only' ? '😄' : '🏷️'}
                          </span>
                          <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                            <div style={{ 
                                fontWeight: '500', 
                                marginBottom: '0.25rem',
                                color: currentDisplayMode.id === mode.id 
                                  ? 'var(--ion-color-primary-contrast)'
                                  : 'var(--ion-color-primary)'
                              }}>
                              {mode.name}
                            </div>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: currentDisplayMode.id === mode.id 
                                ? 'var(--ion-color-primary-contrast)'
                                : 'var(--ion-color-primary)',
                              lineHeight: '1.3'
                            }}>
                              {mode.description}
                            </div>
                          </div>
                          <div style={{ 
                            width: '24px', 
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {currentDisplayMode.id === mode.id && (
                              <span 
                                style={{ 
                                  color: 'var(--ion-color-primary-contrast)',
                                  fontSize: '1.2rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          </IonButton>
                      ))}
                    </div>
                  </div>
                </div>

                                 {/* Theme Settings */}
                 <div>
                   <ThemeSelector
                     currentTheme={settings.theme}
                     onThemeChange={(themeId) => updateSettings({ theme: themeId })}
                   />
                   
                   {/* Enhanced Dark Mode Toggle */}
                   <div style={{ marginTop: '1.5rem' }}>
                     <h3 style={{ 
                       marginBottom: '1rem', 
                       fontSize: '1.1rem',
                       fontWeight: '600',
                       color: 'var(--ion-text-color)',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.5rem'
                     }}>
                       <IonIcon icon={moonOutline} style={{ fontSize: '1.1rem' }} />
                       Appearance
                     </h3>
                     
                     {/* Modern Toggle with Description */}
                     <div style={{
                       background: 'var(--ion-item-background)',
                       borderRadius: '12px',
                       padding: '1rem',
                       border: '1px solid var(--ion-border-color)',
                       marginBottom: '0.5rem'
                     }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                         <div style={{ flex: 1 }}>
                           <div style={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: '0.75rem',
                             marginBottom: '0.25rem'
                           }}>
                             <IonIcon 
                               icon={document.documentElement.classList.contains('dark-mode') ? moonOutline : sunnyOutline} 
                               style={{ 
                                 fontSize: '1.2rem',
                                 color: document.documentElement.classList.contains('dark-mode') ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)'
                               }} 
                             />
                             <span style={{ 
                               fontWeight: '500',
                               color: 'var(--ion-text-color)'
                             }}>
                               {document.documentElement.classList.contains('dark-mode') ? 'Dark Mode' : 'Light Mode'}
                             </span>
                           </div>
                           <div style={{ 
                             fontSize: '0.85rem',
                             color: 'var(--ion-color-medium)',
                             marginLeft: '1.95rem'
                           }}>
                             {document.documentElement.classList.contains('dark-mode') 
                               ? 'Easier on the eyes in low light' 
                               : 'Clean and bright interface'
                             }
                           </div>
                         </div>
                         <IonToggle
                           checked={document.documentElement.classList.contains('dark-mode')}
                           onIonChange={(e) => {
                             if (e.detail.checked) {
                               document.documentElement.classList.add('dark-mode');
                             } else {
                               document.documentElement.classList.remove('dark-mode');
                             }
                             // Re-apply current theme to ensure proper variables
                             ThemeUtils.applyTheme(settings.theme);
                           }}
                           style={{
                             '--handle-width': '20px',
                             '--handle-height': '20px',
                             '--handle-box-shadow': '0 2px 4px rgba(0,0,0,0.2)',
                             '--background': 'var(--ion-color-medium)',
                             '--background-checked': 'var(--ion-color-primary)',
                             '--handle-background': 'var(--ion-color-light)',
                             '--handle-background-checked': 'var(--ion-color-light)',
                           }}
                         />
                       </div>
                     </div>
                     
                     {/* Quick Preview */}
                     <div style={{
                       display: 'flex',
                       gap: '0.5rem',
                       marginTop: '0.5rem',
                       justifyContent: 'center'
                     }}>
                       <div style={{
                         width: '20px',
                         height: '20px',
                         borderRadius: '50%',
                         background: 'var(--ion-color-light)',
                         border: '2px solid var(--ion-color-medium)',
                         cursor: 'pointer',
                         transition: 'all 0.2s ease',
                         opacity: document.documentElement.classList.contains('dark-mode') ? 0.3 : 1
                       }}
                       onClick={() => {
                         document.documentElement.classList.remove('dark-mode');
                         ThemeUtils.applyTheme(settings.theme);
                       }}
                       title="Light Mode"
                       />
                       <div style={{
                         width: '20px',
                         height: '20px',
                         borderRadius: '50%',
                         background: 'var(--ion-color-dark)',
                         border: '2px solid var(--ion-color-medium)',
                         cursor: 'pointer',
                         transition: 'all 0.2s ease',
                         opacity: document.documentElement.classList.contains('dark-mode') ? 1 : 0.3
                       }}
                       onClick={() => {
                         document.documentElement.classList.add('dark-mode');
                         ThemeUtils.applyTheme(settings.theme);
                       }}
                       title="Dark Mode"
                       />
                     </div>
                   </div>
                 </div>

                                 {/* Display Settings */}
                 <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      marginBottom: '0.5rem', 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--ion-text-color)'
                    }}>
                      <IonIcon 
                        icon={eyeOutline} 
                        style={{ 
                          marginRight: '0.5rem',
                          verticalAlign: 'middle'
                        }} 
                      />
                      Display Options
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ 
                        marginBottom: '0.5rem', 
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: 'var(--ion-text-color)'
                      }}>
                        <IonIcon 
                          icon={textOutline} 
                          style={{ 
                            marginRight: '0.5rem',
                            verticalAlign: 'middle'
                          }} 
                        />
                        Font Size
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                        {[
                          { value: 'small', name: 'Small Text', icon: 'Aa' },
                          { value: 'medium', name: 'Medium Text', icon: 'Aa' },
                          { value: 'large', name: 'Large Text', icon: 'Aa' }
                        ].map((option, index) => (
                          <IonButton
                            key={option.value}
                            fill={settings.fontSize === option.value ? 'solid' : 'outline'}
                            color="primary"
                                                        className={`font-size-button ${settings.fontSize === option.value ? 'selected' : ''}`}
                            onClick={() => {
                              setFontSize(option.value as 'small' | 'medium' | 'large');
                            }}
                                                                                       style={{
                                width: '95%',
                                height: 'auto',
                                padding: '0.2rem',
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: '500',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2rem',
                                textAlign: 'left',
                                minHeight: '48px',
                                position: 'relative',
                                '--border-radius': '12px',
                                '--padding-start': '0.75rem',
                                '--padding-end': '0.75rem',
                                '--padding-top': '0.75rem',
                                '--padding-bottom': '0.75rem'
                              }}
                          >
                            <span 
                              style={{ 
                                fontSize: option.value === 'small' ? '1rem' : 
                                         option.value === 'medium' ? '1.2rem' : '1.4rem',
                                minWidth: '24px',
                                textAlign: 'center',
                                color: settings.fontSize === option.value 
                                  ? 'var(--ion-color-primary-contrast)'
                                  : 'var(--ion-color-primary)'
                              }}
                            >
                              {option.icon}
                            </span>
                            <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                              <div style={{ 
                                fontWeight: '500', 
                                color: settings.fontSize === option.value 
                                  ? 'var(--ion-color-primary-contrast)'
                                  : 'var(--ion-color-primary)'
                              }}>
                                {option.name}
                              </div>
                            </div>
                            <div style={{ 
                              width: '24px', 
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {settings.fontSize === option.value && (
                                <span 
                                  style={{ 
                                    color: 'var(--ion-color-primary-contrast)',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                          </IonButton>
                        ))}
                      </div>
                    </div>

                    <IonItem style={{ '--background': 'transparent' }}>
                      <IonLabel>Auto-save Transcripts</IonLabel>
                      <IonToggle
                        checked={settings.autoSave}
                        onIonChange={(e) => updateSettings({ autoSave: e.detail.checked })}
                        slot="end"
                      />
                    </IonItem>
                  </div>
                </div>

                                 {/* Accessibility Settings */}
                 <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      marginBottom: '0.5rem', 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--ion-text-color)'
                    }}>
                      <IonIcon 
                        icon={accessibilityOutline} 
                        style={{ 
                          marginRight: '0.5rem',
                          verticalAlign: 'middle'
                        }} 
                      />
                      Accessibility
                    </h3>



                    <IonItem style={{ '--background': 'transparent' }}>
                      <IonLabel>Reduced Motion</IonLabel>
                      <IonToggle
                        checked={settings.accessibility.reducedMotion}
                        onIonChange={(e) => updateSettings({
                          accessibility: { ...settings.accessibility, reducedMotion: e.detail.checked }
                        })}
                        slot="end"
                      />
                    </IonItem>

                    <IonItem style={{ '--background': 'transparent' }}>
                      <IonLabel>Dyslexia-friendly Font</IonLabel>
                      <IonToggle
                        checked={settings.accessibility.dyslexiaFriendly}
                        onIonChange={(e) => updateSettings({
                          accessibility: { ...settings.accessibility, dyslexiaFriendly: e.detail.checked }
                        })}
                        slot="end"
                      />
                    </IonItem>
                  </div>
                </div>



                                 {/* Download Button */}
                 <div>
                  <div style={{ padding: '0 1rem', marginTop: '1rem' }}>
                    <IonButton
                      onClick={downloadTranscripts}
                      fill="outline"
                      expand="block"
                      style={{
                        color: 'var(--ion-color-success) !important',
                        '--border-color': 'var(--ion-color-success)',
                      }}
                    >
                      Download Transcripts
                    </IonButton>
                  </div>
                </div>

                                 {/* Reset Button */}
                 <div>
                  <div style={{ padding: '0 1rem', marginTop: '1rem' }}>
                    <IonButton
                      onClick={() => setShowResetConfirm(true)}
                      fill="outline"
                      expand="block"
                      style={{
                        color: 'var(--ion-color-warning)',
                        '--border-color': 'var(--ion-color-warning)',
                      }}
                    >
                      Reset to Defaults
                    </IonButton>
                  </div>
                </div>
              </IonList>
            </div>
          </div>

          {/* Live Preview Footer - Fixed Position */}
          <div className="preview-transcript">
            {/* Sample Transcript Card - Using Reusable Component */}
            <TranscriptionCard
              segment={{
                id: 'sample-1',
                text: "Hey! I hope you like the look!",
                emotion: 'happy',
                emoji: '😊',
                confidence: 0.9,
                timestamp: new Date()
              }}
              displayMode={currentDisplayMode}
              showTimestamps={true}
              showConfidence={true}
              highlightCurrent={true}
              reducedMotion={settings.accessibility.reducedMotion}
            />
          </div>

          {/* Reset Confirmation Alert */}
          <IonAlert
                  isOpen={showResetConfirm}
                  onDidDismiss={() => setShowResetConfirm(false)}
                  header="Reset Settings"
                  message="Are you sure you want to reset all settings to their default values? This action cannot be undone."
                  buttons={[
                    {
                      text: 'Cancel',
                      role: 'cancel',
                      cssClass: 'alert-button-cancel'
                    },
                    {
                      text: 'Reset',
                      role: 'destructive',
                      cssClass: 'alert-button-confirm',
                      handler: resetSettings
                    }
                  ]}
                />
          </IonContent>
        </IonModal>
      );
    };

    export default SettingsPanel; 