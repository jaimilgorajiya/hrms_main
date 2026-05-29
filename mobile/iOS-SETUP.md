# HRMS iOS App Setup Guide

The HRMS mobile app is built with **Expo + React Native**, which means the same codebase runs on both Android and iOS. iOS support has been fully configured — follow the steps below to build and run on iOS.

---

## What Was Added for iOS

1. **`app.json`** — Added `ios` block with:
   - Bundle ID: `com.hrms.employee`
   - `GoogleService-Info.plist` reference for Firebase
   - Required `NSLocationWhenInUseUsageDescription` and other `infoPlist` permissions
   - `supportsTablet: false` (phone-only)

2. **`eas.json`** — Added iOS build profiles:
   - `preview` — builds for iOS Simulator
   - `preview-device` — builds for real device (Ad Hoc distribution)
   - `production` — App Store build

3. **`GoogleService-Info.plist`** — Template created. **You must replace it** with the real file from Firebase Console (see Step 1 below).

---

## Step 1: Add iOS App to Firebase

    1. Go to [Firebase Console](https://console.firebase.google.com) → Project **hrms-32680**
    2. Click **Project Settings** → **Your Apps** → **Add App** → **iOS**
    3. Enter Bundle ID: `com.hrms.employee`
    4. Download the generated `GoogleService-Info.plist`
    5. Replace the placeholder file at:
       ```
       /HRMS/android/GoogleService-Info.plist
       ```

---

## Step 2: Run on iOS Simulator (Development)

Make sure you have Xcode installed (macOS only).

```bash
cd /Users/maulikvadhavaniya/Desktop/HRMS/android

# Install dependencies (if not already done)
npm install

# Start the dev server
npx expo start

# Press 'i' in the terminal to open iOS Simulator
# OR run directly:
npx expo run:ios
```

> **Note:** `npx expo run:ios` requires Xcode and will build a native iOS app locally.

---

## Step 3: Build with EAS (Recommended for Distribution)

EAS Build handles all native compilation in the cloud — no Xcode required for cloud builds.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account
eas login

# Build for iOS Simulator (no Apple Developer account needed)
eas build --platform ios --profile preview

# Build for real device / TestFlight (requires Apple Developer account)
eas build --platform ios --profile preview-device

# Production App Store build
eas build --platform ios --profile production
```

---

## Step 4: Apple Developer Account (for Real Device / App Store)

To run on a real iPhone or submit to the App Store, you need:

1. An **Apple Developer Account** ($99/year) at [developer.apple.com](https://developer.apple.com)
2. During `eas build`, EAS will prompt you to log in and will automatically:
   - Create an App ID for `com.hrms.employee`
   - Generate provisioning profiles and certificates
   - Handle code signing

---

## Step 5: Push Notifications (Optional)

If you want push notifications on iOS:

1. In Apple Developer Portal → Certificates → Create an **APNs Key** (.p8 file)
2. Upload it to Firebase Console → Project Settings → Cloud Messaging → iOS App Configuration
3. EAS will handle the rest during build

---

## iOS-Specific Features Already Handled

| Feature | Status |
|---|---|
| Tab bar blur effect (iOS native) | ✅ Already implemented with `expo-blur` |
| `KeyboardAvoidingView` behavior | ✅ Uses `Platform.OS === 'ios' ? 'padding' : 'height'` |
| Safe area insets | ✅ Uses `react-native-safe-area-context` |
| Firebase Phone Auth (OTP) | ✅ `@react-native-firebase/auth` works on iOS natively |
| GPS / Location | ✅ `expo-location` works on iOS |
| Haptic feedback | ✅ `expo-haptics` works on iOS |
| Secure storage | ✅ `expo-secure-store` uses iOS Keychain |
| Offline punch queue | ✅ AsyncStorage works on iOS |

---

## Troubleshooting

**"GoogleService-Info.plist not found"**
→ Replace the placeholder plist with the real one from Firebase Console.

**"Bundle ID mismatch"**
→ Ensure the Bundle ID in `app.json` (`com.hrms.employee`) matches what you registered in Firebase and Apple Developer Portal.

**"Firebase OTP not working on iOS"**
→ Make sure you've added the iOS app in Firebase Console and downloaded the correct `GoogleService-Info.plist`. Also ensure APNs is configured for production OTP delivery.

**Build fails with "No Apple credentials"**
→ Run `eas credentials` to set up your Apple Developer account credentials.
