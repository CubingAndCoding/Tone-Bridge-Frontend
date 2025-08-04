import React, { useState, useEffect } from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText, IonIcon } from '@ionic/react';
import { checkmarkCircle, closeCircle, warning, informationCircle } from 'ionicons/icons';

interface CompatibilityTestProps {
  onComplete?: (results: CompatibilityResults) => void;
}

interface CompatibilityResults {
  isIOS: boolean;
  isSafari: boolean;
  isSecureContext: boolean;
  hasMicrophone: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  userAgent: string;
  allTestsPassed: boolean;
}

const IOSCompatibilityTest: React.FC<CompatibilityTestProps> = ({ onComplete }) => {
  const [results, setResults] = useState<CompatibilityResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCompatibilityTest = async () => {
    setIsRunning(true);
    
    try {
      // Detect iOS Safari
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(userAgent);
      const isSecureContext = window.isSecureContext;

      // Test MediaRecorder support
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      
      // Test supported MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mp4;codecs=mp4a',
        'audio/wav',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      
      const supportedMimeTypes = mimeTypes.filter(type => 
        MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(type) : false
      );

      // Test microphone access
      let hasMicrophone = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasMicrophone = stream.getAudioTracks().length > 0;
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.log('Microphone test failed:', error);
      }

      const testResults: CompatibilityResults = {
        isIOS,
        isSafari,
        isSecureContext,
        hasMicrophone,
        hasMediaRecorder,
        supportedMimeTypes,
        userAgent,
        allTestsPassed: isSecureContext && hasMicrophone && hasMediaRecorder && supportedMimeTypes.length > 0
      };

      setResults(testResults);
      onComplete?.(testResults);
      
    } catch (error) {
      console.error('Compatibility test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run test on mount
    runCompatibilityTest();
  }, []);

  if (!results) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>iOS Compatibility Test</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText>Running compatibility tests...</IonText>
        </IonCardContent>
      </IonCard>
    );
  }

  const getStatusIcon = (passed: boolean) => {
    return passed ? checkmarkCircle : closeCircle;
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'success' : 'danger';
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={informationCircle} style={{ marginRight: '0.5rem' }} />
          iOS Compatibility Test
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div style={{ marginBottom: '1rem' }}>
          <IonText>
            <strong>Device:</strong> {results.isIOS ? 'iOS Device' : 'Other Device'}
          </IonText>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <IonIcon 
            icon={getStatusIcon(results.isSecureContext)} 
            color={getStatusColor(results.isSecureContext)}
            style={{ marginRight: '0.5rem' }}
          />
          <IonText>
            Secure Context (HTTPS/localhost): {results.isSecureContext ? 'Yes' : 'No'}
          </IonText>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <IonIcon 
            icon={getStatusIcon(results.hasMicrophone)} 
            color={getStatusColor(results.hasMicrophone)}
            style={{ marginRight: '0.5rem' }}
          />
          <IonText>
            Microphone Access: {results.hasMicrophone ? 'Available' : 'Not Available'}
          </IonText>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <IonIcon 
            icon={getStatusIcon(results.hasMediaRecorder)} 
            color={getStatusColor(results.hasMediaRecorder)}
            style={{ marginRight: '0.5rem' }}
          />
          <IonText>
            MediaRecorder Support: {results.hasMediaRecorder ? 'Available' : 'Not Available'}
          </IonText>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <IonIcon 
            icon={getStatusIcon(results.supportedMimeTypes.length > 0)} 
            color={getStatusColor(results.supportedMimeTypes.length > 0)}
            style={{ marginRight: '0.5rem' }}
          />
          <IonText>
            Supported Audio Formats: {results.supportedMimeTypes.length > 0 ? 
              results.supportedMimeTypes.join(', ') : 'None'}
          </IonText>
        </div>

        {results.isIOS && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <IonIcon icon={warning} color="warning" style={{ marginRight: '0.5rem' }} />
            <IonText color="warning">
              <strong>iOS Device Detected:</strong> Make sure you're using HTTPS or localhost for microphone access.
            </IonText>
          </div>
        )}

        {!results.allTestsPassed && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
            <IonIcon icon={closeCircle} color="danger" style={{ marginRight: '0.5rem' }} />
            <IonText color="danger">
              <strong>Issues Found:</strong> Some compatibility tests failed. Recording may not work properly.
            </IonText>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <IonButton 
            onClick={runCompatibilityTest} 
            disabled={isRunning}
            size="small"
          >
            {isRunning ? 'Testing...' : 'Re-run Tests'}
          </IonButton>
        </div>

        <details style={{ marginTop: '1rem' }}>
          <summary>Technical Details</summary>
          <pre style={{ 
            fontSize: '0.8rem', 
            backgroundColor: '#f8f9fa', 
            padding: '0.5rem', 
            borderRadius: '4px',
            overflow: 'auto',
            marginTop: '0.5rem'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      </IonCardContent>
    </IonCard>
  );
};

export default IOSCompatibilityTest; 