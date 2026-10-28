package com.aaron.digest.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Where the desktop is and the token it gave this phone. Private to this app. */
object Prefs {
    private fun sp(c: Context) = c.getSharedPreferences("digest", Context.MODE_PRIVATE)

    fun url(c: Context): String = sp(c).getString("url", "") ?: ""
    fun token(c: Context): String = sp(c).getString("token", "") ?: ""

    fun savePairing(c: Context, url: String, token: String) {
        sp(c).edit().putString("url", url.trim().trimEnd('/')).putString("token", token).apply()
    }

    /** Called when the desktop says the token was revoked. */
    fun clearToken(c: Context) {
        sp(c).edit().remove("token").apply()
    }

    fun snapshot(c: Context): Snapshot? =
        sp(c).getString("snapshot", null)?.let { runCatching { Snapshot.fromJson(JSONObject(it)) }.getOrNull() }

    fun saveSnapshot(c: Context, s: Snapshot) {
        sp(c).edit().putString("snapshot", s.toJson().toString()).apply()
    }
}

class UnauthorizedException : IOException("unauthorized")

/** The same two calls the phone web client uses: /api/pair and /api/rpc state:get. */
object Api {
    private fun post(base: String, path: String, json: String, token: String?): String {
        val conn = URL(base.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 5000
            conn.readTimeout = 10000
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
            conn.outputStream.use { it.write(json.toByteArray()) }
            if (conn.responseCode == 401) throw UnauthorizedException()
            if (conn.responseCode !in 200..299) throw IOException("HTTP ${conn.responseCode}")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    fun pair(base: String, code: String): String {
        val body = JSONObject().put("code", code.trim()).put("name", "Android widget").toString()
        return JSONObject(post(base, "/api/pair", body, null)).getString("token")
    }

    fun state(base: String, token: String): JSONObject {
        val body = """{"channel":"state:get","args":[]}"""
        return JSONObject(post(base, "/api/rpc", body, token)).getJSONObject("result")
    }
}

/** What the widget shows: a few reminders and headlines, kept so it still draws when the PC is off. */
data class Snapshot(val reminders: List<String>, val headlines: List<String>, val updated: String) {

    fun toJson(): JSONObject = JSONObject()
        .put("reminders", JSONArray(reminders))
        .put("headlines", JSONArray(headlines))
        .put("updated", updated)

    companion object {
        private fun strings(a: JSONArray) = List(a.length()) { a.getString(it) }

        fun fromJson(j: JSONObject) = Snapshot(
            strings(j.getJSONArray("reminders")), strings(j.getJSONArray("headlines")), j.optString("updated"),
        )

        fun from(state: JSONObject): Snapshot {
            val zone = ZoneId.systemDefault()
            val dueFmt = DateTimeFormatter.ofPattern("EEE h:mm a").withZone(zone)

            val all = state.getJSONArray("reminders")
            val reminders = (0 until all.length()).map { all.getJSONObject(it) }
                .filter { !it.getBoolean("done") }
                .sortedBy { if (it.isNull("dueAt")) "~" else it.getString("dueAt") }
                .take(3)
                .map { r ->
                    if (r.isNull("dueAt")) r.getString("text")
                    else "${r.getString("text")} - ${dueFmt.format(Instant.parse(r.getString("dueAt")))}"
                }

            val items = state.getJSONArray("items")
            val headlines = (0 until items.length()).map { items.getJSONObject(it) }
                .sortedByDescending { it.getString("publishedAt") }
                .take(3)
                .map { it.getString("title") }

            val updated = DateTimeFormatter.ofPattern("h:mm a").withZone(zone).format(Instant.now())
            return Snapshot(reminders, headlines, updated)
        }
    }
}
