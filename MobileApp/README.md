# One Nation, One Athlete — Android

A native Kotlin Android app connected to the same Express API and MongoDB/local data store as the React website. This is an Android application with native screens and controls, not a WebView wrapper.

## Run

1. Open **this `MobileApp` folder** in Android Studio. Let Gradle sync using Android Studio's embedded JDK. The existing project uses AGP 9.3.3, Gradle 9.5 and SDK 37; minimum Android version is 7.0 / API 24.
2. Start the backend from the repository root:

   ```powershell
   npm start --prefix backend
   ```

3. Run the `app` configuration on an emulator or Android phone.
4. On the welcome screen, open **Connection settings**:
   - Android Studio emulator: `http://10.0.2.2:4000` (the default).
   - Physical phone: `http://YOUR_COMPUTER_LAN_IP:4000`. Connect both devices to the same network and allow the backend port through your firewall.
   - Hosted backend: use its HTTPS origin, without `/api` or a trailing path.
5. Register, sign in using your website account, or choose **Explore the demo**. The demo creates isolated sample records in the shared backend.

The native app never connects directly to Atlas. Configure Atlas in `../backend/.env` exactly as for the website. Without Atlas credentials, the existing backend uses persistent local storage.

For web pose-analysis links during development, also run `npm run dev --prefix frontend`. The debug app maps the local API's port 4000 to Vite's port 5173. A production backend serves the built React app on its own origin.

## Build and install

```powershell
./gradlew.bat :app:assembleDebug :app:lintDebug
```

Install `app/build/outputs/apk/debug/app-debug.apk`. Debug builds permit HTTP for local development. Release builds require HTTPS and need your own release signing configuration before distribution. Do not distribute the debug APK as a production release.

## Native features

- Editorial ivory, charcoal and track-orange UI, custom vector navigation, track graphics, an athlete-photo welcome screen and native performance charts.
- Registration, login, isolated demo workspaces, persistent sessions and logout.
- Dashboard populated from the shared backend, including personal progress, best result and wellbeing indicators.
- Create, read, edit and delete training sessions, achievements, recovery records and expenses.
- Generate resource-aware weekly plans, rename/delete plans and toggle individual days complete.
- Opportunity matching with eligibility reasons, interest registration and withdrawal. Illustrative listings remain labelled.
- Athlete passport, milestone timeline, profile editing, classification and granular sharing preferences.
- Native file picker for MP4/WebM clips, PDF certificates and JPEG/PNG images, authenticated uploads and video playback, file rename/notes/delete, and certificate links on achievements.
- Existing pose-analysis results are displayed in the native library. **Running MediaPipe analysis opens the website** and requires a separate browser login. Native pose inference and native video compression are not implemented.
- Career goal entry, personal data export through Android's document picker and account deletion.
- Cached athlete data and an offline queue for **new training sessions only**. Other mutations require connectivity. Queued sessions use idempotency keys to avoid duplicates when a response is lost.
- Automatic retry when connectivity returns while the activity is open, plus refresh/startup sync. No background worker runs after the app is closed.
- Android Keystore AES-GCM encryption for cookies, cached records and the queue. Pending records and snapshots are scoped to both server and account. Passwords are never persisted. Switching servers signs out before making requests to the new server.
- Native controls, accessibility labels, scrollable forms and system-inset handling. The interface currently uses English.

Coach verification, organiser publishing, fairness dashboards and the complete specialist workflows remain available through the linked web workspace. Planner, matching and scoring use the backend's explainable rules; the app does not represent them as trained predictive models. Recovery flags are not diagnoses, and return-to-play requires recorded professional clearance.

## Source map

| File | Responsibility |
| --- | --- |
| `MainActivity.kt` | Activity lifecycle, navigation, authentication state and asynchronous requests |
| `AthleteDesign.kt` | Reusable native UI elements, palette, vector icons and chart drawing |
| `AthleteScreens.kt` | Dashboard, training, opportunities, passport, finance, recovery and performance |
| `AthleteForms.kt` | Validated editing forms, date pickers, consent, connection settings and export |
| `AthleteMedia.kt` | File picker, upload library and authenticated video playback |
| `AthleteApi.kt` | HTTP client, encrypted storage, cache and idempotent offline queue |

## Verification

With the backend running and an emulator connected:

```powershell
./gradlew.bat :app:connectedDebugAndroidTest
```

`AthleteAppTest` exercises native screen navigation and training CRUD, form validation, encrypted queue retries, multipart uploads and achievement attachments. Tests create their own demo accounts. Successful tests delete those accounts. Test screenshots are written to the app's external files directory; Gradle may uninstall the app after connected tests, so run instrumentation directly when retaining screenshots is useful.

The `artifacts` folder contains actual emulator captures when generated during development. A real phone may differ in typography, system controls, keyboard and supported video codecs.
