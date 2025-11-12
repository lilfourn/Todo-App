import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForAppUpdates(onUserClick: boolean = false) {
  try {
    const update = await check();

    if (!update?.available) {
      console.log("No update available");

      // Only show message if user manually clicked "Check for Updates"
      if (onUserClick) {
        await message("You are on the latest version. Stay awesome!", {
          title: "No Update Available",
          kind: "info",
          okLabel: "OK",
        });
      }
    } else if (update?.available) {
      console.log("Update available!", update.version, update.body);

      const yes = await ask(
        `Update to ${update.version} is available!\n\nRelease notes: ${update.body}`,
        {
          title: "Update Available",
          kind: "info",
          okLabel: "Update",
          cancelLabel: "Cancel",
        }
      );

      if (yes) {
        // Download and install the update
        await update.downloadAndInstall();

        // Restart the app to apply the update
        await relaunch();
      }
    }
  } catch (error) {
    console.error("Failed to check for updates:", error);
  }
}
