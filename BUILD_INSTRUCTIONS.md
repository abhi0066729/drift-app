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

### Phase 7: Kinetic Studio (Next Step)
Once the build is running, let Antigravity know so we can start building the **Kinetic Studio**!
