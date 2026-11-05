import { useState } from 'react'
import PatientsPage from '../pages/PatientsPage'

type WorkspaceProps = {
  clinicId: string
  fullName: string
  clinicName: string
}

export default function Workspace({
  clinicId,
  fullName,
  clinicName,
}: WorkspaceProps) {
  const [page, setPage] = useState<'home' | 'patients'>('home')

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <p className="sidebar-clinic">{clinicName}</p>

        <nav aria-label="Navegação principal">
          <button
            className={page === 'home' ? 'nav-item selected' : 'nav-item'}
            aria-current={page === 'home' ? 'page' : undefined}
            onClick={() => setPage('home')}
          >
            Início
          </button>
          <button
            className={page === 'patients' ? 'nav-item selected' : 'nav-item'}
            aria-current={page === 'patients' ? 'page' : undefined}
            onClick={() => setPage('patients')}
          >
            Pacientes
          </button>
        </nav>
      </aside>

      <div className="workspace-content">
        {page === 'home' ? (
          <section>
            <p className="eyebrow">ÁREA DE TRABALHO</p>
            <h1>Olá, {fullName}.</h1>
            <p className="muted">
              Acompanhe os cadastros e organize a rotina da clínica.
            </p>
            <button onClick={() => setPage('patients')}>
              Consultar pacientes
            </button>
          </section>
        ) : (
          <PatientsPage clinicId={clinicId} />
        )}
      </div>
    </div>
  )
}