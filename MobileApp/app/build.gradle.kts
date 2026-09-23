plugins {
    alias(libs.plugins.android.application)
}

android {
    buildFeatures { buildConfig = true }
    namespace = "com.example.on_oa"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.on_oa"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        manifestPlaceholders["cleartextTraffic"] = "false"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug { manifestPlaceholders["cleartextTraffic"] = "true" }
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}
