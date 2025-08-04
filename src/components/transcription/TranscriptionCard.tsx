import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IonCard, IonCardContent, IonBadge, IonText, IonIcon } from '@ionic/react';
import { timeOutline, trashOutline } from 'ionicons/icons';
import { TranscriptionSegment, DisplayMode } from '../../types';
import { FormatUtils } from '../../utils';

interface TranscriptionCardProps {
  segment: TranscriptionSegment;
  displayMode: DisplayMode;
  showTimestamps?: boolean;
  showConfidence?: boolean;
  highlightCurrent?: boolean;
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  onDelete?: (segmentId: string) => void;
  showDeleteButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
  reducedMotion?: boolean;
}

const TranscriptionCard: React.FC<TranscriptionCardProps> = ({
  segment,
  displayMode,
  showTimestamps = true,
  showConfidence = true,
  highlightCurrent = false,
  onSegmentClick,
  onDelete,
  showDeleteButton = false,
  className = '',
  style = {},
  reducedMotion = false,
}) => {
  const [isSliding, setIsSliding] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showDeleteButton || !onDelete) return;
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;
    
    // Only allow sliding to the left (negative deltaX)
    if (deltaX < 0) {
      const newOffset = Math.max(deltaX, -80); // Max slide distance
      setSlideOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If slid more than 60px, trigger delete
    if (slideOffset < -60) {
      setIsSliding(true);
      setTimeout(() => {
        onDelete?.(segment.id);
        setIsSliding(false);
        setSlideOffset(0);
      }, 300);
    } else {
      // Snap back
      setSlideOffset(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showDeleteButton || !onDelete) return;
    startX.current = e.clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentX.current = e.clientX;
    const deltaX = currentX.current - startX.current;
    
    // Only allow sliding to the left (negative deltaX)
    if (deltaX < 0) {
      const newOffset = Math.max(deltaX, -80); // Max slide distance
      setSlideOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If slid more than 60px, trigger delete
    if (slideOffset < -60) {
      setIsSliding(true);
      setTimeout(() => {
        onDelete?.(segment.id);
        setIsSliding(false);
        setSlideOffset(0);
      }, 300);
    } else {
      // Snap back
      setSlideOffset(0);
    }
  };

  const handleClick = () => {
    if (onSegmentClick && !isDragging) {
      onSegmentClick(segment);
    }
  };
  const renderEmotionDisplay = () => {
    if (!segment.emotion) return null;

    switch (displayMode.id) {
      case 'emoji-only':
        return segment.emoji ? (
          <span style={{ fontSize: 'calc(var(--app-font-size, 1rem) * 1.5)' }}>
            {segment.emoji}
          </span>
        ) : null;

      case 'tag-only':
        return segment.emotion ? (
          <IonBadge 
            color="secondary" 
            style={{ 
              fontSize: 'calc(var(--app-font-size, 1rem) * 0.8)',
              fontWeight: 'bold',
              padding: '0.25rem 0.5rem'
            }}
          >
            {FormatUtils.capitalizeFirst(segment.emotion)}
          </IonBadge>
        ) : null;

      case 'combined':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {segment.emoji && (
              <span style={{ fontSize: 'calc(var(--app-font-size, 1rem) * 1.5)' }}>
                {segment.emoji}
              </span>
            )}
            {segment.emotion && (
              <IonBadge 
                color="secondary"
                style={{ 
                  fontSize: 'calc(var(--app-font-size, 1rem) * 0.8)',
                  fontWeight: 'bold',
                  padding: '0.25rem 0.5rem'
                }}
              >
                {FormatUtils.capitalizeFirst(segment.emotion)}
              </IonBadge>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderConfidence = () => {
    if (!showConfidence) return null;

    // Custom colors for better visibility in light mode
    const getConfidenceStyle = () => {
      // Check if we're in high contrast theme
      const isHighContrast = document.documentElement.classList.contains('theme-high-contrast');
      const isDarkMode = document.documentElement.classList.contains('dark-mode');
      
      if (isHighContrast) {
        // High contrast theme: use black/white
        if (isDarkMode) {
          return {
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #ffffff'
          };
        } else {
          return {
            background: '#000000',
            color: '#ffffff',
            border: '1px solid #000000'
          };
        }
      } else {
        // Regular themes: use color-coded confidence
        if (segment.confidence > 0.8) {
          return {
            background: '#10b981',
            color: '#ffffff',
            border: '1px solid #059669'
          };
        } else if (segment.confidence > 0.6) {
          return {
            background: '#f59e0b',
            color: '#ffffff',
            border: '1px solid #d97706'
          };
        } else {
          return {
            background: '#ef4444',
            color: '#ffffff',
            border: '1px solid #dc2626'
          };
        }
      }
    };

    return (
      <div 
        style={{ 
          fontSize: 'calc(var(--app-font-size, 1rem) * 0.75)',
          padding: '0.2rem 0.4rem',
          fontWeight: 'bold',
          borderRadius: '4px',
          display: 'inline-block',
          ...getConfidenceStyle()
        }}
      >
        {FormatUtils.formatConfidence(segment.confidence)}
      </div>
    );
  };

  const renderTimestamp = () => {
    if (!showTimestamps) return null;

    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.25rem',
        fontSize: 'calc(var(--app-font-size, 1rem) * 0.75)',
        color: 'var(--ion-color-medium)'
      }}>
        <IonIcon icon={timeOutline} style={{ fontSize: 'calc(var(--app-font-size, 1rem) * 0.8)' }} />
        {FormatUtils.formatTimestamp(new Date(segment.timestamp))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isSliding ? -100 : 0 }}
      transition={{ delay: reducedMotion ? 0 : 0.2, duration: reducedMotion ? 0.01 : 0.3 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        margin: '0.5rem 0',
        borderRadius: '12px',
        ...style
      }}
      ref={cardRef}
    >
      {/* Delete Background */}
      {showDeleteButton && onDelete && (
        <motion.div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            borderRadius: '0 12px 12px 0'
          }}
          animate={{
            x: slideOffset > -60 ? 0 : 0
          }}
          transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
        >
          <IonIcon 
            icon={trashOutline} 
            style={{ 
              color: 'var(--ion-color-danger)',
              fontSize: '1.5rem'
            }} 
          />
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{
          position: 'relative',
          zIndex: 2,
          cursor: onSegmentClick ? 'pointer' : 'default',
          userSelect: 'none',
          touchAction: 'pan-y'
        }}
      >
        <IonCard
          style={{
            margin: 0,
            transition: 'all 0.2s ease',
            border: highlightCurrent ? '3px solid var(--ion-color-primary) !important' : '1px solid var(--ion-color-primary) !important',
            borderRadius: '12px',
            boxShadow: highlightCurrent
              ? '0 8px 12px rgba(var(--ion-color-primary-rgb), 0.2)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            background: 'var(--ion-card-background)',
            transform: `translateX(${slideOffset}px)`,
            ...style
          }}
          className={'transcription-segment ' + className}
        >
        <IonCardContent style={{ padding: '1rem' }}>
          {/* Header: Emotion and Confidence */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.2, duration: reducedMotion ? 0.01 : 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--ion-color-light-shade)'
            }}
          >
            {/* Left: Emotion Display */}
            <motion.div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: reducedMotion ? 0 : 0.2,
                duration: reducedMotion ? 0.01 : 0.3
              }}
            >
              {renderEmotionDisplay()}
            </motion.div>
            
            {/* Right: Confidence and Timestamp */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              minWidth: 'fit-content'
            }}>
              <div className="confidence-timestamp-container">
                {renderConfidence()}
                {renderTimestamp()}
              </div>
              
              {/* Perfect Confidence Indicator */}
              <AnimatePresence>
                {segment.confidence === 1 && (
                  <motion.span 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      type: reducedMotion ? "tween" : "spring",
                      stiffness: reducedMotion ? 0 : 500,
                      damping: reducedMotion ? 0 : 30,
                      delay: reducedMotion ? 0 : 0.5
                    }}
                    style={{ 
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>


            </div>
          </motion.div>
          
          {/* Main Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.3, duration: reducedMotion ? 0.01 : 0.3 }}
          >
            <IonText>
              <p style={{ 
                margin: 0, 
                fontSize: 'var(--app-font-size, 1rem)',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                color: 'var(--ion-text-color)',
                fontWeight: '500'
              }}>
                {segment.text}
              </p>
            </IonText>
          </motion.div>
        </IonCardContent>
      </IonCard>
      </motion.div>
    </motion.div>
  );
};

export default TranscriptionCard; 