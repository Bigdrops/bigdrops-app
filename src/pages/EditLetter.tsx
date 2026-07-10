import { useNavigate, useParams } from "react-router-dom"
import { Mail } from "lucide-react"
import Layout from "../components/Layout"

export default function EditLetter() {
  const navigate = useNavigate()
  const { id } = useParams()
  return (
    <Layout title="Edit Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
          <Mail className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-bd-text">Edit Letter</p>
        <p className="mt-1 text-xs text-bd-text-muted">Editing coming soon (ID: {id})</p>
        <button
          onClick={() => navigate("/letters")}
          className="mt-4 text-xs font-medium text-bd-link underline"
        >
          Back to letters
        </button>
      </div>
    </Layout>
  )
}
