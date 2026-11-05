import { useEffect, useId, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { Patient } from '../types/patient'

type PatientDetailsModalProps = {
  patient: Patient
  editDisabled: boolean
  onClose: () => void
  onEdit: (patient: Patient) => void
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Não informado'}</dd>
    </div>
  )
}

export default function PatientDetailsModal({
  patient,
  editDisabled,
  onClose,
  onEdit,
}: PatientDetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  function closeModal() {
    dialogRef.current?.close()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return

    const bounds = event.currentTarget.getBoundingClientRect()

    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom

    if (outside) closeModal()
  }

  function handleEdit() {
    closeModal()
    onEdit(patient)
  }

  const birthDate = patient.birth_date
    ? patient.birth_date.split('-').reverse().join('/')
    : null

  return (
    <dialog
      ref={dialogRef}
      className="patient-modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <header className="patient-modal-header">
        <div>
          <p className="eyebrow">FICHA DO PACIENTE</p>
          <h2 id={titleId}>{patient.full_name}</h2>
          <span
            className={`patient-status ${patient.active ? 'active' : 'inactive'}`}
          >
            {patient.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <button
          type="button"
          className="secondary-button modal-close"
          onClick={closeModal}
          aria-label="Fechar ficha do paciente"
        >
          ×
        </button>
      </header>

      <div className="patient-modal-body">
        <section aria-label="Dados pessoais e contatos">
          <h3>Dados pessoais e contatos</h3>
          <dl className="patient-details-grid">
            <Detail
              label="Nome de preferência"
              value={patient.preferred_name}
            />
            <Detail label="Nascimento" value={birthDate} />
            <Detail label="Telefone" value={patient.phone} />
            <Detail label="E-mail" value={patient.email} />
          </dl>
        </section>

        <section aria-label="Responsável">
          <h3>Responsável</h3>
          <dl className="patient-details-grid">
            <Detail label="Nome" value={patient.guardian_name} />
            <Detail
              label="Vínculo"
              value={patient.guardian_relationship}
            />
            <Detail label="Telefone" value={patient.guardian_phone} />
          </dl>
        </section>

        <section aria-label="Observações administrativas">
          <h3>Observações administrativas</h3>
          <p className="patient-modal-notes">
            {patient.administrative_notes ||
              'Nenhuma observação administrativa registrada.'}
          </p>
        </section>
      </div>

      <footer className="patient-modal-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={closeModal}
        >
          Fechar
        </button>

        <button
          type="button"
          onClick={handleEdit}
          disabled={editDisabled}
        >
          Editar cadastro
        </button>
      </footer>
    </dialog>
  )
}