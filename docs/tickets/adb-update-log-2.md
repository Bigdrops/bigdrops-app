app> adb logcat -c
PS C:\Users\DELL\Desktop\bigdrops-app> adb logcat | Select-String -Pattern "AppUpdate|Capacitor/Console" -CaseSensitive:$false

09-27 17:42:19.390  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.391  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.391  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.391  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.391  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.476  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:19.476  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.486  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg:
{"name":"BigDrops","id":"com.bigdrops.app","build":"1013","version":"1.0.13"}
09-27 17:42:19.486  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"result":false}
09-27 17:42:19.486  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.533  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:19.533  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.534  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"result":false}
09-27 17:42:19.534  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.539  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:19.539  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:19.558  7820  7820 E Capacitor/Console: File:  - Line 330 - Msg: [object Object]
09-27 17:42:19.558  7820  7820 W Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: Offline access state check
failed: Error: ExecuteSet: No value for values
09-27 17:42:19.675 19649 19776 I PlayCore: UID: [10189]  PID: [19649] AppUpdateService : requestUpdateInfo(com.android.chrome)
09-27 17:42:19.677 19649 19890 I PlayCore: UID: [10189]  PID: [19649] AppUpdateService : Initiate binding to the service.
09-27 17:42:20.386 19649 19649 I PlayCore: UID: [10189]  PID: [19649] AppUpdateService :
ServiceConnectionImpl.onServiceConnected(ComponentInfo{com.android.vending/com.google.android.finsky.installservice.DevTriggeredUpdateService})
09-27 17:42:20.387 19649 19890 I PlayCore: UID: [10189]  PID: [19649] AppUpdateService : linkToDeath
09-27 17:42:21.063 19649 19890 I PlayCore: UID: [10189]  PID: [19649] AppUpdateService : Unbind from service.
09-27 17:42:21.289  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: [AppUpdate] check reason=ok
forced=yes joined=no policy=valid discovery=not-attempted code=none
09-27 17:42:21.748  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.748  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.751  7820  7820 W Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: One-shot CSR sync crashed
during app bootstrap: Error: ExecuteSet: No value for values
09-27 17:42:21.752  7820  7820 W Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: Local device hydration
skipped: Error: ExecuteSet: No value for values
09-27 17:42:21.754  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.755  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.756  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.756  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.767  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.767  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.768  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.768  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.771  7820  7820 W Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: One-shot quotation sync
crashed during app bootstrap: Error: ExecuteSet: No value for values
09-27 17:42:21.772  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.772  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.773  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.773  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.825  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:21.825  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:21.825  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.832  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.832  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.834  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.834  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.835  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.836  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.837  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:21.838  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.856  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.857  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.857  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.875  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.875  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.875  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.875  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.875  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:21.876  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.876  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.876  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:21.876  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:21.877  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:21.877  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:22.295  7820  7820 E Capacitor/Console: File: https://localhost/ - Line 0 - Msg: Access to fetch at
'https://xqlpekpkbszpdgtuwybh.supabase.co/functions/v1/postgrest-schema-exposure' from origin 'https://localhost' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
09-27 17:42:22.295  7820  7820 W Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 98 - Msg: [tenancy] PostgREST exposure
request errored: TypeError: Failed to fetch
09-27 17:42:23.038  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.039  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.039  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.039  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.039  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.044  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:23.044  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.044  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:23.045  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.048  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:23.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.055  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:23.056  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.056  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.056  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.056  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.057  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.058  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.273  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.273  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.273  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.273  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.288  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:23.288  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.306  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:23.306  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.306  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.306  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.307  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.307  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.307  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.307  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.307  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.818  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.820  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.822  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.823  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.826  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:23.826  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.841  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:23.842  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.842  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.843  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:23.844  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.844  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.846  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.846  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:23.848  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:24.132  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] fetchSettings
start (force: false )
09-27 17:42:24.132  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] fetchSettings
start (force: false )
09-27 17:42:24.136  7820  7820 E Capacitor/Console: File: https://localhost/assets/Layout-CntQMpHl.js - Line 1 - Msg: Error: <path> attribute d:
Expected moveto path command ('M' or 'm'), "undefined".
09-27 17:42:24.137  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.138  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.141  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.178  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:24.179  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"available":true,"widthDp":406.6666564941406,"heightDp":904,"widthCla
ss":"compact","heightClass":"expanded","layoutMode":"mobile","isFoldable":false,"hasSeparatingFold":false,"isFlat":false,"isHalfOpened":false,"isTa
bletop":false,"isBookPosture":false}
09-27 17:42:24.179  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.179  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"available":true,"widthDp":406.6666564941406,"heightDp":904,"widthCla
ss":"compact","heightClass":"expanded","layoutMode":"mobile","isFoldable":false,"hasSeparatingFold":false,"isFlat":false,"isHalfOpened":false,"isTa
bletop":false,"isBookPosture":false}
09-27 17:42:24.179  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.192  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"available":true,"widthDp":406.6666564941406,"heightDp":904,"widthCla
ss":"compact","heightClass":"expanded","layoutMode":"mobile","isFoldable":false,"hasSeparatingFold":false,"isFlat":false,"isHalfOpened":false,"isTa
bletop":false,"isBookPosture":false}
09-27 17:42:24.195  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.195  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"available":true,"widthDp":406.6666564941406,"heightDp":904,"widthCla
ss":"compact","heightClass":"expanded","layoutMode":"mobile","isFoldable":false,"hasSeparatingFold":false,"isFlat":false,"isHalfOpened":false,"isTa
bletop":false,"isBookPosture":false}
09-27 17:42:24.195  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:24.883  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Fetch success
from Supabase, raw data: [object Object]
09-27 17:42:24.883  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Normalizing
raw settings data: [object Object]
09-27 17:42:24.883  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Final
normalized settings: [object Object]
09-27 17:42:24.883  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Update
listeners with: [object Object]
09-27 17:42:25.074  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Fetch success
from Supabase, raw data: [object Object]
09-27 17:42:25.074  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Normalizing
raw settings data: [object Object]
09-27 17:42:25.074  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Final
normalized settings: [object Object]
09-27 17:42:25.074  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Merging local
theme/grace settings into fetched data
09-27 17:42:25.074  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 131 - Msg: [useSettings] Update
listeners with: [object Object]
09-27 17:42:26.052  7820  7820 E Capacitor/Console: File: https://localhost/assets/Layout-CntQMpHl.js - Line 1 - Msg: Error: <path> attribute d:
Expected moveto path command ('M' or 'm'), "undefined".
09-27 17:42:26.053  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.053  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.054  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.054  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.054  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.054  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.055  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.072  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:26.072  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:26.072  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.073  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:26.073  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.110  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:26.111  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.111  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.111  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:26.111  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:26.112  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:26.112  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:26.112  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:26.253  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:27.478  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.478  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.478  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.479  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.479  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.482  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.482  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.482  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.518  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:27.519  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.519  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:27.519  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.532  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:27.532  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.532  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.533  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:27.536  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:27.537  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:27.539  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:27.540  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:27.544  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:32.836  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: [AppUpdate] check reason=ok
forced=yes joined=no policy=valid discovery=not-attempted code=none
09-27 17:42:32.851  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.852  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.852  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.852  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.855  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:32.855  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.867  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:32.867  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.868  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.868  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:32.868  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:32.869  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:32.870  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:32.870  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:32.872  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:35.879  7820  7820 I Capacitor/Console: File: https://localhost/assets/index-DQyJBX_y.js - Line 135 - Msg: [AppUpdate] check reason=ok
forced=yes joined=no policy=valid discovery=not-attempted code=none
09-27 17:42:35.896  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.896  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.896  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.897  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.901  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"receive":"granted"}
09-27 17:42:35.902  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.904  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: undefined
09-27 17:42:35.904  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.906  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.906  7820  7820 I Capacitor/Console: File:  - Line 349 - Msg: [object Object]
09-27 17:42:35.906  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:35.913  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:35.913  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:35.913  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
09-27 17:42:35.913  7820  7820 I Capacitor/Console: File:  - Line 333 - Msg: {"value":"f6_j4IT8RTugKSNaAb4X3a:APA91bFws9A0wtN1z0T1tH7pHYlgxzQFP57Jj
M5FciI1QjxXPB3jmkrabc07ezFnLu6SCnkvPC2Kp0-dZUAMLYTzkj7VrHkvt8is-q40aik12p2Ircs5IcY"}
PS C:\Users\DELL\Desktop\bigdrops-app>