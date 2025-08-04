import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/react';
import { ModalProps } from '../../types';

/**
 * Reusable Modal Component
 * Following DRY principles by providing a consistent modal interface
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: '300px', height: '200px' };
      case 'large':
        return { width: '90vw', height: '80vh' };
      default:
        return { width: '600px', height: '400px' };
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            Close
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent style={getSize()}>{children}</IonContent>
    </IonModal>
  );
};

export default Modal; 