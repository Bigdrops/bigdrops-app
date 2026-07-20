content.js:1 Uncaught (in promise) Error: Extension context invalidated.
    at content.js:1:20039
    at new Promise (<anonymous>)
    at m (content.js:1:19964)
    at Object.apply (content.js:1:17289)
    at xe (content.js:18:81243)
(anonymous) @ content.js:1
m @ content.js:1
apply @ content.js:1
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
setTimeout
_e @ content.js:18
xe @ content.js:18
chunk-2A4PGIUY.js?v=95a39407:16 [Violation] 'message' handler took 240ms
chunk-AHG5MMEZ.js?v=95a39407:5990 Error: <path> attribute d: Expected moveto path command ('M' or 'm'), "undefined".
renderSVG @ chunk-AHG5MMEZ.js?v=95a39407:5990
renderInstance @ chunk-AHG5MMEZ.js?v=95a39407:6032
VisualElement.render @ chunk-AHG5MMEZ.js?v=95a39407:5103
triggerCallback @ chunk-AHG5MMEZ.js?v=95a39407:340
process @ chunk-AHG5MMEZ.js?v=95a39407:374
processBatch @ chunk-AHG5MMEZ.js?v=95a39407:421
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:68
postMessage
schedulePerformWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:158
exports.unstable_scheduleCallback @ chunk-2A4PGIUY.js?v=95a39407:249
scheduleTaskForRootDuringMicrotask @ chunk-2A4PGIUY.js?v=95a39407:13479
processRootScheduleInMicrotask @ chunk-2A4PGIUY.js?v=95a39407:13430
(anonymous) @ chunk-2A4PGIUY.js?v=95a39407:13531
[Violation] Forced reflow while executing JavaScript took 62ms
installHook.js:1 React has detected a change in the order of Hooks called by QuotationFormPage. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useContext                 useContext
2. useContext                 useContext
3. useContext                 useContext
4. useContext                 useContext
5. useContext                 useContext
6. useContext                 useContext
7. useContext                 useContext
8. useRef                     useRef
9. useContext                 useContext
10. useLayoutEffect           useLayoutEffect
11. useCallback               useCallback
12. useContext                useContext
13. useContext                useContext
14. useContext                useContext
15. useState                  useState
16. useEffect                 useEffect
17. useState                  useState
18. useState                  useState
19. useRef                    useRef
20. useRef                    useRef
21. useRef                    useRef
22. useEffect                 useEffect
23. useCallback               useCallback
24. useCallback               useCallback
25. useEffect                 useEffect
26. useState                  useState
27. useState                  useState
28. useState                  useState
29. useState                  useState
30. useState                  useState
31. useState                  useState
32. useState                  useState
33. useState                  useState
34. useState                  useState
35. useState                  useState
36. useState                  useState
37. useState                  useState
38. useState                  useState
39. useState                  useState
40. useState                  useState
41. useState                  useState
42. useState                  useState
43. useState                  useState
44. useState                  useState
45. useState                  useState
46. useState                  useState
47. useState                  useState
48. useState                  useState
49. useState                  useState
50. useState                  useState
51. useState                  useState
52. useState                  useState
53. useState                  useState
54. useCallback               useCallback
55. useCallback               useCallback
56. useEffect                 useEffect
57. useEffect                 useEffect
58. useEffect                 useEffect
59. useRef                    useRef
60. useRef                    useRef
61. useCallback               useCallback
62. useLayoutEffect           useLayoutEffect
63. useCallback               useCallback
64. useCallback               useCallback
65. useCallback               useCallback
66. useCallback               useCallback
67. useCallback               useCallback
68. useCallback               useCallback
69. useCallback               useCallback
70. useCallback               useCallback
71. useCallback               useCallback
72. useCallback               useCallback
73. useCallback               useCallback
74. useCallback               useCallback
75. useCallback               useCallback
76. useCallback               useCallback
77. useCallback               useCallback
78. useMemo                   useMemo
79. useMemo                   useMemo
80. useCallback               useCallback
81. useCallback               useCallback
82. useMemo                   useMemo
83. useMemo                   useMemo
84. useCallback               useCallback
85. useState                  useState
86. useCallback               useCallback
87. undefined                 useCallback
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

