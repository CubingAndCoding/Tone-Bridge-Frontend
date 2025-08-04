import React from 'react';
import { IonButton } from '@ionic/react';
import { ButtonProps } from '../../types';

/**
 * Reusable Button Component
 * Following DRY principles by providing a consistent button interface
 */
const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  color = 'primary',
  size = 'default',
  expand,
  fill = 'solid',
  shape,
  className = '',
}) => {
  return (
    <IonButton
      onClick={onClick}
      disabled={disabled}
      color={color}
      size={size}
      expand={expand}
      fill={fill}
      shape={shape}
      className={className}
    >
      {children}
    </IonButton>
  );
};

export default Button; 