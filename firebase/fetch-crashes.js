const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'service-account.json');

async function main() {
  if (!fs.existsSync(keyPath)) {
    console.log('❌ service-account.json not found.');
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  const projectId = serviceAccount.project_id;

  console.log(`✅ Project: ${projectId}\n`);

  const { Logging } = require('@google-cloud/logging');
  const logging = new Logging({ projectId, credentials: serviceAccount });

  // Only fetch actual Crashlytics crash events, not infra
  const filter = [
    'resource.type="firebase_crashlytics_issue"',
    'OR',
    '(resource.type="logging_log" logName=~"crashlytics")',
    'OR',
    'labels."firebase/app_name"="com.drift.palace.IOS"',
  ].join(' ');

  console.log('🔍 Querying Crashlytics-specific logs for com.drift.palace.IOS...\n');

  try {
    const [entries] = await logging.getEntries({
      pageSize: 50,
      orderBy: 'timestamp desc',
      filter: filter,
    });

    if (!entries || entries.length === 0) {
      // Fallback: search all logs for crash keywords
      console.log('⚠️  No Crashlytics resource logs found directly. Trying full text search...\n');

      const [allEntries] = await logging.getEntries({
        pageSize: 200,
        orderBy: 'timestamp desc',
        filter: [
          'severity>=ERROR',
          `resource.labels.project_id="${projectId}"`,
        ].join(' '),
      });

      const crashEntries = allEntries.filter(e => {
        const text = JSON.stringify(e.data || e.metadata).toLowerCase();
        return (
          text.includes('crash') ||
          text.includes('jsi') ||
          text.includes('fatal') ||
          text.includes('exception') ||
          text.includes('drift') ||
          text.includes('hermes') ||
          text.includes('reanimated')
        );
      });

      if (crashEntries.length === 0) {
        console.log('📭 No crash-related ERROR logs found in the past window.');
        console.log('\n👉 This means the crash happened BEFORE the logs were captured.');
        console.log('   Try: open Crashlytics in Firebase Console → Issues → sort by "Last occurred"');
        console.log('   URL: https://console.firebase.google.com/project/drift-719a3/crashlytics');
      } else {
        console.log(`\n💥 Found ${crashEntries.length} crash-related ERROR log(s):\n`);
        crashEntries.forEach((entry, idx) => {
          const ts = entry.metadata?.timestamp || 'N/A';
          const sev = entry.metadata?.severity;
          const payload = entry.data || entry.jsonPayload || entry.textPayload || entry.metadata;
          console.log(`\n════ [Crash #${idx + 1}] ════`);
          console.log(`⏰ Time:     ${ts}`);
          console.log(`🔴 Severity: ${sev}`);
          console.log(`📄 Payload:\n${JSON.stringify(payload, null, 2)}`);
        });
      }
    } else {
      console.log(`💥 Found ${entries.length} Crashlytics log entry(s):\n`);
      entries.forEach((entry, idx) => {
        const ts = entry.metadata?.timestamp || 'N/A';
        const sev = entry.metadata?.severity;
        const payload = entry.data || entry.jsonPayload || entry.textPayload || entry.metadata;
        console.log(`\n════ [Crash #${idx + 1}] ════`);
        console.log(`⏰ Time:     ${ts}`);
        console.log(`🔴 Severity: ${sev}`);
        console.log(`📄 Payload:\n${JSON.stringify(payload, null, 2)}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
}

main();