overrideMethod @ installHook.js:1
updateHookTypesDev @ chunk-2A4PGIUY.js?v=95a39407:5594
useCallback @ chunk-2A4PGIUY.js?v=95a39407:18935
exports.useCallback @ chunk-BVJBJJA6.js?v=95a39407:904
$RefreshSig$ @ QuotationFormPage.tsx:463
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18509
renderWithHooks @ chunk-2A4PGIUY.js?v=95a39407:5654
updateFunctionComponent @ chunk-2A4PGIUY.js?v=95a39407:7475
beginWork @ chunk-2A4PGIUY.js?v=95a39407:8525
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
performUnitOfWork @ chunk-2A4PGIUY.js?v=95a39407:12561
workLoopSync @ chunk-2A4PGIUY.js?v=95a39407:12424
renderRootSync @ chunk-2A4PGIUY.js?v=95a39407:12408
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11766
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
<QuotationFormPage>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=6de859bd:247
$RefreshSig$ @ EditQuotation.tsx:4
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18509
renderWithHooksAgain @ chunk-2A4PGIUY.js?v=95a39407:5729
renderWithHooks @ chunk-2A4PGIUY.js?v=95a39407:5665
updateFunctionComponent @ chunk-2A4PGIUY.js?v=95a39407:7475
beginWork @ chunk-2A4PGIUY.js?v=95a39407:8484
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
performUnitOfWork @ chunk-2A4PGIUY.js?v=95a39407:12561
workLoopConcurrentByScheduler @ chunk-2A4PGIUY.js?v=95a39407:12557
renderRootConcurrent @ chunk-2A4PGIUY.js?v=95a39407:12539
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11766
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
<...>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=6de859bd:247
(anonymous) @ AppShell.tsx:170
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18509
renderWithHooksAgain @ chunk-2A4PGIUY.js?v=95a39407:5729
renderWithHooks @ chunk-2A4PGIUY.js?v=95a39407:5665
updateFunctionComponent @ chunk-2A4PGIUY.js?v=95a39407:7475
beginWork @ chunk-2A4PGIUY.js?v=95a39407:8525
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
performUnitOfWork @ chunk-2A4PGIUY.js?v=95a39407:12561
workLoopSync @ chunk-2A4PGIUY.js?v=95a39407:12424
renderRootSync @ chunk-2A4PGIUY.js?v=95a39407:12408
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11766
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
installHook.js:1 Error: Rendered more hooks than during the previous render.
    at updateWorkInProgressHook (chunk-2A4PGIUY.js?v=95a39407:5792:19)
    at updateCallback (chunk-2A4PGIUY.js?v=95a39407:6516:20)
    at Object.useCallback (chunk-2A4PGIUY.js?v=95a39407:18936:18)
    at exports.useCallback (chunk-BVJBJJA6.js?v=95a39407:904:36)
    at QuotationFormPage (QuotationFormPage.tsx:463:35)
    at Object.react_stack_bottom_frame (chunk-2A4PGIUY.js?v=95a39407:18509:20)
    at renderWithHooks (chunk-2A4PGIUY.js?v=95a39407:5654:24)
    at updateFunctionComponent (chunk-2A4PGIUY.js?v=95a39407:7475:21)
    at beginWork (chunk-2A4PGIUY.js?v=95a39407:8525:20)
    at runWithFiberInDEV (chunk-2A4PGIUY.js?v=95a39407:997:72)

The above error occurred in the <QuotationFormPage> component.

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.

