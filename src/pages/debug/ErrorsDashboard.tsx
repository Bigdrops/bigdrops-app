import { useEffect, useMemo, useRef, useState } from "react"
import { errorRegistry, ErrorRegistryEntry } from "@/lib/errorRegistry"

export default function ErrorsDashboard() {
  const [logs, setLogs] = useState<ErrorRegistryEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const initialLoadDone = useRef(false)

  useEffect(() => {
    const poll = () => {
      const currentLogs = errorRegistry.getAll()
      setLogs(currentLogs)
      if (!initialLoadDone.current && currentLogs.length > 0) {
        setSelectedId(currentLogs[0].id)
        initialLoadDone.current = true
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  const selected = useMemo(
    () => logs.find((l) => l.id === selectedId),
    [logs, selectedId]
  )

  const filtered = useMemo(() => {
    if (!query) return logs
    const q = query.toLowerCase()

    return logs.filter((l) =>
      l.title.toLowerCase().includes(q) ||
      l.diagnostic.toLowerCase().includes(q) ||
      l.route?.toLowerCase().includes(q)
    )
  }, [logs, query])

  async function copyAll() {
    try {
      const dump = JSON.stringify({ timestamp: Date.now(), errors: logs }, null, 2)
      await navigator.clipboard.writeText(dump)
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyEntry(entry: ErrorRegistryEntry) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
    } catch {
      /* clipboard unavailable */
    }
  }

  const isEmpty = logs.length === 0

  function clear() {
    errorRegistry.clear()
    setLogs([])
    setSelectedId(null)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-white text-black">
      {/* HEADER */}
      <div className="p-3 border-b flex gap-2 items-center">
        <h1 className="font-bold text-sm">Debug Errors</h1>

        {!isEmpty && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="ml-2 px-2 py-1 border text-xs w-48"
          />
        )}

        {!isEmpty && (
          <button onClick={copyAll} className="text-xs underline ml-auto">
            Copy All
          </button>
        )}

        {!isEmpty && (
          <button onClick={clear} className="text-xs underline text-red-500">
            Clear
          </button>
        )}
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs opacity-50">No errors recorded</div>
          </div>
        ) : (
          <>
            {/* LIST */}
            <div className="w-1/3 border-r overflow-auto">
              {filtered.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedId(log.id)}
                  className={`w-full text-left p-2 border-b hover:bg-gray-100 ${
                    selectedId === log.id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="text-xs font-medium">{log.title}</div>
                  <div className="text-[10px] opacity-60">
                    {log.route} • {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>

            {/* DETAILS */}
            <div className="flex-1 p-3 overflow-auto">
              {!selected && (
                <div className="text-xs opacity-60">Select an error</div>
              )}

              {selected && (
                <div className="space-y-3">
                  <div>
                    <div className="font-bold text-sm">{selected.title}</div>
                    <div className="text-xs opacity-60">
                      {selected.route}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold">Diagnostic</div>
                    <pre className="text-xs whitespace-pre-wrap break-words bg-gray-100 p-2">
                      {selected.diagnostic}
                    </pre>
                  </div>

                  <button
                    onClick={() => copyEntry(selected)}
                    className="text-xs underline"
                  >
                    Copy Entry
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}