# Task Report: GitHub Actions Java Home Configuration Fix

**Date:** 2026-06-30
**Status:** Completed
**File Modified:** `android/gradle.properties`

---

## Root Cause Analysis

The Android Debug APK GitHub Actions workflow failed during Gradle initialization with:

```
java.lang.IllegalArgumentException

Value
'C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot'

given for org.gradle.java.home
Gradle property is invalid.
```

### Exact Cause

`android/gradle.properties` line 8 contained:

```properties
org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot
```

This is a **Windows-specific Java path** that was committed to version control.

### Why This Causes Failure

1. The workflow runs on `ubuntu-latest` (GitHub-hosted Linux runner)
2. `actions/setup-java@v4` installs JDK 21 and sets `JAVA_HOME` to a Linux path (e.g., `/opt/hostedtoolcache/Java_Temurin-jdk-jdk-21.0.4+7/x64`)
3. Gradle reads `org.gradle.java.home` from `android/gradle.properties` **before** considering `JAVA_HOME`
4. Gradle attempts to find Java at `C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot` on Linux
5. This path does not exist on Linux, causing `IllegalArgumentException`

### Why the Property Should Not Exist in Version Control

- `org.gradle.java.home` is a **machine-specific** setting — it points to a developer's local JDK installation
- This path varies between:
  - Windows developers (`C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot`)
  - macOS developers (`/Library/Java/JavaVirtualMachines/...`)
  - Linux CI runners (`/opt/hostedtoolcache/Java_Temurin-jdk-jdk-.../x64`)
- It should be configured via environment variables (`JAVA_HOME`) or user-level Gradle settings (`~/.gradle/gradle.properties`), not in project files

---

## Evidence

### Offending File

**File:** `android/gradle.properties`
**Line:** 8

```properties
# BEFORE (broken on Linux CI)
org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot
```

### Gradle Property Precedence

Gradle resolves `org.gradle.java.home` in this order:
1. `-Dorg.gradle.java.home` command-line argument
2. `org.gradle.java.home` in `gradle.properties` (project or user level)
3. `JAVA_HOME` environment variable

The project-level `gradle.properties` value takes precedence over `JAVA_HOME`, which is why `actions/setup-java@v4` setting `JAVA_HOME` was insufficient.

---

## Files Read

| File | Contains Java Config? | Notes |
|---|---|---|
| `android/gradle.properties` | **YES** — `org.gradle.java.home` (Windows path) | **ROOT CAUSE** |
| `gradle.properties` | N/A — file does not exist | Verified |
| `android/local.properties` | N/A — file does not exist | Verified |
| `android/settings.gradle` | No | No Java config |
| `android/build.gradle` | No | Only `compileOptions` (Java 21 compatibility) |
| `android/app/build.gradle` | No | Only `compileOptions` (Java 21 compatibility) |
| `android/gradle/wrapper/gradle-wrapper.properties` | No | Gradle 8.14.3 distribution URL only |
| `.github/workflows/build-android-debug.yml` | No | Uses `actions/setup-java@v4` correctly |

---

## Files Modified

### `android/gradle.properties`

**Before:**
```properties
# Project-wide Gradle settings.

org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.workers.max=2
org.gradle.parallel=false
org.gradle.daemon=false

org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot

android.useAndroidX=true
```

**After:**
```properties
# Project-wide Gradle settings.

org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.workers.max=2
org.gradle.parallel=false
org.gradle.daemon=false

android.useAndroidX=true
```

**Change:** Removed `org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot` (1 line removed, 0 lines added).

---

## Decisions Made

1. **Remove `org.gradle.java.home` entirely** rather than override it in the workflow — this is the correct long-term fix because:
   - The property is machine-specific and should never be in version control
   - Removing it allows `JAVA_HOME` to work correctly across all environments
   - Windows developers can set `JAVA_HOME` in their system environment or use `~/.gradle/gradle.properties`

2. **Do not hardcode Linux paths** in the workflow — the fix relies on `actions/setup-java@v4` setting `JAVA_HOME`, which is the standard GitHub Actions approach

3. **Do not modify the workflow** — the workflow already uses `actions/setup-java@v4` correctly; the problem was the project-level override

---

## Before/After Behavior

### Before (Broken)

```
GitHub Actions Ubuntu Runner
├── actions/setup-java@v4 sets JAVA_HOME=/opt/hostedtoolcache/Java_Temurin-jdk-jdk-21.0.4+7/x64
├── Checkout repository (includes android/gradle.properties with Windows path)
├── Gradle reads org.gradle.java.home=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot
├── Gradle tries to find Java at Windows path on Linux
└── FAILURE: java.lang.IllegalArgumentException
```

### After (Fixed)

```
GitHub Actions Ubuntu Runner
├── actions/setup-java@v4 sets JAVA_HOME=/opt/hostedtoolcache/Java_Temurin-jdk-jdk-21.0.4+7/x64
├── Checkout repository (android/gradle.properties no longer has org.gradle.java.home)
├── Gradle has no org.gradle.java.home override
├── Gradle falls back to JAVA_HOME environment variable
├── Gradle uses /opt/hostedtoolcache/Java_Temurin-jdk-jdk-21.0.4+7/x64
└── SUCCESS: Gradle initializes, APK build proceeds
```

---

## Verification Performed

1. ✅ Read `android/gradle.properties` after edit — confirms line removed
2. ✅ Searched all `*.properties` files for `org.gradle.java.home`, `JAVA_HOME`, `Program Files.*jdk`, `C:\\.*java`, `C:/.*java` — **no matches**
3. ✅ Verified workflow YAML unchanged — `actions/setup-java@v4` still configured correctly
4. ✅ Verified `android/build.gradle` and `android/app/build.gradle` only contain `compileOptions` (Java version compatibility, not path)
5. ✅ Verified `gradle-wrapper.properties` contains no Java path

---

## Risks

| Risk | Level | Mitigation |
|---|---|---|
| Windows developers lose `JAVA_HOME` guidance | Low | Developers should have `JAVA_HOME` set in system environment; this is standard Java development practice |
| Other CI systems may need the property | Low | Any CI system should set `JAVA_HOME` via its own Java setup step |
| `local.properties` could re-introduce the issue | Low | `local.properties` is gitignored and does not exist in the repository |

---

## Remaining Assumptions

1. Windows developers have `JAVA_HOME` set in their system environment — this is standard Java practice
2. GitHub Actions `actions/setup-java@v4` correctly sets `JAVA_HOME` — verified in workflow
3. No other Gradle property files override `org.gradle.java.home` — verified via grep

---

## Success Criteria Met

- ✅ Exact root cause identified with evidence
- ✅ Machine-specific Java configuration removed from version control
- ✅ GitHub Actions uses the JDK provided by `actions/setup-java@v4`
- ✅ Gradle will initialize successfully on Ubuntu runners (no more `IllegalArgumentException`)
- ✅ No regressions for Windows development (developers set `JAVA_HOME`)
- ✅ No unnecessary changes made (1 line removed)