overrideMethod @ installHook.js:1
defaultOnCaughtError @ chunk-2A4PGIUY.js?v=95a39407:7001
logCaughtError @ chunk-2A4PGIUY.js?v=95a39407:7033
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
inst.componentDidCatch.update.callback @ chunk-2A4PGIUY.js?v=95a39407:7078
callCallback @ chunk-2A4PGIUY.js?v=95a39407:5491
commitCallbacks @ chunk-2A4PGIUY.js?v=95a39407:5503
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
commitClassCallbacks @ chunk-2A4PGIUY.js?v=95a39407:9490
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9958
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10066
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10044
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9907
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10066
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10044
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9963
flushLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:12924
commitRoot @ chunk-2A4PGIUY.js?v=95a39407:12803
commitRootWhenReady @ chunk-2A4PGIUY.js?v=95a39407:12016
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11950
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
<QuotationFormPage>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=6de859bd:247
$RefreshSig$ @ EditQuotation.tsx:4
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18509
renderWithHooksAgain @ chunk-2A4PGIUY.js?v=95a39407:5729
renderWithHooks @ chunk-2A4PGIUY.js?v=95a39407:5665
updateFunctionComponent @ chunk-2A4PGIUY.js?v=95a39407:7475
beginWork @ chunk-2A4PGIUY.js?v=95a39407:8484
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
performUnitOfWork @ chunk-2A4PGIUY.js?v=95a39407:12561
workLoopConcurrentByScheduler @ chunk-2A4PGIUY.js?v=95a39407:12557
renderRootConcurrent @ chunk-2A4PGIUY.js?v=95a39407:12539
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11766
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
<...>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=6de859bd:247
(anonymous) @ AppShell.tsx:170
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18509
renderWithHooksAgain @ chunk-2A4PGIUY.js?v=95a39407:5729
renderWithHooks @ chunk-2A4PGIUY.js?v=95a39407:5665
updateFunctionComponent @ chunk-2A4PGIUY.js?v=95a39407:7475
beginWork @ chunk-2A4PGIUY.js?v=95a39407:8525
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
performUnitOfWork @ chunk-2A4PGIUY.js?v=95a39407:12561
workLoopSync @ chunk-2A4PGIUY.js?v=95a39407:12424
renderRootSync @ chunk-2A4PGIUY.js?v=95a39407:12408
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11766
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
installHook.js:1 ErrorBoundary caught an error: Error: Rendered more hooks than during the previous render.
    at updateWorkInProgressHook (chunk-2A4PGIUY.js?v=95a39407:5792:19)
    at updateCallback (chunk-2A4PGIUY.js?v=95a39407:6516:20)
    at Object.useCallback (chunk-2A4PGIUY.js?v=95a39407:18936:18)
    at exports.useCallback (chunk-BVJBJJA6.js?v=95a39407:904:36)
    at QuotationFormPage (QuotationFormPage.tsx:463:35)
    at Object.react_stack_bottom_frame (chunk-2A4PGIUY.js?v=95a39407:18509:20)
    at renderWithHooks (chunk-2A4PGIUY.js?v=95a39407:5654:24)
    at updateFunctionComponent (chunk-2A4PGIUY.js?v=95a39407:7475:21)
    at beginWork (chunk-2A4PGIUY.js?v=95a39407:8525:20)
    at runWithFiberInDEV (chunk-2A4PGIUY.js?v=95a39407:997:72) {componentStack: '\n    at QuotationFormPage (http://localhost:5000/s… at App (http://localhost:5000/src/App.tsx:56:41)'}
overrideMethod @ installHook.js:1
(anonymous) @ ErrorBoundary.tsx:28
react_stack_bottom_frame @ chunk-2A4PGIUY.js?v=95a39407:18547
inst.componentDidCatch.update.callback @ chunk-2A4PGIUY.js?v=95a39407:7086
callCallback @ chunk-2A4PGIUY.js?v=95a39407:5491
commitCallbacks @ chunk-2A4PGIUY.js?v=95a39407:5503
runWithFiberInDEV @ chunk-2A4PGIUY.js?v=95a39407:997
commitClassCallbacks @ chunk-2A4PGIUY.js?v=95a39407:9490
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9958
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10066
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10044
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9907
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10066
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10044
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9903
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:10074
recursivelyTraverseLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:10792
commitLayoutEffectOnFiber @ chunk-2A4PGIUY.js?v=95a39407:9963
flushLayoutEffects @ chunk-2A4PGIUY.js?v=95a39407:12924
commitRoot @ chunk-2A4PGIUY.js?v=95a39407:12803
commitRootWhenReady @ chunk-2A4PGIUY.js?v=95a39407:12016
performWorkOnRoot @ chunk-2A4PGIUY.js?v=95a39407:11950
performWorkOnRootViaSchedulerTask @ chunk-2A4PGIUY.js?v=95a39407:13505
performWorkUntilDeadline @ chunk-2A4PGIUY.js?v=95a39407:36
chunk-AHG5MMEZ.js?v=95a39407:406 [Violation] 'requestAnimationFrame' handler took 118ms
chunk-AHG5MMEZ.js?v=95a39407:406 [Violation] 'requestAnimationFrame' handler took 230ms
