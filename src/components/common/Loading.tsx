import React from 'react';
import { IonSpinner, IonText } from '@ionic/react';
import { LoadingProps } from '../../types';

/**
 * Reusable Loading Component
 * Following DRY principles by providing a consistent loading interface
 */
const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  spinner = 'bubbles',
  duration,
}) => {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (!show) return null;

  return (
    <div className="loading-container" style={{ textAlign: 'center', padding: '2rem' }}>
      <IonSpinner name={spinner} />
      <IonText>
        <p>{message}</p>
      </IonText>
    </div>
  );
};

export default Loading; 