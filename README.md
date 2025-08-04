# ToneBridge Frontend

Real-time speech-to-text with emotion detection for accessibility - Frontend Application

## 🚀 Features

- **Real-time Audio Recording**: Capture audio with pause/resume functionality
- **Live Transcription**: Real-time speech-to-text conversion
- **Emotion Detection**: Visual emotion annotations with emojis and tags
- **Accessibility-First**: High contrast, dyslexia-friendly fonts, reduced motion
- **Multiple Display Modes**: Combined, emoji-only, or tag-only views
- **Export & Share**: Download transcripts and share results
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Themes**: System theme support with manual override

## 🏗️ Architecture

### **DRY Principles Applied**

The frontend follows **Don't Repeat Yourself** principles through:

1. **Centralized Types**: All TypeScript interfaces in `src/types/index.ts`
2. **Reusable Utilities**: Common functions in `src/utils/index.ts`
3. **Component Library**: Shared UI components in `src/components/common/`
4. **Consistent Patterns**: Standardized API calls, error handling, and state management

### **Directory Structure**

```
frontend/src/
├── types/                    # Centralized TypeScript definitions
│   └── index.ts             # All app types and interfaces
├── utils/                    # Reusable utility functions
│   └── index.ts             # API, audio, storage, error utilities
├── components/               # Reusable UI components
│   ├── common/              # Shared components (Button, Card, etc.)
│   ├── audio/               # Audio-specific components
│   ├── transcription/       # Transcription display components
│   └── settings/            # Settings and configuration components
├── pages/                   # Application pages
│   └── Home.tsx            # Main application page
└── theme/                   # Styling and theming
    └── variables.css        # CSS custom properties
```

### **Key Components**

#### **Common Components** (`src/components/common/`)
- `Button.tsx` - Reusable button with consistent styling
- `Card.tsx` - Content container with optional header
- `Loading.tsx` - Loading spinner with customizable messages
- `Toast.tsx` - Notification system for user feedback
- `Modal.tsx` - Reusable modal dialogs

#### **Specialized Components**
- `AudioRecorder.tsx` - Microphone recording with pause/resume
- `TranscriptionDisplay.tsx` - Live transcription with emotion annotations
- `SettingsPanel.tsx` - User preferences and accessibility settings

#### **Utility Classes** (`src/utils/index.ts`)
- `ApiUtils` - Centralized API communication
- `AudioUtils` - Audio processing and validation
- `StorageUtils` - Local storage management
- `ErrorUtils` - Error handling and formatting
- `FormatUtils` - Text and data formatting
- `ValidationUtils` - Input validation
- `AccessibilityUtils` - Screen reader and accessibility features
- `AnalyticsUtils` - Event tracking and analytics
- `ThemeUtils` - Theme management and color utilities

## 📋 Requirements

- Node.js 16+
- npm or yarn
- Modern browser with WebRTC support

## 🛠️ Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### **Environment Variables**

Create a `.env` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Analytics (optional)
REACT_APP_ANALYTICS_ID=your-analytics-id

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_OFFLINE_MODE=false
```

### **Backend Connection**

Ensure the ToneBridge backend is running on the configured URL (default: `http://localhost:5000`).

## 🎯 Usage

### **Basic Workflow**

1. **Start Recording**: Click the microphone button to begin recording
2. **Speak Clearly**: The app will transcribe your speech in real-time
3. **View Emotions**: See emotion annotations (emojis/tags) alongside text
4. **Switch Modes**: Toggle between combined, emoji-only, or tag-only display
5. **Export Results**: Download or share your transcript

### **Accessibility Features**

- **High Contrast Mode**: Enhanced visibility for low vision users
- **Dyslexia-Friendly Fonts**: OpenDyslexic font option
- **Reduced Motion**: Respects user's motion preferences
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Keyboard Navigation**: Full keyboard accessibility

### **Display Modes**

- **Combined**: Shows both emojis and emotion tags
- **Emoji Only**: Visual emotion indicators only
- **Tag Only**: Text-based emotion labels only

## 🧪 Testing

### **Unit Tests**
```bash
npm run test.unit
```

### **E2E Tests**
```bash
npm run test.e2e
```

### **Linting**
```bash
npm run lint
```

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
```

### **Netlify**
```bash
npm run build
# Upload dist/ folder to Netlify
```

### **Static Hosting**
```bash
npm run build
# Upload dist/ folder to any static hosting service
```

## 🔄 API Integration

The frontend communicates with the ToneBridge backend through:

### **Endpoints Used**
- `POST /api/transcribe` - Audio transcription with emotion detection
- `POST /api/emotion` - Text-based emotion analysis
- `GET /api/models` - Available model information
- `GET /health` - Backend health check

### **Request Format**
```typescript
// Audio transcription
{
  audio: "base64_encoded_audio_data",
  format: "webm",
  include_emotion: true
}
```

### **Response Format**
```typescript
{
  success: true,
  data: {
    transcript: "Hello, how are you?",
    confidence: 0.95,
    emotion: "happy",
    emotion_emoji: "😊",
    emotion_confidence: 0.87
  }
}
```

## 🎨 Customization

### **Theming**
Modify `src/theme/variables.css` to customize colors, fonts, and spacing.

### **Adding New Components**
1. Create component in appropriate directory
2. Add TypeScript interfaces to `src/types/index.ts`
3. Export from component index file
4. Follow existing patterns for consistency

### **Extending Functionality**
- **New Audio Formats**: Add to `AudioUtils.validateAudioFile()`
- **Additional Emotions**: Update emotion mapping in backend
- **Custom Display Modes**: Extend `DisplayMode` interface
- **Analytics Events**: Add to `AnalyticsUtils.trackEvent()`

## 🔧 Development

### **Adding New Features**

1. **Define Types**: Add interfaces to `src/types/index.ts`
2. **Create Utilities**: Add helper functions to `src/utils/index.ts`
3. **Build Components**: Create reusable components in `src/components/`
4. **Update Pages**: Integrate new features into pages
5. **Test Thoroughly**: Add unit and integration tests

### **Code Style**

- **TypeScript**: Strict typing throughout
- **Functional Components**: Use React hooks for state management
- **DRY Principle**: Avoid code duplication
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimize for real-time processing

## 🐛 Troubleshooting

### **Common Issues**

1. **Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS in production
   - Test with different browsers

2. **API Connection Failed**
   - Verify backend is running
   - Check CORS configuration
   - Validate API URL in environment

3. **Audio Recording Issues**
   - Test with different audio formats
   - Check browser WebRTC support
   - Verify microphone permissions

### **Debug Mode**

Enable debug logging:
```typescript
// In browser console
localStorage.setItem('tonebridge_debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow DRY principles
4. Add comprehensive tests
5. Ensure accessibility compliance
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review the backend documentation
- Open an issue on GitHub
- Contact the development team

---

**ToneBridge Frontend** - Making communication more accessible through emotion-aware transcription. 