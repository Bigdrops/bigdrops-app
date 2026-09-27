
PS C:\Users\DELL\Desktop\bigdrops-app> adb logcat | Select-String -Pattern "AppUpdate|chromium|Capacitor|bigdrops" -CaseSensitive:$false

09-27 03:41:36.879  2449  2449 D RecentsModel: logTasks index=: 7, type:type_all, TaskInfo:TaskInfo{userId=0 taskId=927 effectiveUid=10189
displayId=0 isRunning=true baseIntent=Intent { act=android.intent.action.VIEW dat=content://com.android.providers.media.documents/...
typ=text/html flg=0x14002001 cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity} origActivity=null
realActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} numActivities=2 lastActiveTime=254300464
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=2 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@caf7927} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 117 - 0, 0)
topActivityInfo=ActivityInfo{8caa7d4 org.chromium.chrome.browser.app.download.home.DownloadActivity} launchCookies=[] positionInParent=Point(0, 0)
parentTaskId=-1 isFocused=false isVisible=false isVisibleRequested=false isTopActivityNoDisplay=false isSleeping=false locusId=null
displayAreaFeatureId=1 isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000)
capturedLink=null capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0
appCompatTaskInfo=AppCompatTaskInfo { topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false
isLetterboxEducationEnabled= false isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false
isFromLetterboxDoubleTap= false topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1
topActivityLetterboxHeight=-1 topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false
isSystemFullscreenOverrideEnabled=false hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo
{ freeformCameraCompatMode=inactive}} isImmersive=false mTopActivityRequestOrientation=-2 mStatusBarParent=null mNavBarParent=null
mBehindAppLockPkg=null mOriginatingUid=0 isEmbedded=false shouldBeVisible=false isCreatedByOrganizer=false mIsCastMode=false
mTopActivityMediaSize=null mTopActivityRecordName=ActivityRecord{212958825 u0
com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity t927} mTopActivityOrientation=-2 topActivityMainWindowFrame=null}
09-27 03:41:36.879  2449  2449 D RecentsModel: logTasks index=: 7, type:type_ignore_split_and_freefrom, TaskInfo:TaskInfo{userId=0 taskId=927
effectiveUid=10189 displayId=0 isRunning=true baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity} origActivity=null
realActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} numActivities=2 lastActiveTime=254300464
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=2 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@caf7927} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 117 - 0, 0)
topActivityInfo=ActivityInfo{8caa7d4 org.chromium.chrome.browser.app.download.home.DownloadActivity} launchCookies=[] positionInParent=Point(0, 0)
parentTaskId=-1 isFocused=false isVisible=false isVisibleRequested=false isTopActivityNoDisplay=false isSleeping=false locusId=null
displayAreaFeatureId=1 isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000)
capturedLink=null capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0
appCompatTaskInfo=AppCompatTaskInfo { topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false
isLetterboxEducationEnabled= false isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false
isFromLetterboxDoubleTap= false topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1
topActivityLetterboxHeight=-1 topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false
isSystemFullscreenOverrideEnabled=false hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo
{ freeformCameraCompatMode=inactive}} isImmersive=false mTopActivityRequestOrientation=-2 mStatusBarParent=null mNavBarParent=null
mBehindAppLockPkg=null mOriginatingUid=0 isEmbedded=false shouldBeVisible=false isCreatedByOrganizer=false mIsCastMode=false
mTopActivityMediaSize=null mTopActivityRecordName=ActivityRecord{212958825 u0
com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity t927} mTopActivityOrientation=-2 topActivityMainWindowFrame=null}
09-27 03:41:36.891  1829  4051 I PowerHalWrapper: amsBoostNotify pid:2449,activity:com.miui.home.launcher.Launcher, package:com.miui.home,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:36.901  1829  3783 I PowerHalWrapper: amsBoostNotify pid:2449,activity:com.miui.home.launcher.Launcher, package:com.miui.home,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:36.938  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:36.945  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:37.686  1829  2944 I PowerHalWrapper: amsBoostNotify pid:1384,activity:com.openai.chatgpt.MainActivity, package:com.openai.chatgpt,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:37.697  1829  1900 I PowerHalWrapper: amsBoostNotify pid:1384,activity:com.openai.chatgpt.MainActivity, package:com.openai.chatgpt,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:37.801  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:37.804  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.153  2449  2449 D Launcher.CellLayout: touch item:ShortcutInfo, id=401, itemType=0, user=UserHandle{0}, mIconType=0,
pkgName=com.bigdrops.app, className=com.bigdrops.app.MainActivity, screenId=1, container=-100, cellX=3, cellY=5, spanX=1, spanY=1
09-27 03:41:44.153  2449  2449 I PreStartUtils: preLaunchProcess intentIntent { act=android.intent.action.MAIN
cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity (has extras) } userId=0
09-27 03:41:44.154  1829  3282 D PreStartingManager: Load bitmap start, fileName:
/data/system_ce/0/pre_starting_bitmap/com.bigdrops.app_0_normal_night.webp
09-27 03:41:44.154  2449  2449 E PreStartUtils: preLaunchProcess success infoPackage: com.bigdrops.app
09-27 03:41:44.154  1829  2307 I AppStartScenario: notifyScenarioChanged: active=true param=Bundle[{type=1, state=1, processName=com.bigdrops.app}]
09-27 03:41:44.154  1829  2307 D MiuiEmbeddingWindow: blacklistedAppRunningOnPhone: package=com.bigdrops.appisNotProjeciton=true
isHavingJeppackDisabledConfig=false isRunningOnPhone=true isAppleConnection=false
09-27 03:41:44.154  1829  2307 D MiuiEmbeddingWindow: MiuiEmbeddingWindowService: updateApplicationInfo for com.bigdrops.app,
blacklistedAppRunningOnPhone updated: clear
09-27 03:41:44.156  1829  2307 I PowerHalWrapper: amsBoostProcessCreate package:com.bigdrops.app
09-27 03:41:44.157  1829  2307 I AppStartScenario: notifyScenarioChanged: active=true
param=Bundle[{hostingRecordName={com.bigdrops.app/com.bigdrops.app.MainActivity}, hostingRecordType=prestart-top-activity, uid=10706, type=1,
state=2, processName=com.bigdrops.app, packageName=com.bigdrops.app}]
09-27 03:41:44.161  1829  1930 I AppStartScenario: notifyScenarioChanged: active=true
param=Bundle[{hostingRecordName={com.bigdrops.app/com.bigdrops.app.MainActivity}, hostingRecordType=prestart-top-activity, pid=18675, uid=10706,
type=1, state=3, processName=com.bigdrops.app, packageName=com.bigdrops.app}]
09-27 03:41:44.164 18675 18675 E Zygote  : process_name_ptr:18675 com.bigdrops.app
09-27 03:41:44.164 18675 18675 E Zygote  : SetMemoryProtected process_name_ptr:18675 com.bigdrops.app
09-27 03:41:44.170 18675 18675 I om.bigdrops.app: Using generational CollectorTypeCMC GC.
09-27 03:41:44.170  1829  1930 I ActivityManager: Start proc 18675:com.bigdrops.app/u0a706 for prestart-top-activity
{com.bigdrops.app/com.bigdrops.app.MainActivity} caller=null
09-27 03:41:44.176  1829  5402 D PreStartingCapture: Load bitmap end, fileName:
/data/system_ce/0/pre_starting_bitmap/com.bigdrops.app_0_normal_night.webp  mBitmapDrawableCache:
{com.bigdrops.app=android.graphics.drawable.BitmapDrawable@60e1963}
09-27 03:41:44.177  1829  3282 D MiuiForceVkService: shouldUseVk, pkg=com.bigdrops.app useVk 0
09-27 03:41:44.180  1829  3282 I AppStartScenario: notifyScenarioChanged: active=true
param=Bundle[{applicationThread=android.os.BinderProxy@54f2960, hostingRecordName={com.bigdrops.app/com.bigdrops.app.MainActivity},
hostingRecordType=prestart-top-activity, pid=18675, uid=10706, type=1, state=4, processName=com.bigdrops.app, packageName=com.bigdrops.app,
applicationThreadExt=android.os.BinderProxy@1900e19}]
09-27 03:41:44.180  1829  3282 I SmartPower: com.bigdrops.app/10706(18675): died->background(29108ms) R(process start ) adj=-10000.
09-27 03:41:44.185 18675 18675 I RENDER_TURBO: onActivityThreadCreate not in white list, pkg=com.bigdrops.app, type=corot
09-27 03:41:44.192 18675 18675 D ActivityThread: setEmbeddedParam packageName=com.bigdrops.app processName=com.bigdrops.app isEmbedded=false
isIsolated=false
09-27 03:41:44.201 18675 18675 D nativeloader: Configuring clns-10 for other apk
/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk. target_sdk_version=36, uses_libraries=, library_path=/data
/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/lib/arm64:/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8T
wR-6JKqaZ13Dw==/base.apk!/lib/arm64-v8a, permitted_path=/data:/mnt/expand:/data/user/0/com.bigdrops.app
09-27 03:41:44.205 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d4e298) locale list changing from [] to [en-GB]
09-27 03:41:44.207 18675 18675 V GraphicsEnvironment: com.bigdrops.app is not listed in per-application setting
09-27 03:41:44.207 18675 18675 V GraphicsEnvironment: com.bigdrops.app is not listed in ANGLE allowlist or settings, returning default
09-27 03:41:44.209  1829  3783 I UiModeManager: systemserver package:com.bigdrops.app null
09-27 03:41:44.209 18675  7565 I ForceDarkHelperStubImpl: initialize for com.bigdrops.app , ForceDarkAppConfig: null
09-27 03:41:44.214  2449  2449 D Launcher: launch, launchIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER]
flg=0x10200000 cmp=com.bigdrops.app/.MainActivity (has extras) }
09-27 03:41:44.215  2449  2449 I ScenarioRecognitionUtil: setScenarioState, type:296, isStart: true, packageName: com.bigdrops.app
09-27 03:41:44.215  2449  2449 I AnimStateManager: onLauncherStartActivity sameOldElement=null, click
View=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL. ...p..ID 896,1450-1182,1740}(BigDrops), isOldElementReuseful=false
09-27 03:41:44.215  2449  2449 I FastLaunchWindowElement8d3061e: requestRemoteTransition package=com.bigdrops.app
09-27 03:41:44.215  2449  2449 I OpenUseQuickStep: packageName= com.bigdrops.app
09-27 03:41:44.218  1829  1857 W XSpaceManagerServiceImpl: checkXSpaceControl, from:com.miui.home, to:com.bigdrops.app, with
act:android.intent.action.MAIN, callingUserId:0, toUserId:0
09-27 03:41:44.220  1829  1857 D AurogonImmobulusMode: launch app processName = com.bigdrops.app uid = 10706
09-27 03:41:44.220  1829  1857 I SmartPower: com.bigdrops.app/10706(18675): background->invisible(40ms) R(become foreground) adj=0.
09-27 03:41:44.220  1829  1857 D WindowManager: Collecting in transition 5906: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t-1} init
visibleRequested:false dc:null
09-27 03:41:44.220  1829  1857 I ActivityStarterImpl: boost warm start activity for com.bigdrops.app
09-27 03:41:44.226  1829  1857 D WindowManager: Collecting in transition 5906: Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} init
visibleRequested:false dc:Display{#0 state=ON size=1220x2712 ROTATION_0}
09-27 03:41:44.226 18675 18675 D ResMonitorStub: The current process type is: third_party_app, process name is: com.bigdrops.app
09-27 03:41:44.226  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:false isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.226  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:false isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.227  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:false isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.227  1829  1857 D MiuiFreeFormManagerService: onStartActivityInner as = Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
op = ActivityOptions(104359883), mPackageName=null, mAnimationType=13, mStartX=0, mStartY=0, mWidth=0, mHeight=0, mLaunchDisplayId=-1,
mLaunchBoundsnull, mElementSurfaceTransition = null, activityOptionsInjector=ActivityOptionsInjector={freeformScale: -1.0 mIsNormalFreeForm: true}
09-27 03:41:44.227  1829  1857 I ActivityTaskManager: moveTaskToFront: Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} caller
trace:com.android.server.wm.TaskDisplayArea.onTaskMoved:461 com.android.server.wm.Task.updateTaskMovement:1758
com.android.server.wm.TaskDisplayArea.positionChildTaskAt:425 com.android.server.wm.TaskDisplayArea.positionChildAt:386
com.android.server.wm.Task.moveToFront:6245 com.android.server.wm.Task.moveToFront:6215
com.android.server.wm.ActivityStarter.startActivityInner:2487 com.android.server.wm.ActivityStarter.startActivityUnchecked:1989
com.android.server.wm.ActivityStarter.executeRequest:1801 com.android.server.wm.ActivityStarter.execute:1005
09-27 03:41:44.228  1829  1857 I WindowManager: Try to add startingWindow type = STARTING_WINDOW_TYPE_SPLASH_SCREEN this = ActivityRecord{90710355
u0 com.bigdrops.app/.MainActivity t934} mOccludesParent = true preAllowTaskSnapshot = true afterAllowTaskSnapshot = true newTask = true taskSwitch
= true processRunning = true activityCreated = false activityAllDrawn = false isSnapshotCompatible = false snapshotRotation = NaN resolvedTheme =
2131951630 theme = 2131951630
09-27 03:41:44.228  1829  2128 D PreStartingManager: Get background color: ff181820  key: com.bigdrops.app_night  containColor: true
09-27 03:41:44.229  1829  1857 I PowerHalWrapper: amsBoostNotify pid:2449,activity:com.miui.home.launcher.Launcher, package:com.miui.home,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:44.230  1829  2419 D BarFollowAnimation:  CreateBarRunnable  mTask = Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
mSurfaceControl = Surface(name=Task=934#125301)/@0x7a3ab8e currentPid = 1829 currentThread name = BarFollowAnimation Thread currentThread id = 292
09-27 03:41:44.230  1829  1857 D WindowManager: Collecting in transition 5906: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
init visibleRequested:false dc:Display{#0 state=ON size=1220x2712 ROTATION_0}
09-27 03:41:44.231  1829  1857 D WindowManager:    ChangeInfo{5f76a54 container=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
flags=0x0}
09-27 03:41:44.231  1829  1857 D WindowManager:    ChangeInfo{c0c0543 container=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
flags=0x0}
09-27 03:41:44.235  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:false isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.235  1829  1857 D WindowManager: Collecting in transition 5906: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
init visibleRequested:true dc:Display{#0 state=ON size=1220x2712 ROTATION_0}
09-27 03:41:44.235  1829  1857 D ATMSImpl: Notify ticket snatching mode scenario package is com.bigdrops.app
09-27 03:41:44.237  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:false isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.238  1829  1857 D BarFollowAnimation: isAppTaskBarOnTop win:Window{acbab61 u0 com.miui.home/com.miui.home.launcher.Launcher}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{d661af1 #925 type=standard
A=10320:com.openai.chatgpt} : false); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:false
mLastHomeBarVisible:true
09-27 03:41:44.238  1829  1857 I ActivityTaskSupervisor: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} launched from package
com.miui.home, so schedule top resumed activity immediately.
09-27 03:41:44.238  1829  1857 I PowerHalWrapper: amsBoostNotify pid:18675,activity:com.bigdrops.app.MainActivity, package:com.bigdrops.app,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:44.238  1829  1857 I ScnModule: [GameDetection] requestedPermissions1/1:: com.bigdrops.app:: [android.permission.INTERNET,
android.permission.USE_BIOMETRIC, android.permission.USE_FINGERPRINT, android.permission.ACCESS_NETWORK_STATE,
android.permission.POST_NOTIFICATIONS, android.permission.WAKE_LOCK, com.google.android.c2dm.permission.RECEIVE,
com.bigdrops.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION]
09-27 03:41:44.238  1829  1857 I ScnModule: [GameDetection] numOfPermissiom:: com.bigdrops.app:: 8
09-27 03:41:44.238  1829  1857 I ScnModule: [GameDetection] inputPermissions:: com.bigdrops.app:: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
09-27 03:41:44.238  1829  1857 I ScnModule: [GameDetection] inputGameFeature:: com.bigdrops.app:: [-1.4031261, 0.0, 0.0, 0.0]
09-27 03:41:44.238  1829  1857 I ScnModule: [GameDetection] GamePredictor:: com.bigdrops.app:: nonGame:26.4329,isGame:-27.9842
09-27 03:41:44.238  1829  1857 I mtkpower_client: [PowerHal_Wrap_notifyAppState] com.bigdrops.app/com.bigdrops.app.MainActivity pid=18675
activityId:90710355 state:1
09-27 03:41:44.239  1829  1857 D WindowManager:    ChangeInfo{5f76a54 container=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
flags=0x0}
09-27 03:41:44.239  1829  1857 D WindowManager:    ChangeInfo{c0c0543 container=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
flags=0x0}
09-27 03:41:44.240  1829  1857 D WindowManager: Collecting in transition 5906: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
init visibleRequested:true dc:Display{#0 state=ON size=1220x2712 ROTATION_0}
09-27 03:41:44.240  1829  1857 I AppStartScenario: notifyScenarioChanged: active=true param=Bundle[{renderThreadId=0,
applicationThread=android.os.BinderProxy@54f2960, pid=18675, uid=10706, name=com.bigdrops.app.MainActivity, type=2, preStartProc=true, state=1,
processName=com.bigdrops.app, packageName=com.bigdrops.app, homeApp=false, appSwitch=true}]
09-27 03:41:44.240  1829  1857 D PreStartingManager: Get background color: ff181820  key: com.bigdrops.app_night  containColor: true
09-27 03:41:44.240  1829  1857 D ActivityStarterImpl: notifyHomeStartActivityFinish info = ActivityStartInfo{mPackageName='com.bigdrops.app',
mIsTranslucent=false, mTransitionSyncId=5906, mStartingWindowColor=ff181820, mBounds=Rect(0, 0 - 1220, 2712), mLaunchFromHome=true,
mLaunchSuccess=true, mFixedRotation=0, mStartingWindowType=0, mTaskId=934, mHomeActivityLeash=Surface(name=ActivityRecord{144651739 u0
com.miui.home/.launcher.Launcher t2}#58)/@0xe24eb51, mHomeTaskLeash=Surface(name=Task=2#55)/@0x7a48cbf, mWindowRotation=-1}
09-27 03:41:44.241  2449  3239 I FastLaunchWindowElement8d3061e: startActivityFinished info=ActivityStartInfo{mPackageName='com.bigdrops.app',
mIsTranslucent=false, mTransitionSyncId=5906, mStartingWindowColor=ff181820, mBounds=Rect(0, 0 - 1220, 2712), mLaunchFromHome=true,
mLaunchSuccess=true, mFixedRotation=0, mStartingWindowType=0, mTaskId=934, mHomeActivityLeash=Surface(name=ActivityRecord{144651739 u0
com.miui.home/.launcher.Launcher t2}#58)/@0xc8bbaf6, mHomeTaskLeash=Surface(name=Task=2#55)/@0xab9bef7,
mWindowRotation=0},finishCallback=android.window.IHyperRemoteTransitionFinishedCallback$Stub$Proxy@34fc164 , isOpen=true,
package=com.bigdrops.app, isCanceled=false, nativeCanceled=false, isSurfaceCanceled=false
09-27 03:41:44.241  2449  3239 I OpenUseQuickStep: packageName= com.bigdrops.app
09-27 03:41:44.241  2449  3239 I FastLaunchWindowElement8d3061e: TransitionTest startFastLaunch package=com.bigdrops.app
09-27 03:41:44.241  2449  3239 I WindowAnimParamsProvider: getQuickOpeningWindowsAnimParams iconLoc: com.miui.home.launcher.ShortcutIcon{7b1e1a9
VFED..CL. ...p..ID 896,1450-1182,1740}(BigDrops) Rect(955, 1663 - 1135, 1843)
09-27 03:41:44.241  1829  1857 D BarFollowAnimation: isAppTaskBarOnTop win:Window{acbab61 u0 com.miui.home/com.miui.home.launcher.Launcher}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{d661af1 #925 type=standard
A=10320:com.openai.chatgpt} : false); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:false
mLastHomeBarVisible:true
09-27 03:41:44.241  1049  1049 I vendor.mediatek.hardware.mtkpower_applist-service.mediatek: packName: com.bigdrops.app actName:
com.bigdrops.app.MainActivity pid: 18675 uid: 10706 state: 1
09-27 03:41:44.241  1049  1049 I MTK_APPList: [notifyAPPstate] com.bigdrops.app/com.bigdrops.app.MainActivity, pid=18675, uid=10706,
state:RESUMED, fps:-1, win:0
09-27 03:41:44.241  1049  1049 I MTK_APPList: [notifyAPPstate] multi_resumed_app_info[0] com.bigdrops.app/com.bigdrops.app.MainActivity,
pid:18675, fps:-1, isMultiWindow:0
09-27 03:41:44.241  1049  1049 I MTK_APPList: [notifyAPPstate] foreground:com.bigdrops.app, pid:18675, uid:10706
09-27 03:41:44.242  1829  1857 D WindowManager: isSyncFinished true. ar: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
09-27 03:41:44.242  1829  1857 D WindowManager: isSyncFinished true. ar: ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
09-27 03:41:44.242  1829  2360 I CameraActivitySceneMode: decideSceneMode: ActivityStateChange activityName = com.bigdrops.app.MainActivity,
displayId = 0, state = 2
09-27 03:41:44.242  1829  1857 I SmartPower: com.bigdrops.app/10706(18675): invisible->visible(22ms) R(become visible) adj=0.
09-27 03:41:44.242  1829  1857 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:true isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.242  1829  1857 D BarFollowAnimation: onTaskAppearedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.242  1049  1049 I MTK_APPList: [notifyAPPstate] pc:0, com.miui.home => com.bigdrops.app
09-27 03:41:44.242  1829  1857 D TransitionImpl: forceAddToTransition Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.242  1829  1857 D TransitionImpl: forceAddToTransition Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.242  1829  1857 D WindowManager: Final targets: [ChangeInfo{c0c0543 container=Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} flags=0x10}, ChangeInfo{35fb29f container=Task{1688dd8 #1 type=home} flags=0x10}, ChangeInfo{e25afec
container=WallpaperWindowToken{77fca7a showWhenLocked=false} flags=0x0}]
09-27 03:41:44.244  1829  1857 I DynamicIslandService: elementSurfaceTransition is null for:com.bigdrops.app
09-27 03:41:44.244 30941 30974 I SoScStageCoordinator: Transition requested:TransitionRequestInfo { type = OPEN, triggerTask = TaskInfo{userId=0
taskId=934 effectiveUid=10706 displayId=0 isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER]
flg=0x10200000 cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256364981
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@d8f50c1} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 117 - 0, 0)
topActivityInfo=ActivityInfo{6e66066 com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=false isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1
topActivityMainWindowFrame=null}, pipChange = null, remoteTransition = RemoteTransition { remoteTransition =
android.window.IRemoteTransition$Stub$Proxy@65a4fa7, appThread = null, debugName = null, hyperRemoteTransition = null }, displayChange = null,
flags = 0, debugId = 5906 } isSoScActive:false triggerTask:TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0 isRunning=true
baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity }
baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256364981
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@d8f50c1} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 117 - 0, 0)
topActivityInfo=ActivityInfo{6e66066 com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=false isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1 isTopActivityTr
09-27 03:41:44.245  1829  1857 D WindowManager: Calling onTransitionReady info={id=5906 t=OPEN f=0x0 trk=0 r=[0@Point(0, 0)]
c=[{WCT{RemoteToken{6f41084 Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}}} m=OPEN f=NONE
leash=Surface(name=Task=934#125301)/@0x7a3ab8e sb=Rect(0, 0 - 1220, 2712) eb=Rect(0, 0 - 1220, 2712) epz=Point(1220, 2712) d=0 taskParent=-1
v=trueMiuiChangeImpl {miuiEmbedding:false, scale:1.0}},{WCT{RemoteToken{1af9bc7 Task{1688dd8 #1 type=home}}} m=TO_BACK f=SHOW_WALLPAPER
leash=Surface(name=Task=1#30006)/@0x2636add sb=Rect(0, 0 - 1220, 2712) eb=Rect(0, 0 - 1220, 2712) epz=Point(1220, 2712) d=0 taskParent=-1
v=falseMiuiChangeImpl {miuiEmbedding:false, scale:1.0}},{m=TO_BACK f=IS_WALLPAPER leash=Surface(name=WallpaperWindowToken{77fca7a
showWhenLocked=false}#11060)/@0x576922b sb=Rect(0, 0 - 1220, 2712) eb=Rect(0, 0 - 1220, 2712) epz=Point(1220, 2712) d=0 v=falseMiuiChangeImpl
{miuiEmbedding:false, scale:1.0}}] mk=[false] noAni=[false] df=[false] rsa=[false] oa=[false] nc=[0] ho=[false] hla=[true] iSync=[-1]},
mToken=Token{d0b706d TransitionRecord{41efd42 id=5906 type=OPEN flags=0x0 c=[
09-27 03:41:44.245  1829  1857 D WindowManager:    ChangeInfo{5f76a54 container=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934}
flags=0x0}
09-27 03:41:44.245  1829  1857 D WindowManager:    ChangeInfo{c0c0543 container=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
flags=0x10}
09-27 03:41:44.247  1829  1857 I ActivityTaskManager: START u0 {act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER]
flg=0x10200000 xflg=0x4 cmp=com.bigdrops.app/.MainActivity bnds=[53,25][233,205] (has extras)} with LAUNCH_SINGLE_TASK from uid 10162 from pid
2449 callingPackage com.miui.home (sr=144651739) (BAL_ALLOW_VISIBLE_WINDOW) result code=0
09-27 03:41:44.248  2449  2449 D FastLaunchWindowElement8d3061e: animTo, params=RectFParams(targetApps=null,
windowAnimParams=WindowAnimParams(startRect=RectF(955.0, 1663.0, 1135.0, 1843.0), targetRect=RectF(0.0, 0.0, 1220.0, 2712.0),
startRadii=[38.0,38.0,38.0,38.0], endRadii=[104.0,104.0,104.0,104.0], startAlpha=0.0, endAlpha=1.0,
velocityParams=VelocityParams(leftVelocity=0.0, topVelocity=0.0, widthVelocity=0.0, heightVelocity=0.0, ratioVelocity=0.0,
radiusRatioVelocity=0.0, alphaVelocity=0.0), extraSpringsBundles=null), animType=OPEN_FROM_HOME, ignoreIcon=false, showTask=false,
isQuickSwitchMode=false, targetView=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL. ...P..ID 896,1450-1182,1740}(BigDrops),
animListener=com.miui.home.recents.anim.WindowAnimParamsProvider$getQuickOpeningWindowsAnimParams$animListener$1@d39ffcd,
clipAnimationHelper=com.miui.home.recents.util.ClipAnimationHelper@3309082, clearLastListener=false, currentDisplayRotation=0, homeRotation=0,
gestureHomeCalculator=null, needFinishOnAnimEnd=true, currentTaskIndex=0, isSplitModeBack=false, isUseTranslucentAnim=false, runningTaskId=0,
touchRange=2, hasAnimTarget=true, isCloseAppToDefaultCenter=false, isHoldSmallWindowCropForCloseToDrag=false), isRunning()=false
09-27 03:41:44.248  2449  2449 D WindowElement8d3061e: updateFloatingIconView, oldTargetView=null,
params.targetView=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL. ...P..ID 896,1450-1182,1740}(BigDrops)
09-27 03:41:44.248  2449  2449 D WindowElement8d3061e: replaceFloatingIconViewContent, init floatingIconView if needed floatingIcon =
[Lcom.miui.home.recents.FloatingIconInterface;@e415393 params = RectFParams(targetApps=null,
windowAnimParams=WindowAnimParams(startRect=RectF(955.0, 1663.0, 1135.0, 1843.0), targetRect=RectF(0.0, 0.0, 1220.0, 2712.0),
startRadii=[38.0,38.0,38.0,38.0], endRadii=[104.0,104.0,104.0,104.0], startAlpha=0.0, endAlpha=1.0,
velocityParams=VelocityParams(leftVelocity=0.0, topVelocity=0.0, widthVelocity=0.0, heightVelocity=0.0, ratioVelocity=0.0,
radiusRatioVelocity=0.0, alphaVelocity=0.0), extraSpringsBundles=null), animType=OPEN_FROM_HOME, ignoreIcon=false, showTask=false,
isQuickSwitchMode=false, targetView=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL. ...P..ID 896,1450-1182,1740}(BigDrops),
animListener=com.miui.home.recents.anim.WindowAnimParamsProvider$getQuickOpeningWindowsAnimParams$animListener$1@d39ffcd,
clipAnimationHelper=com.miui.home.recents.util.ClipAnimationHelper@3309082, clearLastListener=false, currentDisplayRotation=0, homeRotation=0,
gestureHomeCalculator=null, needFinishOnAnimEnd=true, currentTaskIndex=0, isSplitModeBack=false, isUseTranslucentAnim=false, runningTaskId=0,
touchRange=2, hasAnimTarget=true, isCloseAppToDefaultCenter=false, isHoldSmallWindowCropForCloseToDrag=false) isInit
09-27 03:41:44.248  2449  2449 D FloatingIconView2ff98fd0: init addView: com.bigdrops.app, index: 2,
rootView:com.miui.home.launcher.StrictFrameLayout{b5d98c7 V.E...... ......ID 0,0-1220,2712}
09-27 03:41:44.248  2449  2449 D FloatingIconView2ff98fd0: init, icon=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL. ...P..ID
896,1450-1182,1740}(BigDrops), mIsAdaptiveIcon=false, iconOffset=0, isBigIcon=false, isVerticalShape=false, isVerticalClip=false, mIsClamp=false,
mDrawableandroid.graphics.drawable.BitmapDrawable@886d292, clipToOutlinefalse
09-27 03:41:44.248  2449  2449 I ScenarioRecognitionUtil: setScenarioState, type:296, isStart: false, packageName: com.bigdrops.app
09-27 03:41:44.249  1829  3874 D PreStartingManager: Get background color: ff181820  key: com.bigdrops.app_night  containColor: true
09-27 03:41:44.249  1829  3874 I WindowManager: Allow fixed rotation for not collecting:ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity
t934}
09-27 03:41:44.249  1829  2419 D BarFollowAnimation: disableBarAnimation change={WCT{RemoteToken{6f41084 Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app}}} m=OPEN f=NONE leash=Surface(name=Task=934#125301)/@0x7a3ab8e sb=Rect(0, 0 - 1220, 2712) eb=Rect(0, 0 - 1220, 2712)
epz=Point(1220, 2712) d=0 taskParent=-1 v=trueMiuiChangeImpl {miuiEmbedding:false, scale:1.0}} 1 1
09-27 03:41:44.250  1829  2419 D BarFollowAnimation: startStatusBarAnimation change= {WCT{RemoteToken{6f41084 Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app}}} m=OPEN f=NONE leash=Surface(name=Task=934#125301)/@0x7a3ab8e sb=Rect(0, 0 - 1220, 2712) eb=Rect(0, 0 - 1220, 2712)
epz=Point(1220, 2712) d=0 taskParent=-1 v=trueMiuiChangeImpl {miuiEmbedding:false, scale:1.0}} isRecent=false startWindowMode=1 endWindowMode=1
statusState=-1 isRotationAnimation=false
09-27 03:41:44.250  1829  2419 D BarFollowAnimation: startStatusBarAnimation task=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.250  1829  2419 D BarFollowAnimation: bindAssociatedTask task=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.253 18675 18675 D om.bigdrops.app: blurUtils, initBackgroundBlurMinInterval processName(com.bigdrops.app), inWhiteLists(0)
09-27 03:41:44.253 30941 30974 D MiuiDecorationController: relayout::taskId=934, visible=true, bounds=Rect(0, 0 - 1220, 2712), focused=true,
oldImmersive=false, newImmersive=false, windowMode=1, activityType=1, displayId=0,
baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
callers=com.android.wm.shell.multitasking.miuimultiwinswitch.miuiwindowdecor.MulWinSwitchDecorViewModel.createWindowDecoration:317
com.android.wm.shell.multitasking.miuimultiwinswitch.miuiwindowdecor.MulWinSwitchDecorViewModel.onTaskOpening:10
com.android.wm.shell.freeform.FreeformTaskTransitionObserver.onTransitionReady:334 com.android.wm.shell.transition.Transitions.dispatchReady:241
com.android.wm.shell.transition.Transitions.onTransitionReady:280
09-27 03:41:44.258  2449  3239 D WindowTransitionCompat:  printLeash::taskInfo = TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0
isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256364981
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@86e1706} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 117 - 0, 0)
topActivityInfo=ActivityInfo{687d1c7 com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.258  2794  2812 D HyperComm_AppMonitor: onForegroundInfoChanged: foregroundInfo =
ForegroundInfo{mForegroundPackageName='com.bigdrops.app', mForegroundUid=10706, mForegroundPid=18675, mForegroundDisplayId=0,
mLastForegroundPackageName='com.miui.home', mLastForegroundUid=10162, mLastForegroundPid=2449, mLastForegroundDisplayId=0,
mMultiWindowForegroundPackageName='com.bigdrops.app', mMultiWindowForegroundUid=10706, mFlags=1}
09-27 03:41:44.258  2449  3239 D TransitionUtil: get key :ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}#934
09-27 03:41:44.259 21725 21739 D BluetoothLatencyMode: ForegroundInfo{mForegroundPackageName='com.bigdrops.app', mForegroundUid=10706,
mForegroundPid=18675, mForegroundDisplayId=0, mLastForegroundPackageName='com.miui.home', mLastForegroundUid=10162, mLastForegroundPid=2449,
mLastForegroundDisplayId=0, mMultiWindowForegroundPackageName='com.bigdrops.app', mMultiWindowForegroundUid=10706, mFlags=1}
09-27 03:41:44.261  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 0
09-27 03:41:44.262  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{e28c533 u0 Splash Screen com.bigdrops.app}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.265  1829  1901 D BarFollowAnimation: current status bar control target is : Window{e28c533 u0 Splash Screen com.bigdrops.app}
09-27 03:41:44.266  1829  1901 D WindowManager: updateSystemBarAttributes displayId: 16777216 Window{e28c533 u0 Splash Screen com.bigdrops.app}
winAppearance=
09-27 03:41:44.268  1829  3876 D ActivityTaskManager:  setSkipCaptureLayers tr: Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.270  1829  1898 D WmSystemUiDebug: on system bar attributes changed displayId=16777216 appearance=
appearanceRegions=[AppearanceRegion{ bounds=[0,0][1220,2712]}] navbarColorManagedByIme=false behavior=1 requestedVisibleTypes=[statusBars
navigationBars captionBar systemGestures mandatorySystemGestures tappableElement displayCutout windowDecor systemOverlays]
packageName=com.bigdrops.app letterboxDetails=[]
09-27 03:41:44.271 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d530b8) locale list changing from [] to [en-GB]
09-27 03:41:44.272  2449  3909 W RecentsModel: getRunningTask   taskInfo=TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0
isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256365017
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@52b8c90} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 0 - 0, 0)
topActivityInfo=ActivityInfo{fbee989 com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.272 30941 30941 D KeyguardEditorHelper: onTopActivityMayChanged,
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}; mState=IDEL
09-27 03:41:44.273 18675  7585 D libMEOW : applied 1 plugins for [com.bigdrops.app]:
09-27 03:41:44.274  1829  3283 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 8
09-27 03:41:44.274 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5e918) locale list changing from [] to [en-GB]
09-27 03:41:44.275  1829  3283 D BarFollowAnimation: isAppTaskBarOnTop win:Window{e28c533 u0 Splash Screen com.bigdrops.app}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.276  1829  3283 D WindowManager: updateSystemBarAttributes displayId: 16777216 Window{e28c533 u0 Splash Screen com.bigdrops.app}
winAppearance=LIGHT_STATUS_BARS LIGHT_NAVIGATION_BARS
09-27 03:41:44.277  1829  1898 D WmSystemUiDebug: on system bar attributes changed displayId=16777216 appearance=LIGHT_STATUS_BARS
LIGHT_NAVIGATION_BARS appearanceRegions=[AppearanceRegion{LIGHT_STATUS_BARS bounds=[0,0][1220,2712]}] navbarColorManagedByIme=false behavior=1
requestedVisibleTypes=[statusBars navigationBars captionBar systemGestures mandatorySystemGestures tappableElement displayCutout windowDecor
systemOverlays] packageName=com.bigdrops.app letterboxDetails=[]
09-27 03:41:44.277  1829  3283 I WindowManager: Allow fixed rotation for not collecting:ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity
t934}
09-27 03:41:44.281  1829  2307 I AudioGameEffect: foreground change to com.bigdrops.app, last foreground is com.miui.home
09-27 03:41:44.281 11096 26920 D PerfEngineController: ForegroundInfo{mForegroundPackageName='com.bigdrops.app', mForegroundUid=10706,
mForegroundPid=18675, mForegroundDisplayId=0, mLastForegroundPackageName='com.miui.home', mLastForegroundUid=10162, mLastForegroundPid=2449,
mLastForegroundDisplayId=0, mMultiWindowForegroundPackageName='com.bigdrops.app', mMultiWindowForegroundUid=10706, mFlags=1}
09-27 03:41:44.281  1829  2307 D EventReceiver: foregroundChange uid  uid=10706 pkg=com.bigdrops.app
09-27 03:41:44.281 11104 11203 I GST     : forePkg: com.bigdrops.app, preForePkg: com.miui.home
09-27 03:41:44.282  2449 10638 D RecentsImpl: onForegroundChanged, foregroundPackageName=com.bigdrops.app
09-27 03:41:44.282  6959  7081 I ProcessMonitor: onForegroundInfoChanged: ForegroundInfo{mForegroundPackageName='com.bigdrops.app',
mForegroundUid=10706, mForegroundPid=18675, mForegroundDisplayId=0, mLastForegroundPackageName='com.miui.home', mLastForegroundUid=10162,
mLastForegroundPid=2449, mLastForegroundDisplayId=0, mMultiWindowForegroundPackageName='com.bigdrops.app', mMultiWindowForegroundUid=10706,
mFlags=1}
09-27 03:41:44.282  6959 19510 W MIUISafety-Monitor: screen share fg changed: pkg=com.bigdrops.app projecting=false inHighRiskList=false
curFgHighRisk=false lastFgHighRisk=false capsule=null
09-27 03:41:44.284  6959  7081 I GameBoosterService: onForegroundInfoChanged: Cur=com.bigdrops.app       last=com.miui.home
09-27 03:41:44.285  6959  7081 D GameBoosterService: onGameStatusChange foreground:ForegroundInfo{mForegroundPackageName='com.bigdrops.app',
mForegroundUid=10706, mForegroundPid=18675, mForegroundDisplayId=0, mLastForegroundPackageName='com.miui.home', mLastForegroundUid=10162,
mLastForegroundPid=2449, mLastForegroundDisplayId=0, mMultiWindowForegroundPackageName='com.bigdrops.app', mMultiWindowForegroundUid=10706,
mFlags=1}
09-27 03:41:44.286  2449  3909 E ActivityManagerWrapper:  mainTaskId=934   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.MAIN flag=270532608 cmp=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} }
09-27 03:41:44.286  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:44.292  2449  3909 W RecentsModel: getRunningTask   taskInfo=TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0
isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256365039
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@8675d8e} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 0 - 0, 0)
topActivityInfo=ActivityInfo{c5849af com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.295  1829  2080 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:true isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.296  6959  7081 I BeautyService: onForegroundInfoChanged: Cur=com.bigdrops.app    last=com.miui.home
09-27 03:41:44.302  2449  3909 E ActivityManagerWrapper:  mainTaskId=934   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.MAIN flag=270532608 cmp=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} }
09-27 03:41:44.302  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:44.307  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=934, stackId=0, baseIntent=Intent { act=android.intent.action.MAIN
cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity }, userId=0, lastActiveTime=256364981, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false, topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
mHashCode=28748346}, title=BigDrops, titleDescription=BigDrops, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=false,
isDockable=true, baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.308  2449  3909 D IconLoader: getBadgedActivityIcon activityInfo :ActivityInfo{464e1bc com.bigdrops.app.MainActivity}
09-27 03:41:44.312  1829  3782 D BarFollowAnimation: onTaskInfoChanedForCaptionBar Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
shouldbeVisible:true isVisible:true isOnTop:true windowMode:1 preDisplayId:-1 displayId:0 mCaptionAssociatedTask:null mIsTouchedInCaption:false
09-27 03:41:44.313 18675  7585 D HWUI    : MiShaderPrecompile handle com.bigdrops.app, isSksl: 0, isAppInPreCacheList: 0, isGpuVersionChanged: 0,
isSkslChanged: 0
09-27 03:41:44.317 30941 30941 D DynamicIslandTopActivityController: fullscreen: com.bigdrops.app
09-27 03:41:44.317 30941 30941 D DynamicIslandController: onTopActivityChanged: ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
09-27 03:41:44.318 30941 30941 D DynamicIslandWindowViewController: onTopActivityChange: topActivity
ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}, inSmallWindow false, isSupportPip false, isFocus true fullScreenPkg com.bigdrops.app
09-27 03:41:44.318 30941 30941 D DynamicIslandSafeguardsController: cancelDelayEnterApp com.bigdrops.app com.zhiliaoapp.musically
09-27 03:41:44.318 30941 30941 D DynamicIslandSafeguardsController: cancelDelayEnterMiniWindow com.bigdrops.app com.bigdrops.app
com.google.android.apps.maps
09-27 03:41:44.318 30941 30941 D DynamicIslandSafeguardsController: cancelDelayExitApp com.bigdrops.app com.miui.home
09-27 03:41:44.318 30941 30941 D DynamicIslandSafeguardsController: cancelDelayExitMiniWindow com.bigdrops.app null
09-27 03:41:44.318 30941 30941 D DynamicIslandSafeguardsController: delayExitApp com.bigdrops.app
09-27 03:41:44.319 30941 30941 D DynamicIslandSafeguardsController: cancelDelayExitApp com.bigdrops.app com.bigdrops.app
09-27 03:41:44.319  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.319  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=934, stackId=0, baseIntent=Intent { act=android.intent.action.MAIN
cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity }, userId=0, lastActiveTime=256364981, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false, topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
mHashCode=28748346}, title=BigDrops, titleDescription=BigDrops, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=false,
isDockable=true, baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.320  1829  2962 D WindowManager: Finishing drawing starting window: Window{e28c533 u0 Splash Screen com.bigdrops.app} mDrawState:
DRAW_PENDING
09-27 03:41:44.320  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 8
09-27 03:41:44.320  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.320  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{e28c533 u0 Splash Screen com.bigdrops.app}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.322 30941 30974 D MiuiDecorationController: relayout::taskId=934, visible=true, bounds=Rect(0, 0 - 1220, 2712), focused=true,
oldImmersive=false, newImmersive=false, windowMode=1, activityType=1, displayId=0,
baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
callers=com.android.wm.shell.multitasking.miuimultiwinswitch.miuiwindowdecor.decoration.MiuiDecorationController.relayout:4
com.android.wm.shell.multitasking.miuimultiwinswitch.miuiwindowdecor.MulWinSwitchDecorViewModel.onTaskInfoChanged:18
com.android.wm.shell.multitasking.common.taskmanager.MultiTaskingTaskListener.onTaskInfoChanged:47
com.android.wm.shell.ShellTaskOrganizer.onTaskInfoChanged:136 android.window.TaskOrganizer$1.lambda$onTaskInfoChanged$6:300
09-27 03:41:44.323 30941 30974 D MiuiFreeformModeController: onFocusTaskChanged taskInfo: TaskInfo{userId=0 taskId=934 effectiveUid=10706
displayId=0 isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256364981
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@87dd749} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 0 - 0, 0)
topActivityInfo=ActivityInfo{a3184e com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=Surface(name=StatusBar Container of Task = 934#125303)/@0x7d1e02
mNavBarParent=Surface(name=NavigationBar Container of Task = 934#125302)/@0xbf69313 mBehindAppLockPkg=null mOriginatingUid=0 isEmbedded=false
shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null mTopActivityRecordName=ActivityRecord{90710355 u0
com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.323  1829  2962 D ActivityTaskManager:  setSkipCaptureLayers tr: Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
09-27 03:41:44.327  1829  1901 I WindowManager: wms.showSurfaceRobustly mWin:Window{e28c533 u0 Splash Screen com.bigdrops.app} in
Surface(name=Splash Screen com.bigdrops.app#125323)/@0xf07a938
09-27 03:41:44.333 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d60218) locale list changing from [] to [en-GB]
09-27 03:41:44.334 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5c398) locale list changing from [] to [en-GB]
09-27 03:41:44.334 18675 18675 I MiResource: Updating cached ResourcesImpl for resources : android.content.res.MiuiResources@176f141, old impl =
android.content.res.MiuiResourcesImpl@492d198, new impl = android.content.res.MiuiResourcesImpl@bf5f857 , new paths =
[/system/framework/framework-res.apk, /vendor/overlay/FrameworkResOverlay/FrameworkResOverlay.apk,
/vendor/overlay/FrameworkResOverlayExt/FrameworkResOverlayExt.apk, /vendor/overlay/ZramWritebackOverlay/ZramWritebackOverlay.apk,
/product/overlay/CaptivePortalLoginFrameworkOverlay.apk, /product/overlay/GmsConfigOverlayASI_Features.apk,
/product/overlay/GmsConfigOverlayCommon.apk, /product/overlay/GmsConfigOverlayComms.apk, /product/overlay/GmsConfigOverlayForHealthConnect.apk,
/product/overlay/GmsConfigOverlayGSA.apk, /product/overlay/GmsConfigOverlayGeotz.apk, /product/overlay/GmsConfigOverlayPersonalSafety.apk,
/product/overlay/GmsConfigOverlayPhotos.apk, /product/overlay/GoogleExtServicesConfigOverlay.apk,
/product/overlay/GoogleHealthFitnessFrameworkOverlay.apk, /product/overlay/GooglePermissionControllerFrameworkOverlay.apk,
/product/overlay/MiuiServiceOverlay/MiuiServiceOverlay.apk, /product/overlay/ModuleMetadataGoogleOverlay.apk,
/product/overlay/SafetyCenterMiuiConfigOverlay.apk, /product/overlay/framework-res__nosdcard__auto_generated_characteristics_rro.apk,
/product/overlay/MiuiHomeLauncherResOverlay.apk, /product/overlay/AospFrameworkResOverlay.apk, /product/overlay/DevicesAndroidOverlay.apk,
/product/overlay/AospFrameworkTelephonyResOverlay.apk, /system_ext/framework/framework-ext-res/framework-ext-res.apk,
/product/overlay/MiuiFrameworkResOverlay.apk, /product/overlay/MiuiFrameworkTelephonyResOverlay.apk,
/system_ext/app/mediatek-res/mediatek-res.apk, /data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk,
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk, /product/overlay/GestureLineOverlay.apk,
/data/resource-cache/com.android.systemui-neutral-CPFL.frro, /data/resource-cache/com.android.systemui-accent-OyRh.frro,
/data/resource-cache/com.android.systemui-dynamic-SPbh.frro]
09-27 03:41:44.334 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5f598) locale list changing from [] to [en-GB]
09-27 03:41:44.334 18675 18675 I MiResource: Updating cached ResourcesImpl for resources : android.content.res.MiuiResources@12fd852, old impl =
android.content.res.MiuiResourcesImpl@cc2bb0a, new impl = android.content.res.MiuiResourcesImpl@3af6f44 , new paths =
[/system/framework/framework-res.apk, /vendor/overlay/FrameworkResOverlay/FrameworkResOverlay.apk,
/vendor/overlay/FrameworkResOverlayExt/FrameworkResOverlayExt.apk, /vendor/overlay/ZramWritebackOverlay/ZramWritebackOverlay.apk,
/product/overlay/CaptivePortalLoginFrameworkOverlay.apk, /product/overlay/GmsConfigOverlayASI_Features.apk,
/product/overlay/GmsConfigOverlayCommon.apk, /product/overlay/GmsConfigOverlayComms.apk, /product/overlay/GmsConfigOverlayForHealthConnect.apk,
/product/overlay/GmsConfigOverlayGSA.apk, /product/overlay/GmsConfigOverlayGeotz.apk, /product/overlay/GmsConfigOverlayPersonalSafety.apk,
/product/overlay/GmsConfigOverlayPhotos.apk, /product/overlay/GoogleExtServicesConfigOverlay.apk,
/product/overlay/GoogleHealthFitnessFrameworkOverlay.apk, /product/overlay/GooglePermissionControllerFrameworkOverlay.apk,
/product/overlay/MiuiServiceOverlay/MiuiServiceOverlay.apk, /product/overlay/ModuleMetadataGoogleOverlay.apk,
/product/overlay/SafetyCenterMiuiConfigOverlay.apk, /product/overlay/framework-res__nosdcard__auto_generated_characteristics_rro.apk,
/product/overlay/MiuiHomeLauncherResOverlay.apk, /product/overlay/AospFrameworkResOverlay.apk, /product/overlay/DevicesAndroidOverlay.apk,
/product/overlay/AospFrameworkTelephonyResOverlay.apk, /system_ext/framework/framework-ext-res/framework-ext-res.apk,
/product/overlay/MiuiFrameworkResOverlay.apk, /product/overlay/MiuiFrameworkTelephonyResOverlay.apk,
/system_ext/app/mediatek-res/mediatek-res.apk, /data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk,
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk, /product/overlay/GestureLineOverlay.apk,
/data/resource-cache/com.android.systemui-neutral-CPFL.frro, /data/resource-cache/com.android.systemui-accent-OyRh.frro,
/data/resource-cache/com.android.systemui-dynamic-SPbh.frro]
09-27 03:41:44.335 18675 18675 I MiResource: Updating cached ResourcesImpl for resources : android.content.res.MiuiResources@e476311, old impl =
android.content.res.MiuiResourcesImpl@492d198, new impl = android.content.res.MiuiResourcesImpl@bf5f857 , new paths =
[/system/framework/framework-res.apk, /vendor/overlay/FrameworkResOverlay/FrameworkResOverlay.apk,
/vendor/overlay/FrameworkResOverlayExt/FrameworkResOverlayExt.apk, /vendor/overlay/ZramWritebackOverlay/ZramWritebackOverlay.apk,
/product/overlay/CaptivePortalLoginFrameworkOverlay.apk, /product/overlay/GmsConfigOverlayASI_Features.apk,
/product/overlay/GmsConfigOverlayCommon.apk, /product/overlay/GmsConfigOverlayComms.apk, /product/overlay/GmsConfigOverlayForHealthConnect.apk,
/product/overlay/GmsConfigOverlayGSA.apk, /product/overlay/GmsConfigOverlayGeotz.apk, /product/overlay/GmsConfigOverlayPersonalSafety.apk,
/product/overlay/GmsConfigOverlayPhotos.apk, /product/overlay/GoogleExtServicesConfigOverlay.apk,
/product/overlay/GoogleHealthFitnessFrameworkOverlay.apk, /product/overlay/GooglePermissionControllerFrameworkOverlay.apk,
/product/overlay/MiuiServiceOverlay/MiuiServiceOverlay.apk, /product/overlay/ModuleMetadataGoogleOverlay.apk,
/product/overlay/SafetyCenterMiuiConfigOverlay.apk, /product/overlay/framework-res__nosdcard__auto_generated_characteristics_rro.apk,
/product/overlay/MiuiHomeLauncherResOverlay.apk, /product/overlay/AospFrameworkResOverlay.apk, /product/overlay/DevicesAndroidOverlay.apk,
/product/overlay/AospFrameworkTelephonyResOverlay.apk, /system_ext/framework/framework-ext-res/framework-ext-res.apk,
/product/overlay/MiuiFrameworkResOverlay.apk, /product/overlay/MiuiFrameworkTelephonyResOverlay.apk,
/system_ext/app/mediatek-res/mediatek-res.apk, /data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk,
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk, /product/overlay/GestureLineOverlay.apk,
/data/resource-cache/com.android.systemui-neutral-CPFL.frro, /data/resource-cache/com.android.systemui-accent-OyRh.frro,
/data/resource-cache/com.android.systemui-dynamic-SPbh.frro]
09-27 03:41:44.335 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5f278) locale list changing from [] to [en-GB]
09-27 03:41:44.335 18675 18675 I MiResource: Updating cached ResourcesImpl for resources : android.content.res.MiuiResources@4ba8c76, old impl =
android.content.res.MiuiResourcesImpl@1efbdf1, new impl = android.content.res.MiuiResourcesImpl@831482d , new paths =
[/system/framework/framework-res.apk, /vendor/overlay/FrameworkResOverlay/FrameworkResOverlay.apk,
/vendor/overlay/FrameworkResOverlayExt/FrameworkResOverlayExt.apk, /vendor/overlay/ZramWritebackOverlay/ZramWritebackOverlay.apk,
/product/overlay/CaptivePortalLoginFrameworkOverlay.apk, /product/overlay/GmsConfigOverlayASI_Features.apk,
/product/overlay/GmsConfigOverlayCommon.apk, /product/overlay/GmsConfigOverlayComms.apk, /product/overlay/GmsConfigOverlayForHealthConnect.apk,
/product/overlay/GmsConfigOverlayGSA.apk, /product/overlay/GmsConfigOverlayGeotz.apk, /product/overlay/GmsConfigOverlayPersonalSafety.apk,
/product/overlay/GmsConfigOverlayPhotos.apk, /product/overlay/GoogleExtServicesConfigOverlay.apk,
/product/overlay/GoogleHealthFitnessFrameworkOverlay.apk, /product/overlay/GooglePermissionControllerFrameworkOverlay.apk,
/product/overlay/MiuiServiceOverlay/MiuiServiceOverlay.apk, /product/overlay/ModuleMetadataGoogleOverlay.apk,
/product/overlay/SafetyCenterMiuiConfigOverlay.apk, /product/overlay/framework-res__nosdcard__auto_generated_characteristics_rro.apk,
/product/overlay/MiuiHomeLauncherResOverlay.apk, /product/overlay/AospFrameworkResOverlay.apk, /product/overlay/DevicesAndroidOverlay.apk,
/product/overlay/AospFrameworkTelephonyResOverlay.apk, /system_ext/framework/framework-ext-res/framework-ext-res.apk,
/product/overlay/MiuiFrameworkResOverlay.apk, /product/overlay/MiuiFrameworkTelephonyResOverlay.apk,
/system_ext/app/mediatek-res/mediatek-res.apk, /data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk,
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk, /product/overlay/GestureLineOverlay.apk,
/data/resource-cache/com.android.systemui-neutral-CPFL.frro, /data/resource-cache/com.android.systemui-accent-OyRh.frro,
/data/resource-cache/com.android.systemui-dynamic-SPbh.frro]
09-27 03:41:44.335 18675 18675 I MiResource: Updating cached ResourcesImpl for resources : android.content.res.MiuiResources@41a6767, old impl =
android.content.res.MiuiResourcesImpl@492d198, new impl = android.content.res.MiuiResourcesImpl@bf5f857 , new paths =
[/system/framework/framework-res.apk, /vendor/overlay/FrameworkResOverlay/FrameworkResOverlay.apk,
/vendor/overlay/FrameworkResOverlayExt/FrameworkResOverlayExt.apk, /vendor/overlay/ZramWritebackOverlay/ZramWritebackOverlay.apk,
/product/overlay/CaptivePortalLoginFrameworkOverlay.apk, /product/overlay/GmsConfigOverlayASI_Features.apk,
/product/overlay/GmsConfigOverlayCommon.apk, /product/overlay/GmsConfigOverlayComms.apk, /product/overlay/GmsConfigOverlayForHealthConnect.apk,
/product/overlay/GmsConfigOverlayGSA.apk, /product/overlay/GmsConfigOverlayGeotz.apk, /product/overlay/GmsConfigOverlayPersonalSafety.apk,
/product/overlay/GmsConfigOverlayPhotos.apk, /product/overlay/GoogleExtServicesConfigOverlay.apk,
/product/overlay/GoogleHealthFitnessFrameworkOverlay.apk, /product/overlay/GooglePermissionControllerFrameworkOverlay.apk,
/product/overlay/MiuiServiceOverlay/MiuiServiceOverlay.apk, /product/overlay/ModuleMetadataGoogleOverlay.apk,
/product/overlay/SafetyCenterMiuiConfigOverlay.apk, /product/overlay/framework-res__nosdcard__auto_generated_characteristics_rro.apk,
/product/overlay/MiuiHomeLauncherResOverlay.apk, /product/overlay/AospFrameworkResOverlay.apk, /product/overlay/DevicesAndroidOverlay.apk,
/product/overlay/AospFrameworkTelephonyResOverlay.apk, /system_ext/framework/framework-ext-res/framework-ext-res.apk,
/product/overlay/MiuiFrameworkResOverlay.apk, /product/overlay/MiuiFrameworkTelephonyResOverlay.apk,
/system_ext/app/mediatek-res/mediatek-res.apk, /data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk,
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk, /product/overlay/GestureLineOverlay.apk,
/data/resource-cache/com.android.systemui-neutral-CPFL.frro, /data/resource-cache/com.android.systemui-accent-OyRh.frro,
/data/resource-cache/com.android.systemui-dynamic-SPbh.frro]
09-27 03:41:44.335 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5dfb8) locale list changing from [] to [en-GB]
09-27 03:41:44.337  2449  3909 W RecentsModel: getRunningTask   taskInfo=TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0
isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256365084
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@2859066} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 0 - 0, 0)
topActivityInfo=ActivityInfo{9c1bfa7 com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.341  2449  3909 E ActivityManagerWrapper:  mainTaskId=934   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.MAIN flag=270532608 cmp=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} }
09-27 03:41:44.341  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:44.349  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=934, stackId=0, baseIntent=Intent { act=android.intent.action.MAIN
cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity }, userId=0, lastActiveTime=256364981, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false, topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
mHashCode=28748346}, title=BigDrops, titleDescription=BigDrops, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=false,
isDockable=true, baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.349  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.360 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d63418) locale list changing from [] to [en-GB]
09-27 03:41:44.363 18675 18675 D nativeloader: Load
/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk!/lib/arm64-v8a/libwebviewchromium.so using class
loader ns clns-11 (caller=/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk): ok
09-27 03:41:44.364 18675 18675 D nativeloader: Load /system/lib64/libwebviewchromium_plat_support.so using class loader ns clns-11
(caller=/data/app/~~NFfL8fDjG7VZLj8jQHc6bg==/com.google.android.webview-v5zYUYcyP7QmOX8rii2smw==/base.apk): ok
09-27 03:41:44.366 18675  7606 I chromium: [0927/034144.365760:INFO:android_webview/browser/variations/variations_seed_loader.cc:67] Failed to
open file for reading.: No such file or directory (2)
09-27 03:41:44.379 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d60538) locale list changing from [] to [en-GB]
09-27 03:41:44.380 18675 18675 I om.bigdrops.app: AssetManager2(0xb400006e18d5d338) locale list changing from [] to [en-GB]
09-27 03:41:44.384  1829  2080 D MiuiEmbeddingWindow: blacklistedAppRunningOnPhone: package=com.bigdrops.appisNotProjeciton=true
isHavingJeppackDisabledConfig=false isRunningOnPhone=true isAppleConnection=false
09-27 03:41:44.384  1829  2080 D MiuiEmbeddingWindow: MiuiEmbeddingWindowService: updateApplicationInfo for com.bigdrops.app,
blacklistedAppRunningOnPhone updated: clear
09-27 03:41:44.384  1829  2080 I SmartPower: com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedPr-1->background(0ms)
R(become background) adj=-10000.
09-27 03:41:44.403  1829  1930 I ActivityManager: Start proc
7616:com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0/u0i681 for
{com.bigdrops.app/org.chromium.content.app.SandboxedProcessService0:0} caller=com.bigdrops.app
09-27 03:41:44.428  7616  7616 I RENDER_TURBO: onActivityThreadCreate not in white list,
pkg=com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0, type=corot
09-27 03:41:44.432  1829  2942 D ConnectivityService: requestNetwork for uid/pid:10706/18675 activeRequest: null callbackRequest: 86963
[NetworkRequest [ REQUEST id=86964, [ Capabilities: INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VCN_MANAGED&NOT_BANDWIDTH_CONSTRAINED Uid: 10706
RequestorUid: 10706 RequestorPkg: com.bigdrops.app UnderlyingNetworks: Null] ]] callback flags: 0 order: 2147483647 isUidTracked: false
declaredMethods: AVAIL|LOST|NC|LP
09-27 03:41:44.433  1829  2194 D WifiNetworkFactory: got request NetworkRequest [ REQUEST id=86964, [ Capabilities:
INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VCN_MANAGED&NOT_BANDWIDTH_CONSTRAINED Uid: 10706 RequestorUid: 10706 RequestorPkg: com.bigdrops.app
UnderlyingNetworks: Null] ]
09-27 03:41:44.433  1829  2194 D UntrustedWifiNetworkFactory: got request NetworkRequest [ REQUEST id=86964, [ Capabilities:
INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VCN_MANAGED&NOT_BANDWIDTH_CONSTRAINED Uid: 10706 RequestorUid: 10706 RequestorPkg: com.bigdrops.app
UnderlyingNetworks: Null] ]
09-27 03:41:44.433  1829  2194 D OemPaidWifiNetworkFactory: got request NetworkRequest [ REQUEST id=86964, [ Capabilities:
INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VCN_MANAGED&NOT_BANDWIDTH_CONSTRAINED Uid: 10706 RequestorUid: 10706 RequestorPkg: com.bigdrops.app
UnderlyingNetworks: Null] ]
09-27 03:41:44.434  1829  2194 D MultiInternetWifiNetworkFactory: got request NetworkRequest [ REQUEST id=86964, [ Capabilities:
INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VCN_MANAGED&NOT_BANDWIDTH_CONSTRAINED Uid: 10706 RequestorUid: 10706 RequestorPkg: com.bigdrops.app
UnderlyingNetworks: Null] ]
09-27 03:41:44.434  7616  7616 D ActivityThread: setEmbeddedParam packageName=com.bigdrops.app
processName=com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0 isEmbedded=false isIsolated=true
09-27 03:41:44.438  7616  7616 I cr_WebViewApkApp: version=153.0.8010.39 (801003903) minSdkVersion=29
processName=com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0 splits=<none>
09-27 03:41:44.439  7616  7638 I ForceDarkHelperStubImpl: initialize for com.bigdrops.app , ForceDarkOrigin
09-27 03:41:44.458 18675 18675 D Capacitor: Starting BridgeActivity
09-27 03:41:44.470 30941 30941 D DynamicIslandSafeguardsController: delayExitApp: com.bigdrops.app com.bigdrops.app count = 0
09-27 03:41:44.482 11104 11451 I HeavyPackageIdentify: splitMode: false, splitPackages: null, foregroundPkg: com.bigdrops.app
09-27 03:41:44.522  7616  7659 W chromium: [WARNING:content/app/android/content_main_android.cc:82] android_setCpu already initialized
09-27 03:41:44.530  7616  7659 W chromium: [WARNING:content/child/runtime_features.cc:497] Fenced frames cannot be enabled in this configuration.
Use --enable-features=FencedFrames instead.
09-27 03:41:44.533 18675  7665 D vulkan  : searching for layers in
'/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/lib/arm64'
09-27 03:41:44.534 18675  7665 D vulkan  : searching for layers in
'/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk!/lib/arm64-v8a'
09-27 03:41:44.535 18675 18675 D Activity: Activity = ActivityInfo{411cfa6 com.bigdrops.app.MainActivity}, Resume onConfigurationChanged = {1.0
621mcc50mnc [en_GB] ldltr sw407dp w407dp h904dp 480dpi nrml long hdr widecg port night finger -keyb/v/h -nav/h winConfig={ mBounds=Rect(0, 0 -
1220, 2712) mAppBounds=Rect(0, 0 - 1220, 2712) mMaxBounds=Rect(0, 0 - 1220, 2712) mDisplayRotation=ROTATION_0 mWindowingMode=fullscreen
mActivityType=standard mAlwaysOnTop=undefined mRotation=ROTATION_0 mInSplitScreen=false letterBoxed=false foScaled=false isSpecificEmbedded=false
embeddingScale=1.0} as.4 s.2 fontWeightAdjustment=0/d/o themeChanged=0 themeChangedFlags=0 display=0 extraData = Bundle[{}] screenType=0/o}
09-27 03:41:44.536  1829  2080 D BiometricService/PreAuthInfo: Package: com.bigdrops.app Sensor ID: 0 Modality: 2 User id: 0 Status: 1
09-27 03:41:44.536  1829  2942 D BiometricService/PreAuthInfo: Package: com.bigdrops.app Sensor ID: 0 Modality: 2 User id: 0 Status: 1
09-27 03:41:44.538 18675  7665 D libMEOW : applied 1 plugins for [com.bigdrops.app]:
09-27 03:41:44.538  1829  2942 D BiometricService/PreAuthInfo: Package: com.bigdrops.app Sensor ID: 0 Modality: 2 User id: 0 Status: 1
09-27 03:41:44.539  1829  2942 D BiometricService/PreAuthInfo: Package: com.bigdrops.app Sensor ID: 0 Modality: 2 User id: 0 Status: 1
09-27 03:41:44.553  7616  7683 I chromium: [INFO:third_party/skia/src/ports/SkFontMgr_android_parser.cpp:724] [SkFontMgr Android Parser]
'/product/etc/fonts_customization.xml' could not be opened
09-27 03:41:44.553  7616  7683 I chromium:
09-27 03:41:44.563 18675 18675 D om.bigdrops.app: MiuiProcessManagerServiceStub setSchedFifo
09-27 03:41:44.572 18675 18675 I ForceDarkHelperStubImpl: setViewRootImplForceDark: false for com.bigdrops.app.MainActivity@7f37d8b, reason:
AppDarkModeEnable
09-27 03:41:44.580  1829  3782 D AccessControlImpl: activityResume packageName: com.bigdrops.app userId: 0 enabled: trueisTranslucent false
09-27 03:41:44.580  2449  2449 D RecentsImpl: mActivityStateObserver com.bigdrops.app.MainActivity
09-27 03:41:44.580  2449  2449 W RecentsImpl: updateGestureWindowVisibleImpl, className=com.bigdrops.app.MainActivity
09-27 03:41:44.599  1829  3782 D CoreBackPreview: Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}: Setting back callback
OnBackInvokedCallbackInfo{mCallback=android.window.IOnBackInvokedCallback$Stub$Proxy@3c15891, mPriority=-1, mIsAnimationCallback=false,
mOverrideBehavior=0}
09-27 03:41:44.600 18675 18675 D DecorViewImmersiveImpl: onAttachedToWindow. pkg: com.bigdrops.app
09-27 03:41:44.600 18675 18675 D DecorViewImmersiveImpl: com.bigdrops.app.MainActivity@7f37d8b already set forced E2E by app
09-27 03:41:44.600  1829  3782 D CoreBackPreview: Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}: Setting back callback
OnBackInvokedCallbackInfo{mCallback=android.window.IOnBackInvokedCallback$Stub$Proxy@37513f6, mPriority=0, mIsAnimationCallback=true,
mOverrideBehavior=0}
09-27 03:41:44.604  1829  2080 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 8
09-27 03:41:44.605  1829  2080 D BarFollowAnimation: isAppTaskBarOnTop win:Window{e28c533 u0 Splash Screen com.bigdrops.app}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.605  1829  2080 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.607  1829  2080 D BarFollowAnimation: current status bar control target is : Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity}
09-27 03:41:44.609  1829  2080 D WindowManager: updateSystemBarAttributes displayId: 16777216 Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} winAppearance=
09-27 03:41:44.609  1829  2080 D WindowManager: wms.Input focus has changed to Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
display=0 updateInputWindows = true
09-27 03:41:44.609  1829  2351 D ScrollScenario: ScrollState: fling start on com.bigdrops.app
09-27 03:41:44.609  1829  2080 I WindowManager: Allow fixed rotation for not collecting:ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity
t934}
09-27 03:41:44.610  1829  1898 D WmSystemUiDebug: on system bar attributes changed displayId=16777216 appearance=LIGHT_NAVIGATION_BARS
appearanceRegions=[AppearanceRegion{LIGHT_STATUS_BARS bounds=[0,0][1220,2712]}] navbarColorManagedByIme=false behavior=1
requestedVisibleTypes=[statusBars navigationBars captionBar systemGestures mandatorySystemGestures tappableElement displayCutout windowDecor
systemOverlays] packageName=com.bigdrops.app letterboxDetails=[]
09-27 03:41:44.611  1829  1901 D SurfaceComposerClient: Transaction::apply InputWindowCommands.focusRequests timestamp=245058275970221,
windowName=dd51759 com.bigdrops.app/com.bigdrops.app.MainActivity
09-27 03:41:44.611 18675 18675 E om.bigdrops.app: [perfctl] 18675 18675 FPSGO ver:0
09-27 03:41:44.611 18675 18675 E om.bigdrops.app: [perfctl] 0 0 0 0
09-27 03:41:44.628  1143  1736 D SurfaceFlinger: updateWinowInfo=1, setFocusedWindow timestamp=245058275970221, windowName=dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity
09-27 03:41:44.642  1829  3782 D WindowManager: wms.finishDrawingLocked: mDrawState=COMMIT_DRAW_PENDING Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} in Surface(name=com.bigdrops.app/com.bigdrops.app.MainActivity#125325)/@0xa8f4264
09-27 03:41:44.642  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 8
09-27 03:41:44.642  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.643  1829  1901 D WindowManager: wms.commitFinishDrawingLocked: mDrawState=READY_TO_SHOW Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} in Surface(name=com.bigdrops.app/com.bigdrops.app.MainActivity#125325)/@0xa8f4264
09-27 03:41:44.643  1829  1901 I WindowManager: onFirstWindowDrawn, try to remove startingWindow. ar: ActivityRecord{90710355 u0
com.bigdrops.app/.MainActivity t934}  associatedTask: null  isMainWindow: true  startingWindow: Window{e28c533 u0 Splash Screen com.bigdrops.app}
startingData: SplashScreenStartingData{3e4c6c1 removeAfterTransaction= 0}
09-27 03:41:44.645  1829  1901 I AppStartScenario: notifyScenarioChanged: active=false param=Bundle[{renderThreadId=7585, pid=18675, uid=10706,
name=com.bigdrops.app.MainActivity, type=2, state=2, processName=com.bigdrops.app, packageName=com.bigdrops.app}]
09-27 03:41:44.647  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app} 8
09-27 03:41:44.648  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.648  1829  1868 I ActivityTaskManager: Displayed com.bigdrops.app/.MainActivity for user 0: +427ms
09-27 03:41:44.648 18675 18675 D WindowLayoutComponentImpl: Register WindowLayoutInfoListener on Context=com.bigdrops.app.MainActivity@7f37d8b, of
which baseContext=androidx.appcompat.view.ContextThemeWrapper@45fea4a, of which baseContext=android.app.ContextImpl@5757dbb
09-27 03:41:44.654  1829  3783 W AppCompatLetterboxPolicy: start not layout letterbox Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
09-27 03:41:44.655  1829  3783 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.655  1829  3783 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.656  1829  3783 D WindowManager: updateSystemBarAttributes displayId: 16777216 Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} winAppearance=
09-27 03:41:44.657  1829  1898 D WmSystemUiDebug: on system bar attributes changed displayId=16777216 appearance=
appearanceRegions=[AppearanceRegion{LIGHT_STATUS_BARS bounds=[0,0][1220,2712]}] navbarColorManagedByIme=false behavior=1
requestedVisibleTypes=[statusBars navigationBars captionBar systemGestures mandatorySystemGestures tappableElement displayCutout windowDecor
systemOverlays] packageName=com.bigdrops.app letterboxDetails=[]
09-27 03:41:44.664  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.665  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.666  1829  1901 I WindowManager: wms.showSurfaceRobustly mWin:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity} in
Surface(name=com.bigdrops.app/com.bigdrops.app.MainActivity#125325)/@0xa8f4264
09-27 03:41:44.670  2449  3909 W RecentsModel: getRunningTask   taskInfo=TaskInfo{userId=0 taskId=934 effectiveUid=10706 displayId=0
isRunning=true baseIntent=Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000
cmp=com.bigdrops.app/.MainActivity } baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}
topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} origActivity=null
realActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} numActivities=1 lastActiveTime=256365416
supportsSplitScreenMultiWindow=true mSoScDisplayMode=-1 supportsMultiWindow=true resizeMode=1 isResizeable=true minWidth=-1 minHeight=-1
defaultMinSize=200 token=WCT{android.window.IWindowContainerToken$Stub$Proxy@4a2884a} topActivityType=1 pictureInPictureParams=null
shouldDockBigOverlays=false launchIntoPipHostTaskId=-1 lastParentTaskIdBeforePip=-1 displayCutoutSafeInsets=Rect(0, 0 - 0, 0)
topActivityInfo=ActivityInfo{1f6c3bb com.bigdrops.app.MainActivity} launchCookies=[] positionInParent=Point(0, 0) parentTaskId=-1 isFocused=true
isVisible=true isVisibleRequested=true isTopActivityNoDisplay=false isSleeping=false locusId=null displayAreaFeatureId=1
isTopActivityTransparent=false isActivityStackTransparent=false lastNonFullscreenBounds=Rect(318, 780 - 902, 2000) capturedLink=null
capturedLinkTimestamp=0 requestedVisibleTypes=-9 topActivityRequestOpenInBrowserEducationTimestamp=0 appCompatTaskInfo=AppCompatTaskInfo {
topActivityInSizeCompat=false eligibleForLetterboxEducation= false topActivityInMiuiSizeCompat=false isLetterboxEducationEnabled= false
isLetterboxDoubleTapEnabled= false eligibleForUserAspectRatioButton= false topActivityBoundsLetterboxed= false isFromLetterboxDoubleTap= false
topActivityLetterboxVerticalPosition= -1 topActivityLetterboxHorizontalPosition= -1 topActivityLetterboxWidth=-1 topActivityLetterboxHeight=-1
topActivityAppBounds=Rect(0, 0 - 1220, 2712) isUserFullscreenOverrideEnabled=false isSystemFullscreenOverrideEnabled=false
hasMinAspectRatioOverride=false topActivityLetterboxBounds=null cameraCompatTaskInfo=CameraCompatTaskInfo { freeformCameraCompatMode=inactive}}
isImmersive=false mTopActivityRequestOrientation=-1 mStatusBarParent=null mNavBarParent=null mBehindAppLockPkg=null mOriginatingUid=0
isEmbedded=false shouldBeVisible=true isCreatedByOrganizer=false mIsCastMode=false mTopActivityMediaSize=null
mTopActivityRecordName=ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} mTopActivityOrientation=-1 topActivityMainWindowFrame=null}
09-27 03:41:44.675  1143  1143 I SurfaceFlinger: onHandleDestroyed: layerId=125329, name=Surface(name=dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity#125324)/@0x8a033ff - animation-leash of starting_reveal#125329
09-27 03:41:44.681  2449  3909 E ActivityManagerWrapper:  mainTaskId=934   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.MAIN flag=270532608 cmp=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity} }
09-27 03:41:44.681  2449  3909 E ActivityManagerWrapper:  mainTaskId=927   userId=0   windowMode=1   isExcludedFromRecents=false
baseIntent=Intent { act=android.intent.action.VIEW flag=335552513
cmp=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity} }
09-27 03:41:44.685  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=934, stackId=0, baseIntent=Intent { act=android.intent.action.MAIN
cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.bigdrops.app/.MainActivity }, userId=0, lastActiveTime=256364981, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false, topActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity},
mHashCode=28748346}, title=BigDrops, titleDescription=BigDrops, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=false,
isDockable=true, baseActivity=ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.686  2449  3909 D RecentsTaskLoader: reloadTasksData [TaskKey{id=927, stackId=0, baseIntent=Intent { act=android.intent.action.VIEW
dat=content://com.android.providers.media.documents/... typ=text/html flg=0x14002001
cmp=com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity }, userId=0, lastActiveTime=254300464, windowingMode=1,
isThumbnailBlur=false, isAccessLocked=false, isScreening=false,
topActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.app.download.home.DownloadActivity}, mHashCode=28539809}, title=Chrome,
titleDescription=Chrome, bounds=null, isLaunchTarget=true, isStackTask=true, isSystemApp=true, isDockable=true,
baseActivity=ComponentInfo{com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity}, isLocked=false, mNeedHide=false,
hasMultipleTasks=false, cti1Key=, cti2Key=, cti1Task=, cti2Task=]
09-27 03:41:44.686  1829  2157 I ImeTracker: com.bigdrops.app:63ab8555: onRequestHide at ORIGIN_SERVER reason HIDE_UNSPECIFIED_WINDOW fromUser
false
09-27 03:41:44.687 18675 18675 I ImeTracker: com.bigdrops.app:63ab8555: onCancelled at PHASE_CLIENT_ALREADY_HIDDEN
09-27 03:41:44.690 14596 14596 I GoogleInputMethodService: GoogleInputMethodService.onStartInput():1532
onStartInput(EditorInfo{EditorInfo{packageName=com.bigdrops.app, inputType=0, inputTypeString=NULL, enableLearning=false, autoCorrection=false,
autoComplete=false, imeOptions=12000000, privateImeOptions=null, actionName=UNSPECIFIED, actionLabel=null, initialSelStart=-1, initialSelEnd=-1,
initialCapsMode=0, label=null, fieldId=0, fieldName=null, extras=Bundle[mParcelledData.dataSize=72], hintText=null, hintLocales=[]}}, false)
09-27 03:41:44.690  1829  3782 D MiuiSplitInputMethodImpl: Make sure ime layering to: Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} when transition animation start
09-27 03:41:44.691  1829  3782 D MiuiMirrorInputMethodImpl: InsetsControlTarget invalid!:Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity}
09-27 03:41:44.691  1829  2942 W PackageConfigPersister: App-specific configuration not found for packageName: com.bigdrops.app and userId: 0
09-27 03:41:44.693  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.693  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.758  2449  2449 I LaunchAppAndBackHomeAnimTarget: resetShortcutIcon, icon=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL.
........ 896,1450-1182,1740}(BigDrops)
09-27 03:41:44.758  2449  2449 I LaunchAppAndBackHomeAnimTarget: resetShortcutIcon, icon=com.miui.home.launcher.ShortcutIcon{7b1e1a9 VFED..CL.
......ID 896,1450-1182,1740}(BigDrops)
09-27 03:41:44.764  1829  2684 I TransitionImpl: finishTransition: updateLastSurfacePosition tf=Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app}
09-27 03:41:44.765  1829  1900 I PowerHalWrapper: amsBoostNotify pid:2449,activity:com.miui.home.launcher.Launcher, package:com.miui.home,
mProcessCreatePackcom.bigdrops.app
09-27 03:41:44.765  1049  1049 I MTK_APPList: [getForegroundAPPInfo]  com.bigdrops.app/com.bigdrops.app.MainActivity (pid=18675)
09-27 03:41:44.766  1049  1049 I vendor.mediatek.hardware.mtkpower_applist-service.mediatek: MIUI ADDpackName: com.bigdrops.app actName:
com.bigdrops.app.MainActivity
09-27 03:41:44.766  1049  1049 I MTK_APPList: [notifyAPPstate] multi_resumed_app_info[0] com.bigdrops.app/com.bigdrops.app.MainActivity,
pid:18675, fps:-1, isMultiWindow:0
09-27 03:41:44.769  1829  2419 D BarFollowAnimation: checkBarStatus mReparentToOriginParent:false hasTopFullAppTask:true mHomeTask:Task{1688dd8 #1
type=home} mCurrentTopTask: Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} mAssociatedTask: Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} homeTaskonTop:false mCurrentTaskIsTop: true mLastAppBarVisible:true mLastHomeBarVisible:false isInSplitScreen:false
09-27 03:41:44.769  1829  2419 D BarFollowAnimation:  showAppNavBar  packageName = com.bigdrops.app mHasHideAppSurface = false
mIsKeyguardGoingAway = false mNavBarState = -1
09-27 03:41:44.769  1829  2419 D BarFollowAnimation: calculateAppSurface: task=Task{cc97faf #934 type=standard A=10706:com.bigdrops.app}
appSurface=Surface(name=NavigationBar Container of Task = 934#125302)/@0x40ebb45
09-27 03:41:44.774  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.775  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.780  1829  2962 W AppCompatLetterboxPolicy: start not layout letterbox Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
09-27 03:41:44.780  1829  2962 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.781  1829  2962 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.784  1829  3284 W AppCompatLetterboxPolicy: start not layout letterbox Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
09-27 03:41:44.784  1829  3284 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.784  1829  3284 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.784  1829  2344 I SmartPower:
com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedPridle->background(13309ms) R(add to whitelist) adj=800.
09-27 03:41:44.791  1829  2684 W AppCompatLetterboxPolicy: start not layout letterbox Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
09-27 03:41:44.792  1829  2684 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.792  1829  2684 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.808  1829  1901 W AppCompatLetterboxPolicy: start not layout letterbox Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
09-27 03:41:44.808  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING} 8
09-27 03:41:44.808  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.824  1829  1901 I WindowManager: StartingWindow exit animation finished, win = Window{e28c533 u0 Splash Screen com.bigdrops.app
EXITING} remove = true
09-27 03:41:44.824  1829  1901 I WindowManager: wms.hideSurface mWin:Window{e28c533 u0 Splash Screen com.bigdrops.app EXITING}
reason:(onExitAnimationDone) in Surface(name=Splash Screen com.bigdrops.app#125323)/@0xf07a938
09-27 03:41:44.825  1829  1901 D WindowManager: postWindowRemoveCleanupLocked: Removing startingWindow Window{e28c533 u0 Splash Screen
com.bigdrops.app} from ActivityRecord{90710355 u0 com.bigdrops.app/.MainActivity t934} activity = ActivityRecord{90710355 u0
com.bigdrops.app/.MainActivity t934}
09-27 03:41:44.826  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} 0
09-27 03:41:44.826  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.826  1829  1901 D WindowManager: updateSystemBarAttributes displayId: 16777216 Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} winAppearance=
09-27 03:41:44.826  1829  1898 D WmSystemUiDebug: on system bar attributes changed displayId=16777216 appearance=
appearanceRegions=[AppearanceRegion{ bounds=[0,0][1220,2712]}] navbarColorManagedByIme=false behavior=1 requestedVisibleTypes=[statusBars
navigationBars captionBar systemGestures mandatorySystemGestures tappableElement displayCutout windowDecor systemOverlays]
packageName=com.bigdrops.app letterboxDetails=[]
09-27 03:41:44.841  1829  1901 D BarFollowAnimation: pairAppearanceRegionAndWin win=Window{dd51759 u0
com.bigdrops.app/com.bigdrops.app.MainActivity} 0
09-27 03:41:44.842  1829  1901 D BarFollowAnimation: isAppTaskBarOnTop win:Window{dd51759 u0 com.bigdrops.app/com.bigdrops.app.MainActivity}
(mCurrentTopTask:Task{cc97faf #934 type=standard A=10706:com.bigdrops.app} : true); (mAssociatedTask:Task{cc97faf #934 type=standard
A=10706:com.bigdrops.app} : true); (mHomeTask:Task{1688dd8 #1 type=home} : false); mReparentToOriginParent:false mLastAppBarVisible:true
mLastHomeBarVisible:false
09-27 03:41:44.858  1143  1143 I SurfaceFlinger: onHandleDestroyed: layerId=125323, name=Splash Screen com.bigdrops.app#125323
09-27 03:41:44.858  1143  1143 I SurfaceFlinger: onHandleDestroyed: layerId=125330, name=Surface(name=e28c533 Splash Screen
com.bigdrops.app#125309)/@0x97ba669 - animation-leash of window_animation#125330
09-27 03:41:44.858  1143  1143 I SurfaceFlinger: onHandleDestroyed: layerId=125309, name=e28c533 Splash Screen com.bigdrops.app#125309
09-27 03:41:44.907 18675  7660 D nativeloader: Load
/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk!/lib/arm64-v8a/libsqlcipher.so using class loader ns
clns-10 (caller=/data/app/~~_c9ZrpCmfVAz2b1OaQ6j7Q==/com.bigdrops.app-Pgu4v6V8TwR-6JKqaZ13Dw==/base.apk): ok
09-27 03:41:44.913 18675  7660 V com.getcapacitor.community.database.sqlite.SQLite.Database: &&& file path
/data/user/0/com.bigdrops.app/databases/bigdrops_localSQLite.db
09-27 03:41:44.919 18675  7660 V com.getcapacitor.community.database.sqlite.RetHandler: *** ERROR ExecuteSet: No value for values
09-27 03:41:45.008  1829  2327 E HyperSentinel: ->pid:18675,processName:"com.bigdrops.app",Rss Memory Size Change 315932kb -> 399580kb
09-27 03:41:45.559  2449  2449 I TransitionCallback: clear leash =
Surface(name=TL_Surface(name=Task=934#125301)/@0x1c302e_transition-leash#125317)/@0x88c819, key =
ComponentInfo{com.bigdrops.app/com.bigdrops.app.MainActivity}#934
09-27 03:41:45.668  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=50.48 dur=1010.21
max=116.96 min=15.58
09-27 03:41:45.679  1829  5402 D PreStartingCapture: Remove bitmap after load, pkg: com.bigdrops.app  mBitmapDrawableCache: {}
09-27 03:41:45.722 18675  7585 W RenderInspector: DequeueBuffer time out on com.bigdrops.app/com.bigdrops.app.MainActivity, count=1, avg=16 ms,
max=16 ms.
09-27 03:41:46.677  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.49 dur=1008.39
max=17.64 min=15.41
09-27 03:41:46.797 18675 18675 W RenderThread: type=1400 audit(0.0:4122252): avc:  denied  { getattr } for
path="/sys/module/metis/parameters/minor_window_app" dev="sysfs" ino=114561 scontext=u:r:untrusted_app:s0:c194,c258,c512,c768
tcontext=u:object_r:sysfs_migt:s0 tclass=file permissive=0 app=com.bigdrops.app
09-27 03:41:47.610  1829  2351 D ScrollScenario: ScrollState: fling end on com.bigdrops.app
09-27 03:41:47.686  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.28
max=17.58 min=15.60
09-27 03:41:47.798  1829  2344 I SmartPower:
com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedPrbackground->idle(3014ms) R(adj below visible) adj=800.
09-27 03:41:48.739  1829  2327 E HyperSentinel: ->pid:18675,processName:"com.bigdrops.app",Rss Memory Size Change 399580kb -> 518564kb
09-27 03:41:48.778  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=35.71 dur=1092.27
max=314.97 min=16.38
09-27 03:41:48.896  1829  2327 E HyperSentinel: ->pid:18675,processName:"com.bigdrops.app",Rss Memory Size Change 518564kb -> 624960kb
09-27 03:41:49.646 18675  7585 E om.bigdrops.app: FrameInsert open fail: No such file or directory
09-27 03:41:49.787  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=42.61 dur=1009.19
max=248.31 min=15.92
09-27 03:41:50.343 18675  7802 D ProfileInstaller: Skipping profile installation for com.bigdrops.app
09-27 03:41:50.796  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.17
max=17.95 min=15.42
09-27 03:41:51.424  1829  2142 I MiuiInputUtil: MiuiSpecialWindowInfo: dd51759 com.bigdrops.app/com.bigdrops.app.MainActivity(9,0x0,0x0,[0,0,1220,2
712],1.00);GestureStubLeft(4,0x104,0x0,[0,234,62,2637],1.00);GestureStubRight(3,0x104,0x0,[1158,234,1220,2637],1.00);GestureStubHome(5,0x104,0x0,[0
,2637,1220,2712],1.00);GestureStub<none>;StatusBar1(8,0x104,0x0,[0,0,1220,117],1.00);StatusBar(17,0x106,0x0,[0,0,1220,117],0.00);
09-27 03:41:51.424  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245065088, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:51.428 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245065088, downTime=245065088, phoneEventTime=1790476911422 } moveCount:0
09-27 03:41:51.523  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245065187, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:51.524 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245065187, downTime=245065088, phoneEventTime=1790476911522 } moveCount:0
09-27 03:41:51.758  1829  2327 E HyperSentinel: ->pid:18675,processName:"com.bigdrops.app",Rss Memory Size Change 624960kb -> 758496kb
09-27 03:41:51.807  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=57.39 dur=1010.57
max=66.20 min=15.00
09-27 03:41:52.816  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.34
max=19.96 min=13.85
09-27 03:41:52.948  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245066613, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:52.960 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245066613, downTime=245066613, phoneEventTime=1790476912947 } moveCount:0
09-27 03:41:53.053  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245066717, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:53.062 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245066717, downTime=245066613, phoneEventTime=1790476913051 } moveCount:0
09-27 03:41:53.369 18675  7585 W RenderInspector: QueueBuffer time out on com.bigdrops.app/com.bigdrops.app.MainActivity, count=1, avg=19 ms,
max=19 ms.
09-27 03:41:53.824  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=53.57 dur=1007.95
max=131.26 min=15.19
09-27 03:41:53.973  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245067637, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:53.973 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245067637, downTime=245067637, phoneEventTime=1790476913971 } moveCount:0
09-27 03:41:54.026  1829  2351 D ScrollScenario: ScrollState: scroll start on com.bigdrops.app
09-27 03:41:54.074  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245067739, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:54.076  1829  2351 D ScrollScenario: ScrollState: fling start on com.bigdrops.app
09-27 03:41:54.076  1829  2351 D ScrollScenario: ScrollState: scroll end on com.bigdrops.app
09-27 03:41:54.077  1049  1049 I MTK_APPList: [getForegroundAPPInfo]  com.bigdrops.app/com.bigdrops.app.MainActivity (pid=18675)
09-27 03:41:54.077  1049  1049 I vendor.mediatek.hardware.mtkpower_applist-service.mediatek: MIUI ADDpackName: com.bigdrops.app actName:
com.bigdrops.app.MainActivity
09-27 03:41:54.081 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245067739, downTime=245067637, phoneEventTime=1790476914074 } moveCount:5
09-27 03:41:54.096 18675  7585 E om.bigdrops.app: legacy_receive_flag: 0
09-27 03:41:54.097 18675  7585 D om.bigdrops.app: /proc/perfmgr_sbe/sbe_ioctl not exists: No such file or directory
09-27 03:41:54.793 18675 18675 W FinalizerDaemon: type=1400 audit(0.0:4122253): avc:  denied  { getopt } for  path="/dev/socket/usap_pool_primary"
scontext=u:r:untrusted_app:s0:c194,c258,c512,c768 tcontext=u:r:zygote:s0 tclass=unix_stream_socket permissive=0 app=com.bigdrops.app
09-27 03:41:54.833  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.14
max=17.99 min=15.19
09-27 03:41:54.969  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245068634, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:54.973 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245068634, downTime=245068634, phoneEventTime=1790476914968 } moveCount:0
09-27 03:41:55.085  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245068750, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:55.090 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245068750, downTime=245068634, phoneEventTime=1790476915084 } moveCount:0
09-27 03:41:55.843  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.23
max=17.51 min=15.67
09-27 03:41:56.852  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.24
max=16.78 min=16.37
09-27 03:41:57.067  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245070732, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:57.076 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245070732, downTime=245070732, phoneEventTime=1790476917067 } moveCount:0
09-27 03:41:57.076  1829  2351 D ScrollScenario: ScrollState: fling end on com.bigdrops.app
09-27 03:41:57.215  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245070880, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:41:57.216 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245070880, downTime=245070732, phoneEventTime=1790476917214 } moveCount:1
09-27 03:41:57.861  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.47 dur=1008.78
max=16.80 min=16.33
09-27 03:41:58.687  1829  2327 E HyperSentinel:
->pid:7616,processName:"com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:",Rss Memory Size Change
242580kb -> 307292kb
09-27 03:41:58.870  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.46 dur=1008.95
max=17.54 min=15.66
09-27 03:41:59.690  1829  2327 E HyperSentinel: ->pid:18675,processName:"com.bigdrops.app",Rss Memory Size Change 758496kb -> 603308kb
09-27 03:41:59.703 18675  7835 E FilePhenotypeFlags: Config package com.google.android.gms.clearcut_client#com.bigdrops.app cannot use FILE
backing without declarative registration. See go/phenotype-android-integration#phenotype for more information. This will lead to stale flags.
09-27 03:41:59.704 18675  7835 E FilePhenotypeFlags: Config package com.google.android.gms.clearcut_client#com.bigdrops.app cannot use FILE
backing without declarative registration. See go/phenotype-android-integration#phenotype for more information. This will lead to stale flags.
09-27 03:41:59.710 18675  7835 E FilePhenotypeFlags: Config package com.google.android.gms.clearcut_client#com.bigdrops.app cannot use FILE
backing without declarative registration. See go/phenotype-android-integration#phenotype for more information. This will lead to stale flags.
09-27 03:41:59.710 18675  7835 E FilePhenotypeFlags: Config package com.google.android.gms.clearcut_client#com.bigdrops.app cannot use FILE
backing without declarative registration. See go/phenotype-android-integration#phenotype for more information. This will lead to stale flags.
09-27 03:41:59.878  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.47 dur=1008.83
max=17.42 min=15.70
09-27 03:42:00.887  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.47 dur=1008.69
max=17.71 min=15.49
09-27 03:42:01.896  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.46 dur=1008.87
max=16.79 min=16.35
09-27 03:42:02.905  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.46 dur=1008.87
max=17.84 min=15.31
09-27 03:42:03.914  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.06
max=17.39 min=15.51
09-27 03:42:04.923  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.47 dur=1008.83
max=17.15 min=15.95
09-27 03:42:05.932  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.10
max=16.86 min=16.23
09-27 03:42:06.941  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.46 dur=1009.00
max=18.15 min=15.02
09-27 03:42:07.950  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.10
max=17.90 min=15.12
09-27 03:42:08.959  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.27
max=16.82 min=16.22
09-27 03:42:09.969  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.42 dur=1009.55
max=17.11 min=16.12
09-27 03:42:10.978  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.21
max=18.05 min=15.29
09-27 03:42:11.987  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.43 dur=1009.48
max=17.38 min=15.78
09-27 03:42:12.997  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.32
max=16.83 min=16.29
09-27 03:42:13.758  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x0, deviceId=5, 245087423, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:42:13.759 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=245087423, downTime=245087423, phoneEventTime=1790476933757 } moveCount:0
09-27 03:42:13.889  1829  2142 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 245087554, channel 'dd51759
com.bigdrops.app/com.bigdrops.app.MainActivity'
09-27 03:42:13.890 18675 18675 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.bigdrops.app/com.bigdrops.app.MainActivity', {
action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=245087554, downTime=245087423, phoneEventTime=1790476933889 } moveCount:0
09-27 03:42:14.006  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.44 dur=1009.19
max=16.79 min=16.28
09-27 03:42:15.016  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.37 dur=1010.49
max=17.84 min=15.79
09-27 03:42:16.025  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.47 dur=1008.74
max=17.20 min=15.30
09-27 03:42:17.034  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.49 dur=1008.41
max=17.45 min=15.56
09-27 03:42:18.043  1143  1143 I BufferQueueProducer:
[com.bigdrops.app/com.bigdrops.app.MainActivity#125325](this:0xb400006fb21ce190,id:-1,api:0,p:-1,c:1143) queueBuffer: fps=60.45 dur=1009.05
max=17.25 min=15.69
PS C:\Users\DELL\Desktop\bigdrops-app>