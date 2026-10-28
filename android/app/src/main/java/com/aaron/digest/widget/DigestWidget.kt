package com.aaron.digest.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** The home-screen widget: clock, next reminders, latest headlines. Tapping opens Digest. */
class DigestWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        render(context, manager, ids)
        UpdateWorker.refreshNow(context)
    }

    override fun onEnabled(context: Context) = UpdateWorker.schedule(context)

    override fun onDisabled(context: Context) = UpdateWorker.cancel(context)

    companion object {
        fun renderAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            render(context, manager, manager.getAppWidgetIds(ComponentName(context, DigestWidget::class.java)))
        }

        private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val snap = Prefs.snapshot(context)
            val paired = Prefs.token(context).isNotEmpty()
            val views = RemoteViews(context.packageName, R.layout.widget_digest)

            fun fill(viewIds: IntArray, lines: List<String>, emptyText: String) {
                viewIds.forEachIndexed { i, id ->
                    views.setTextViewText(id, lines.getOrNull(i) ?: if (i == 0) emptyText else "")
                }
            }
            fill(
                intArrayOf(R.id.reminder1, R.id.reminder2, R.id.reminder3),
                snap?.reminders ?: emptyList(),
                if (paired) "Nothing to do" else "Open the Digest widget app to connect",
            )
            fill(
                intArrayOf(R.id.news1, R.id.news2, R.id.news3),
                snap?.headlines ?: emptyList(),
                if (paired) "No headlines yet" else "",
            )
            views.setTextViewText(R.id.updated, if (snap != null) "Updated ${snap.updated}" else "")

            // Tap: open the phone web app when paired, otherwise the pairing screen.
            val target = if (paired && Prefs.url(context).isNotEmpty()) {
                Intent(Intent.ACTION_VIEW, Uri.parse(Prefs.url(context)))
            } else {
                Intent(context, MainActivity::class.java)
            }
            views.setOnClickPendingIntent(
                R.id.root,
                PendingIntent.getActivity(context, 0, target, PendingIntent.FLAG_IMMUTABLE),
            )

            ids.forEach { manager.updateAppWidget(it, views) }
        }
    }
}

/** Fetches state from the desktop and redraws. Runs every 15 minutes (the Android minimum) and on demand. */
class UpdateWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val ctx = applicationContext
        val url = Prefs.url(ctx)
        val token = Prefs.token(ctx)
        if (url.isEmpty() || token.isEmpty()) return Result.success()

        try {
            Prefs.saveSnapshot(ctx, Snapshot.from(Api.state(url, token)))
        } catch (e: UnauthorizedException) {
            Prefs.clearToken(ctx) // revoked on the desktop
        } catch (e: Exception) {
            // PC off or not on this network: keep showing the last snapshot and try again next period.
        }
        DigestWidget.renderAll(ctx)
        return Result.success()
    }

    companion object {
        private val needsNetwork = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun schedule(ctx: Context) {
            val request = PeriodicWorkRequestBuilder<UpdateWorker>(15, TimeUnit.MINUTES)
                .setConstraints(needsNetwork).build()
            WorkManager.getInstance(ctx)
                .enqueueUniquePeriodicWork("digest-refresh", ExistingPeriodicWorkPolicy.UPDATE, request)
        }

        fun refreshNow(ctx: Context) {
            val request = OneTimeWorkRequestBuilder<UpdateWorker>().setConstraints(needsNetwork).build()
            WorkManager.getInstance(ctx).enqueueUniqueWork("digest-now", ExistingWorkPolicy.REPLACE, request)
        }

        fun cancel(ctx: Context) {
            WorkManager.getInstance(ctx).cancelUniqueWork("digest-refresh")
        }
    }
}
