import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IonButton, IonIcon, IonText, IonSpinner } from '@ionic/react';
import { mic, stop } from 'ionicons/icons';
import { AudioRecording, RecordingState } from '../../types';
import { AudioUtils } from '../../utils';

interface AudioRecorderProps {
  onRecordingComplete: (recording: AudioRecording) => void;
  onRecordingError: (error: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  maxDuration?: number; // in seconds
  className?: string;
}

/**
 * Modern Audio Recorder Component with Single Circular Button
 * Clean, intuitive design with smooth animations
 * Enhanced iOS compatibility
 */
const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingError,
  disabled = false,
  isProcessing = false,
  maxDuration = 300, // 5 minutes default
  className = '',
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect iOS Safari
  const isIOSSafari = () => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  };

  // Get supported MIME type for iOS
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mp4;codecs=mp4a',
      'audio/wav',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    // Fallback for iOS Safari
    if (isIOSSafari()) {
      return 'audio/mp4';
    }
    
    return 'audio/webm;codecs=opus';
  };

  const startRecording = useCallback(async () => {
    try {
      // iOS Safari requires user gesture and secure context
      if (isIOSSafari() && !window.isSecureContext) {
        throw new Error('iOS Safari requires HTTPS for microphone access. Please use HTTPS or localhost.');
      }

      // Request microphone access with specific constraints for iOS
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
          // iOS Safari specific constraints
          ...(isIOSSafari() && {
            sampleRate: { ideal: 44100, min: 22050 },
            channelCount: { ideal: 1, min: 1, max: 2 }
          })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          console.log('Recording stopped, processing audio...');
          console.log('Total chunks:', audioChunksRef.current.length);
          console.log('Total size:', audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
          
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const duration = (Date.now() - startTimeRef.current) / 1000;
          
          console.log('Audio blob created:', audioBlob.size, 'bytes, duration:', duration, 'seconds');
          
          const recording: AudioRecording = {
            blob: audioBlob,
            duration,
            timestamp: new Date(),
            format: mimeType.split(';')[0].split('/')[1], // Extract format from MIME type
          };

          onRecordingComplete(recording);
          
          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
              console.log('Audio track stopped:', track.kind);
            });
            streamRef.current = null;
          }
          
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          
        } catch (error) {
          console.error('Error processing recording:', error);
          onRecordingError(`Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMessage = `Recording error: ${event.error?.message || 'Unknown error'}`;
        setRecordingState(prev => ({ ...prev, error: errorMessage }));
        onRecordingError(errorMessage);
      };

      // Start recording with smaller timeslice for better iOS compatibility
      const timeslice = isIOSSafari() ? 1000 : 100; // 1 second for iOS, 100ms for others
      mediaRecorder.start(timeslice);
      
      console.log('Recording started with timeslice:', timeslice);
      
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      });

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: (Date.now() - startTimeRef.current) / 1000,
        }));
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      
      let errorMessage = 'Failed to start recording';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Recording not supported in this browser. Please try a different browser.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Microphone access blocked. Please use HTTPS or localhost for secure access.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setRecordingState(prev => ({ ...prev, error: errorMessage }));
      onRecordingError(errorMessage);
    }
  }, [onRecordingComplete, onRecordingError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setRecordingState(prev => ({ ...prev, isRecording: false }));
    }
  }, [recordingState.isRecording]);

  const toggleRecording = useCallback(() => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recordingState.isRecording, startRecording, stopRecording]);

  // Auto-stop if max duration reached
  React.useEffect(() => {
    if (recordingState.isRecording && recordingState.duration >= maxDuration) {
      console.log('Max duration reached, stopping recording');
      stopRecording();
    }
  }, [recordingState.duration, maxDuration, stopRecording]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={`audio-recorder ${className}`} style={{ textAlign: 'center' }}>
      {/* Main Circular Recording Button */}
      <div className="recording-button-container" style={{ marginBottom: '1rem' }}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <IonButton
            onClick={toggleRecording}
            disabled={disabled || isProcessing}
            color={recordingState.isRecording ? 'danger' : isProcessing ? 'medium' : 'primary'}
            fill="solid"
            shape="round"
            size="large"
            style={{
              width: '80px',
              height: '80px',
            }}
          >
            {isProcessing ? (
              <IonSpinner name="bubbles" />
            ) : (
              <motion.div
                animate={recordingState.isRecording ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                } : {
                  scale: 1,
                  rotate: 0
                }}
                transition={{
                  duration: 2,
                  repeat: recordingState.isRecording ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <IonIcon 
                  icon={recordingState.isRecording ? stop : mic}
                  size="large"
                />
              </motion.div>
            )}
          </IonButton>
        </motion.div>
      </div>

      {/* Status Messages Container */}
      <div style={{ 
        minHeight: '1.5rem', 
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <AnimatePresence mode="wait">
          {recordingState.isRecording && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="recording-status"
            >
              <IonText color="danger">
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <motion.span 
                    style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ff4444',
                      borderRadius: '50%'
                    }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  Recording: {AudioUtils.formatDuration(recordingState.duration)}
                </p>
              </IonText>
            </motion.div>
          )}

          {recordingState.error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="recording-error"
            >
              <IonText color="danger">
                <p style={{ margin: '0', fontSize: '0.9rem' }}>
                  Error: {recordingState.error}
                </p>
              </IonText>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="processing-status"
            >
              <IonText color="primary">
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <IonSpinner name="bubbles" style={{ width: '16px', height: '16px' }} />
                  Processing transcription...
                </p>
              </IonText>
            </motion.div>
          )}

          {!recordingState.isRecording && !recordingState.error && !isProcessing && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="instructions"
            >
              <IonText color="medium">
                <p style={{ margin: '0', fontSize: '0.9rem' }}>
                  Tap to start recording
                </p>
              </IonText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AudioRecorder; 