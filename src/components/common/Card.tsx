import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/react';
import { CardProps } from '../../types';

/**
 * Reusable Card Component
 * Following DRY principles by providing a consistent card interface
 */
const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerColor,
  className = '',
}) => {
  return (
    <IonCard className={className}>
      {(title || subtitle) && (
        <IonCardHeader style={{ backgroundColor: headerColor }}>
          {title && <IonCardTitle>{title}</IonCardTitle>}
          {subtitle && <IonCardSubtitle>{subtitle}</IonCardSubtitle>}
        </IonCardHeader>
      )}
      <IonCardContent>{children}</IonCardContent>
    </IonCard>
  );
};

export default Card; 