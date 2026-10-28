package com.aaron.digest.widget

import android.app.Activity
import android.os.Bundle
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/**
 * One screen: enter the desktop's address and the pairing code shown in
 * Digest > Phone link, then add the widget from the home screen.
 * Built from code (no layout XML) to keep the project small.
 */
class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (20 * resources.displayMetrics.density).toInt()

        val intro = TextView(this).apply {
            text = "On your computer open Digest, choose Phone link, then type the address and code below."
            textSize = 15f
        }
        val url = EditText(this).apply {
            hint = "Address, e.g. http://192.168.0.2:47821"
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setText(Prefs.url(this@MainActivity))
        }
        val code = EditText(this).apply {
            hint = "Pairing code"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        val status = TextView(this).apply {
            textSize = 14f
            text = if (Prefs.token(this@MainActivity).isEmpty()) "Not connected." else "Connected. Add the Digest widget from your home screen."
        }
        val connect = Button(this).apply { text = "Connect" }

        connect.setOnClickListener {
            val base = url.text.toString().trim()
            val pairing = code.text.toString().trim()
            if (base.isEmpty() || pairing.isEmpty()) {
                status.text = "Enter both the address and the code."
                return@setOnClickListener
            }
            status.text = "Connecting..."
            // Network on a plain thread: this screen does one request, so no need for more machinery.
            Thread {
                val message = try {
                    val token = Api.pair(base, pairing)
                    Prefs.savePairing(this, base, token)
                    UpdateWorker.schedule(this)
                    UpdateWorker.refreshNow(this)
                    "Connected. Add the Digest widget from your home screen."
                } catch (e: UnauthorizedException) {
                    "That code did not work. Make a new one on your computer."
                } catch (e: Exception) {
                    "Could not reach your computer. Same Wi-Fi? Phone link switched on?"
                }
                runOnUiThread { status.text = message }
            }.start()
        }

        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad * 2, pad, pad)
            addView(intro)
            addView(url)
            addView(code)
            addView(connect)
            addView(status)
        })
    }
}
