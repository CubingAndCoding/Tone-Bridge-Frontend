import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { motion } from 'framer-motion';
import { colorPaletteOutline } from 'ionicons/icons';

export interface ThemeOption {
  id: 'light' | 'dark' | 'system' | 'modern-blue' | 'warm-sunset' | 'forest-green' | 'ocean-depth' | 'neutral-gray' | 'high-contrast';
  name: string;
  description: string;
  className: string;
  previewColors: string[];
}

const themeOptions: ThemeOption[] = [
  {
    id: 'modern-blue' as const,
    name: 'Modern Blue',
    description: 'Professional and clean blue theme',
    className: 'theme-modern-blue',
    previewColors: ['#2563eb', '#64748b', '#0ea5e9', '#10b981']
  },
  {
    id: 'warm-sunset' as const,
    name: 'Warm Sunset',
    description: 'Vibrant orange and purple gradient',
    className: 'theme-warm-sunset',
    previewColors: ['#f97316', '#8b5cf6', '#ec4899', '#10b981']
  },
  {
    id: 'forest-green' as const,
    name: 'Forest Green',
    description: 'Natural and calming green tones',
    className: 'theme-forest-green',
    previewColors: ['#059669', '#65a30d', '#0891b2', '#16a34a']
  },
  {
    id: 'ocean-depth' as const,
    name: 'Ocean Depth',
    description: 'Deep blue and teal palette',
    className: 'theme-ocean-depth',
    previewColors: ['#0891b2', '#6366f1', '#8b5cf6', '#059669']
  },
  {
    id: 'neutral-gray' as const,
    name: 'Neutral Gray',
    description: 'Minimal and sophisticated grays',
    className: 'theme-neutral-gray',
    previewColors: ['#6b7280', '#9ca3af', '#d1d5db', '#10b981']
  },
  {
    id: 'high-contrast' as const,
    name: 'High Contrast',
    description: 'Maximum accessibility with pure black and white',
    className: 'theme-high-contrast',
    previewColors: ['#000000', '#ffffff', '#000000', '#ffffff']
  }
];

interface ThemeSelectorProps {
  currentTheme: 'light' | 'dark' | 'system' | 'modern-blue' | 'warm-sunset' | 'forest-green' | 'ocean-depth' | 'neutral-gray' | 'high-contrast';
  onThemeChange: (themeId: 'light' | 'dark' | 'system' | 'modern-blue' | 'warm-sunset' | 'forest-green' | 'ocean-depth' | 'neutral-gray' | 'high-contrast') => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  currentTheme, 
  onThemeChange 
}) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ 
        marginBottom: '1rem', 
        fontSize: '1.1rem',
        fontWeight: '600',
        color: 'var(--ion-text-color)'
      }}>
        <IonIcon 
          icon={colorPaletteOutline} 
          style={{ 
            marginRight: '0.5rem',
            verticalAlign: 'middle'
          }} 
        />
        Theme Selection
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        width: '100%',
        alignItems: 'center'
      }}>
        {themeOptions.map((theme, index) => (
          <IonButton
            key={theme.id}
            fill={currentTheme === theme.id ? 'solid' : 'outline'}
            className={`theme-selector-button ${currentTheme === theme.id ? 'selected' : ''}`}
            style={{
              width: '95%',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center',
              height: 'auto',
              padding: '0.5rem',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: '500',
              overflow: 'hidden',
              '--background': currentTheme === theme.id 
                ? 'var(--ion-color-primary)' 
                : 'transparent',
              '--color': currentTheme === theme.id 
                ? 'var(--ion-color-primary-contrast)'
                : 'var(--ion-color-primary)',
            }}
            onClick={() => onThemeChange(theme.id)}
          >
              <div style={{ 
                width: '100%',
                textAlign: 'center'
              }}>
                {/* Theme Preview */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  justifyContent: 'center'
                }}>
                  {theme.previewColors.map((color, colorIndex) => (
                    <motion.div
                      key={colorIndex}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: color,
                        border: '2px solid var(' + (currentTheme === theme.id 
                          ? '--ion-color-light-shade'
                          : '--ion-color-primary') + ', var(--ion-color-light-shade))'
                      }}
                      whileHover={{ scale: 1.5 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    />
                  ))}
                </div>
                
                {/* Theme Info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  alignItems: 'center'
                }}>
                  <div style={{ 
                    fontSize: '1rem',
                    fontWeight: '600',
                    marginBottom: '0.25rem',
                    color: 'inherit'
                  }}>
                    {theme.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem',
                    opacity: 0.8,
                    color: 'inherit'
                  }}>
                    {theme.description}
                  </div>
                </div>
              </div>
            </IonButton>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector; 