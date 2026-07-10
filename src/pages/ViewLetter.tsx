import { useParams, useNavigate } from "react-router-dom"
import { Mail } from "lucide-react"
import DocumentPage from "@/components/document-view/shared/DocumentPage"
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav"

export default function ViewLetter() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <DocumentPage
      topNav={
        <DocumentTopNav
          title="Official Letter"
          subtitle={`ID: ${id || "-"}`}
          onBack={() => navigate("/letters")}
        />
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
          <Mail className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-bd-text">Letter details coming soon</p>
      </div>
    </DocumentPage>
  )
}
