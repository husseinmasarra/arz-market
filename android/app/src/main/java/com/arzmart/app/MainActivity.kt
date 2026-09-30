package com.arzmart.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.util.concurrent.Executor

@Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
class MainActivity : AppCompatActivity() {

    companion object {
        private const val IS_PRODUCTION = true
        private const val PRODUCTION_URL = "https://arzmart.com"
    }

    private lateinit var executor: Executor
    private lateinit var biometricPrompt: BiometricPrompt
    private lateinit var promptInfo: BiometricPrompt.PromptInfo
    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar

    private val urlsToTry = mutableListOf<String>()
    private var currentUrlIndex = 0
    private var isLoaderActiveForIndex = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)

        setupSwipeRefresh()
        setupWebView()
    }

    private fun setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeColors(
            ContextCompat.getColor(this, android.R.color.holo_blue_bright),
            ContextCompat.getColor(this, android.R.color.holo_blue_dark),
            ContextCompat.getColor(this, android.R.color.holo_green_light)
        )
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setSupportMultipleWindows(false)
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // JavaScript interface for native biometrics
        webView.addJavascriptInterface(WebAppInterface(), "AndroidApp")

        // Load URLs configuration
        urlsToTry.clear()
        if (IS_PRODUCTION) {
            urlsToTry.add(PRODUCTION_URL)
        } else {
            urlsToTry.add("http://localhost:5000")
            urlsToTry.add("http://10.0.2.2:5000")
            urlsToTry.add("http://192.168.1.104:5000")
        }

        // WebChromeClient for page loading progress
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                    swipeRefreshLayout.isRefreshing = false
                }
            }
        }

        // WebViewClient for navigation and external link intents
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleUrl(url)
            }

            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                val urlStr = url ?: return false
                return handleUrl(urlStr)
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    swipeRefreshLayout.isRefreshing = false
                    handleLoadFailure()
                }
            }

            @Suppress("DEPRECATION")
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                swipeRefreshLayout.isRefreshing = false
                handleLoadFailure()
            }
        }

        // Start initial load
        loadUrlAtIndex(0)
    }

    private fun handleUrl(url: String): Boolean {
        // Block broken Firebase auth redirects and stay on main store
        if (url.contains("firebaseapp.com") || url.contains("accounts.google.com/signin/oauth/error")) {
            webView.loadUrl(PRODUCTION_URL)
            return true
        }

        // Handle external apps: WhatsApp, Telephone, Email, Telegram
        if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") ||
            url.contains("wa.me") || url.contains("api.whatsapp.com") ||
            url.contains("t.me/") || url.startsWith("tg:")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
                return true
            } catch (e: Exception) {
                Toast.makeText(this, "تعذر فتح التطبيق الخارجي", Toast.LENGTH_SHORT).show()
                return true
            }
        }

        // Normal web navigation inside ArzMart
        return false
    }

    override fun onBackPressed() {
        val currentUrl = webView.url ?: ""
        if (currentUrl.contains("firebaseapp.com") || !currentUrl.contains("arzmart.com")) {
            webView.loadUrl(PRODUCTION_URL)
        } else if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun loadUrlAtIndex(index: Int) {
        if (index >= urlsToTry.size) {
            runOnUiThread {
                Toast.makeText(this, "تعذر الاتصال بالمتجر. يرجى التحقق من اتصال الإنترنت.", Toast.LENGTH_LONG).show()
                swipeRefreshLayout.isRefreshing = false
            }
            return
        }
        currentUrlIndex = index
        isLoaderActiveForIndex = index
        webView.loadUrl(urlsToTry[index])
    }

    private fun handleLoadFailure() {
        if (isLoaderActiveForIndex == currentUrlIndex) {
            isLoaderActiveForIndex = -1
            webView.post {
                loadUrlAtIndex(currentUrlIndex + 1)
            }
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun triggerFingerprintAuth() {
            runOnUiThread {
                checkBiometricSupport()
            }
        }
    }

    private fun checkBiometricSupport() {
        val biometricManager = BiometricManager.from(this)
        when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                setupBiometric()
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                Toast.makeText(this, "الجهاز لا يدعم البصمة البيومترية", Toast.LENGTH_SHORT).show()
                sendBiometricResultToJS(false, "device_no_hardware")
            }
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                Toast.makeText(this, "المصادقة بالبصمة غير متوفرة حالياً", Toast.LENGTH_SHORT).show()
                sendBiometricResultToJS(false, "device_hw_unavailable")
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                Toast.makeText(this, "لا توجد بصمة مسجلة في جهازك", Toast.LENGTH_SHORT).show()
                sendBiometricResultToJS(false, "device_no_biometrics_enrolled")
            }
        }
    }

    private fun setupBiometric() {
        executor = ContextCompat.getMainExecutor(this)

        biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    sendBiometricResultToJS(false, errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Toast.makeText(applicationContext, "تم التحقق بالبصمة بنجاح! 🎉", Toast.LENGTH_SHORT).show()
                    sendBiometricResultToJS(true, null)
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    sendBiometricResultToJS(false, "Authentication failed")
                }
            })

        promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("تسجيل الدخول بالبصمة | أرز مارت")
            .setSubtitle("المس مستشعر البصمة للدخول الفوري")
            .setNegativeButtonText("إلغاء")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    private fun sendBiometricResultToJS(success: Boolean, errorMsg: String?) {
        val script = if (success) {
            "javascript:if(window.onBiometricSuccess) { window.onBiometricSuccess(); } else { console.log('onBiometricSuccess'); }"
        } else {
            val safeMsg = errorMsg?.replace("'", "\\'") ?: ""
            "javascript:if(window.onBiometricFailed) { window.onBiometricFailed('$safeMsg'); } else { console.log('onBiometricFailed'); }"
        }
        webView.evaluateJavascript(script, null)
    }
}
