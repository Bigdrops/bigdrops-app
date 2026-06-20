import { useEffect, useMemo, useState } from "react"
import { errorRegistry, ErrorLogEntry } from "@/lib/errorRegistry"

export default function ErrorsDashboard() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setLogs(errorRegistry.getAll())
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
      l.message.toLowerCase().includes(q) ||
      l.route?.toLowerCase().includes(q)
    )
  }, [logs, query])

  function copyAll() {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2))
  }

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

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="ml-2 px-2 py-1 border text-xs w-48"
        />

        <button onClick={copyAll} className="text-xs underline ml-auto">
          Copy All
        </button>

        <button onClick={clear} className="text-xs underline text-red-500">
          Clear
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
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
                <div className="text-xs font-semibold">Message</div>
                <pre className="text-xs whitespace-pre-wrap break-words bg-gray-100 p-2">
                  {selected.message}
                </pre>
              </div>

              {selected.stack && (
                <div>
                  <div className="text-xs font-semibold">Stack</div>
                  <pre className="text-[10px] whitespace-pre-wrap break-words bg-black text-green-200 p-2 overflow-auto">
                    {selected.stack}
                  </pre>
                </div>
              )}

              <button
                onClick={() =>
                  navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
                }
                className="text-xs underline"
              >
                Copy Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}