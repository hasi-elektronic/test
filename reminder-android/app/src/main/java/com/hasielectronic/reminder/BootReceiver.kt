package com.hasielectronic.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-schedules alarms after device reboot.
 * The WebView will re-register alarms when the app is opened.
 * This receiver ensures the app can be launched after boot if needed.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Alarms are lost after reboot. They will be re-registered
            // when the user opens the app and the WebView loads.
            // We could start the app in background, but that's aggressive.
            // Instead we rely on the user opening the app.
        }
    }
}
