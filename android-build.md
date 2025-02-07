# Android Build Setup Checklist for Tokzic

## Prerequisites
- [ ] Node.js installed and available in PATH
- [ ] Android Studio installed
- [ ] Android SDK installed
- [ ] At least one Android Virtual Device (AVD) created
- [ ] Java Development Kit (JDK) 17 or newer installed

## Configuration Files Setup

### 1. Local Properties (`android/local.properties`)
- [ ] Verify Android SDK path is correct
- [ ] Add Node.js path:
```properties
sdk.dir=/path/to/your/Android/sdk
nodejs.dir=/path/to/your/nodejs/installation
```

### 2. Gradle Settings (`android/settings.gradle`)
- [ ] Verify `pluginManagement` block is at the top of the file
- [ ] Ensure correct React Native path resolution:
```gradle
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}

apply from: new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "../scripts/autolinking.gradle")
apply from: new File(["node", "--print", "require.resolve('@react-native/gradle-plugin/package.json')"].execute(null, rootDir).text.trim(), "../build.gradle")
```

### 3. Gradle Properties (`android/gradle.properties`)
- [ ] Verify the following properties are set:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
android.enableJetifier=true
newArchEnabled=false
hermesEnabled=true
```

### 4. SDK Versions (`android/build.gradle`)
- [ ] Add or verify SDK versions in root `build.gradle`:
```gradle
buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33
        ndkVersion = "25.1.8937393"
    }
}
```

## Build Process

### 1. Clean Build
```bash
cd android
./gradlew clean
```

### 2. Verify Dependencies
- [ ] Run `yarn install` or `npm install` in project root
- [ ] Verify all native dependencies are properly linked
- [ ] Check for any missing peer dependencies

### 3. Gradle Sync
- [ ] Open project in Android Studio
- [ ] Click "Sync Project with Gradle Files"
- [ ] Resolve any sync issues that appear in the Event Log

### 4. Build Debug Version
```bash
# From project root
expo run:android

# Or from android directory
./gradlew assembleDebug
```

## Common Issues and Solutions

### Node.js Path Issues
- [ ] Verify Node.js is in system PATH
- [ ] Check `local.properties` has correct nodejs.dir
- [ ] Ensure Node.js version matches project requirements

### Gradle Sync Failures
- [ ] Check Android Studio Event Log for specific errors
- [ ] Verify all repositories are accessible
- [ ] Ensure Gradle version in `gradle-wrapper.properties` is compatible

### Build Failures
- [ ] Check for missing Android SDK components
- [ ] Verify NDK version matches project requirements
- [ ] Ensure all native modules are properly linked

## Testing

### 1. Emulator Setup
- [ ] Create Android Virtual Device if not exists:
  - Android Studio > Tools > Device Manager > Create Virtual Device
- [ ] Select a device definition (e.g., Pixel 6)
- [ ] Choose system image (API level matching targetSdkVersion)
- [ ] Configure AVD options (memory, storage)

### 2. Run Application
- [ ] Start Android emulator
- [ ] Run application:
```bash
expo run:android
```
- [ ] Verify app launches successfully
- [ ] Test basic functionality
- [ ] Check for any runtime errors in logcat

## Maintenance Notes

- Keep track of any changes made to build configuration files
- Document any custom modifications needed for specific features
- Note any workarounds implemented for build issues
- Keep a log of successful build configurations

## Troubleshooting Commands

```bash
# View detailed build info
./gradlew assembleDebug --info

# View build dependencies
./gradlew app:dependencies

# Check for lint issues
./gradlew lint

# Clean project and rebuild
./gradlew clean assembleDebug
``` 