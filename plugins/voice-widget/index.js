const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const DEFAULT_STRINGS_XML = "<resources>\n</resources>\n";

/**
 * Expo config plugin that adds the MiKiko voice widget to the Android build.
 * Handles: AndroidManifest receiver, Kotlin provider, layouts, drawables, xml metadata.
 */

function addWidgetReceiver(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    // Check if receiver already exists
    const currentReceivers = app.receiver ?? [];
    const receivers = currentReceivers.filter((r) => {
      const name = r.$?.["android:name"];
      return name !== ".VoiceWidgetProvider";
    });
    let modified = false;
    if (receivers.length !== currentReceivers.length) {
      modified = true;
    }
    const exists = receivers.some((r) => {
      const name = r.$?.["android:name"];
      return name === "com.voiceapp.widget.VoiceWidgetProvider";
    });

    if (!exists) {
      receivers.push({
        $: {
          "android:name": "com.voiceapp.widget.VoiceWidgetProvider",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/voice_widget_info",
            },
          },
        ],
      });
      modified = true;
    }
    if (modified) {
      app.receiver = receivers;
    }

    return cfg;
  });
}

function copyWidgetFiles(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main"
      );

      const filesToCopy = [
        {
          src: "plugins/voice-widget/android/VoiceWidgetProvider.kt",
          dest: "java/com/voiceapp/widget/VoiceWidgetProvider.kt",
        },
        {
          src: "plugins/voice-widget/android/widget_voice.xml",
          dest: "res/layout/widget_voice.xml",
        },
        {
          src: "plugins/voice-widget/android/widget_background.xml",
          dest: "res/drawable/widget_background.xml",
        },
        {
          src: "plugins/voice-widget/android/ic_mic.xml",
          dest: "res/drawable/ic_mic.xml",
        },
        {
          src: "plugins/voice-widget/android/voice_widget_info.xml",
          dest: "res/xml/voice_widget_info.xml",
        },
      ];

      for (const file of filesToCopy) {
        const srcPath = path.join(projectRoot, file.src);
        const destPath = path.join(androidRoot, file.dest);

        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        fs.mkdirSync(destDir, { recursive: true });

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Add widget description to strings.xml
      const stringsPath = path.join(
        androidRoot,
        "res",
        "values",
        "strings.xml"
      );
      if (!fs.existsSync(stringsPath)) {
        fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
        fs.writeFileSync(stringsPath, DEFAULT_STRINGS_XML, "utf8");
      }

      let content = fs.readFileSync(stringsPath, "utf8");
      if (!content.includes("widget_voice_description")) {
        content = content.replace(
          "</resources>",
          '  <string name="widget_voice_description">Tap to open MiKiko voice input for quick expense logging</string>\n</resources>'
        );
        fs.writeFileSync(stringsPath, content, "utf8");
      }

      return cfg;
    },
  ]);
}

function withVoiceWidget(config) {
  config = addWidgetReceiver(config);
  config = copyWidgetFiles(config);
  return config;
}

module.exports = withVoiceWidget;
