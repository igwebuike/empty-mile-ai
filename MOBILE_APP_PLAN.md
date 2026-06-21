# Empty Mile AI Mobile App Plan

Use the deployed React app as the shared codebase and wrap it with Capacitor for iOS App Store and Google Play.

## Recommended path

1. Finish web MVP on Render.
2. Add Capacitor.
3. Build Android and iOS shells.
4. Add native permissions for microphone, notifications, camera/doc uploads, and location.
5. Test on real devices.
6. Submit to Play Store first, then App Store.

## Commands later

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Empty Mile AI" "com.emptymileai.app" --web-dir=dist
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

## App features to prioritize

- Voice dispatch command center
- Push notifications for driver/load updates
- Document upload from phone camera
- Driver SMS fallback through Twilio
- Location sharing for dispatch
- Factoring verification and document vault

## Store assets needed

- App icon: 1024x1024
- Splash screen
- Privacy policy URL
- Terms of service URL
- Support email
- Demo account for Apple review
