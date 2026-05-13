# 🚀 Drift Palace: iOS Build Instructions (GitHub Method)

Since Apple's "No Team" error is blocking EAS, follow these steps to get your `.ipa` for sideloading.

### 1. Push to GitHub
If you haven't already, push your code to a **Private** GitHub repository:
```bash
git add .
git commit -m "Add GitHub Build Workflow"
git push origin implementation-v1-dev
```

### 2. Run the GitHub Action
1. Go to your repository on **GitHub.com**.
2. Click the **Actions** tab at the top.
3. On the left, select **"Build iOS IPA (Unsigned)"**.
4. Click the **Run workflow** button on the right.

### 3. Download the .ipa
1. The build takes ~20 minutes. Wait for the green checkmark.
2. Click on the completed build.
3. Scroll down to **Artifacts** and download **`drift-palace-ios-ipa`**.

### 4. Sideload
1. Open the downloaded file (unzip it if necessary to get the `.ipa`).
2. Open **Sideloadly**.
3. Drag the `.ipa` into Sideloadly and install it to your iPhone!

---

# 🤖 Drift Palace: Android Build Instructions (Standalone APK)

The reason your previous build asked for `npx expo start` is because it was a **Development Build**. To get a standalone APK that works without a computer, you need a **Preview** or **Production** build.

### Method 1: Using EAS Cloud (Recommended)
This is the easiest way and doesn't require Android Studio on your PC.

1. **Install EAS CLI** (if you haven't):
   ```bash
   npm install -g eas-cli
   ```
2. **Login to Expo**:
   ```bash
   eas login
   ```
3. **Run the Build**:
   ```bash
   eas build -p android --profile preview
   ```
   *Note: The `preview` profile is already configured in your `eas.json` to produce an `.apk` file instead of an `.aab`.*

4. **Download**:
   Once the build finishes (takes ~10-15 mins), EAS will give you a link to download the `.apk` directly to your phone.

### Method 2: GitHub Action (Easiest & Free)
Since you're already using GitHub for iOS, I've added an Android workflow too.

1. **Push your code** to GitHub.
2. Go to the **Actions** tab.
3. Select **"Build Android APK"** on the left.
4. Click **Run workflow**.
5. Once finished (~10 mins), download the **`drift-android-apk`** artifact.

### Method 3: Local Build (Requires Android Studio)
If you have Android Studio and the Android SDK installed and want to build locally:
```bash
npx expo run:android --variant release
```

---

### Phase 7: Kinetic Studio (Next Step)
Once the build is running, let Antigravity know so we can start building the **Kinetic Studio**!
