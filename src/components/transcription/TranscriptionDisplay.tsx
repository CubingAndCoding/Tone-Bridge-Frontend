import React from 'react';
import { TranscriptionSegment, DisplayMode } from '../../types';
import TranscriptionCard from './TranscriptionCard';

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
  displayMode: DisplayMode;
  showTimestamps?: boolean;
  showConfidence?: boolean;
  highlightCurrent?: boolean;
  onSegmentClick?: (segment: TranscriptionSegment) => void;
  onDelete?: (segmentId: string) => void;
  showDeleteButton?: boolean;
  className?: string;
  reducedMotion?: boolean;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  segments,
  displayMode,
  showTimestamps = true,
  showConfidence = false,
  highlightCurrent = false,
  onSegmentClick,
  onDelete,
  showDeleteButton = false,
  className = '',
  reducedMotion = false,
}) => {
  if (segments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-text-color)' }}>
        <p>No transcription available yet. Start recording to see live captions!</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {segments.slice().reverse().map((segment, index) => (
        <TranscriptionCard
          key={segment.id}
          segment={segment}
          displayMode={displayMode}
          showTimestamps={showTimestamps}
          showConfidence={showConfidence}
          highlightCurrent={highlightCurrent && segment === segments[segments.length - 1]}
          onSegmentClick={onSegmentClick}
          onDelete={onDelete}
          showDeleteButton={showDeleteButton}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
};

export default TranscriptionDisplay; 