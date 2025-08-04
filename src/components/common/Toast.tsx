import React from 'react';
import { IonToast } from '@ionic/react';
import { ToastProps } from '../../types';

/**
 * Reusable Toast Component
 * Following DRY principles by providing a consistent toast interface
 */
const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // Only show toast if there's actually a message
    if (message && message.trim() !== '') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [message]);

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  };

  // Don't render anything if no message
  if (!message || message.trim() === '') {
    return null;
  }

  return (
    <IonToast
      isOpen={isOpen}
      onDidDismiss={() => setIsOpen(false)}
      message={message}
      duration={duration}
      position={position}
      color={getColor()}
      buttons={[
        {
          text: '✕',
          role: 'cancel',
        },
      ]}
    />
  );
};

export default Toast; 