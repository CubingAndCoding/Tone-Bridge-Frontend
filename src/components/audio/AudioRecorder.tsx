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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        
        const recording: AudioRecording = {
          blob: audioBlob,
          duration,
          timestamp: new Date(),
          format: 'webm',
        };

        onRecordingComplete(recording);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };

      mediaRecorder.start();
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setRecordingState(prev => ({ ...prev, error: errorMessage }));
      onRecordingError(errorMessage);
    }
  }, [onRecordingComplete, onRecordingError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
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
      stopRecording();
    }
  }, [recordingState.duration, maxDuration, stopRecording]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
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

          {!recordingState.isRecording && !recordingState.error && (
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