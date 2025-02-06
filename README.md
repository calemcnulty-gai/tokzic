# Tokzic

A mobile video app that delivers an endless stream of dopamine-maximizing, short-form videos.

## Project Structure

This repository is organized into two main areas:

### Documentation & Planning (/root)
- `/epics` - Implementation plans and task checklists
- `PRD.md` - Product Requirements Document
- `tokzic.md` - Technical Architecture Document

### Application Code
- `/assets` - Static assets (images, fonts)
- `/src`
  - `/components` - Reusable UI components
  - `/screens` - Screen components
  - `/redux` - Redux state management
  - `/services` - Service modules and API integration
  - `/utils` - Utility functions
  - `/types` - TypeScript type definitions

## Development

### Prerequisites
- Node.js 22+
- Git
- For iOS: Mac with Xcode installed
- For Android: Android Studio with SDK installed

### Getting Started

1. Clone the repository:
```zsh
git clone https://github.com/calemcnulty-gai/tokzic.git
cd tokzic
```

2. Install dependencies:
```zsh
npm install
```

### Running on Your Device (USB Only)

This project requires USB connection for development. Wireless development or Expo Go are not supported.

#### For iOS:
1. Connect your iPhone via USB to your Mac
2. Run the development build:
```zsh
npx expo run:ios
```
3. When Xcode opens, select your connected device from the device list
4. The app will be installed on your phone

#### For Android:
1. Enable Developer Options and USB Debugging on your device
2. Connect your Android device via USB to your computer
3. Run the development build:
```zsh
npx expo run:android
```
4. The app will be installed automatically on your device

### Troubleshooting
- For iOS:
  - Ensure you have a valid Apple Developer account
  - Your device must be registered in your Apple Developer account
  - Trust your development certificate on your device
- For Android:
  - Verify USB debugging is enabled
  - Run `adb devices` to confirm your device is properly connected
  - Accept any USB debugging prompts on your device

## Contributing
- Follow the TypeScript style guide
- Write pure, composable functions
- Keep functions under 60 lines
- Maintain clear documentation