import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Patient } from '../types/patient'

type PatientFormProps = {
  clinicId: string
  initialPatient?: Patient
  onSaved: (name: string, edited: boolean) => void
  onCancel: () => void
}

type FieldName =
  | 'full_name'
  | 'preferred_name'
  | 'birth_date'
  | 'phone'
  | 'email'
  | 'guardian_name'
  | 'guardian_phone'
  | 'guardian_relationship'

type Field = {
  name: FieldName
  label: string
  type: 'text' | 'email' | 'tel' | 'date'
  required?: boolean
}

const fields: Field[] = [
  { name: 'full_name', label: 'Nome completo', type: 'text', required: true },
  { name: 'preferred_name', label: 'Nome de preferência', type: 'text' },
  { name: 'birth_date', label: 'Data de nascimento', type: 'date' },
  { name: 'phone', label: 'Telefone', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'guardian_name', label: 'Nome do responsável', type: 'text' },
  { name: 'guardian_phone', label: 'Telefone do responsável', type: 'tel' },
  { name: 'guardian_relationship', label: 'Vínculo do responsável', type: 'text' },
]

function localToday() {
  const date = new Date()

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function PatientForm({
  clinicId,
  initialPatient,
  onSaved,
  onCancel,
}: PatientFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const editing = Boolean(initialPatient)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting.current) return

    const formData = new FormData(event.currentTarget)

    function value(name: string) {
      return String(formData.get(name) ?? '').trim() || null
    }

    const fullName = value('full_name')
    const birthDate = value('birth_date')
    const notes = value('administrative_notes')
    const active = formData.get('active') === 'on'

    if (!fullName) {
      setError('Informe o nome completo do paciente.')
      return
    }

    if (birthDate && birthDate > localToday()) {
      setError('A data de nascimento não pode estar no futuro.')
      return
    }

    if (notes && notes.length > 4000) {
      setError('A observação deve ter até 4.000 caracteres.')
      return
    }

    if (initialPatient && initialPatient.clinic_id !== clinicId) {
      setError('O paciente não pertence à clínica atual.')
      return
    }

    if (initialPatient?.active && !active) {
      const confirmed = window.confirm(
        `Desativar o cadastro de ${fullName}? ` +
        'Os registros e agendamentos existentes serão preservados.',
      )

      if (!confirmed) return
    }

    submitting.current = true
    setSaving(true)
    setError('')

    const payload = {
      full_name: fullName,
      preferred_name: value('preferred_name'),
      birth_date: birthDate,
      phone: value('phone'),
      email: value('email'),
      guardian_name: value('guardian_name'),
      guardian_phone: value('guardian_phone'),
      guardian_relationship: value('guardian_relationship'),
      administrative_notes: notes,
      active,
    }

    try {
      const result = initialPatient
        ? await supabase
            .from('patients')
            .update(payload)
            .eq('id', initialPatient.id)
            .eq('clinic_id', clinicId)
            .eq('updated_at', initialPatient.updated_at)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('patients')
            .insert({ ...payload, clinic_id: clinicId })
            .select('id')
            .single()

      if (result.error) {
        throw new Error(
          result.error.code === '42501'
            ? 'Sua conta não tem permissão para salvar este cadastro.'
            : result.error.message,
        )
      }

      if (!result.data) {
        throw new Error(
          'O cadastro foi alterado desde a abertura do formulário ' +
          'ou não está mais disponível para edição. ' +
          'Cancele, atualize a lista e abra o cadastro novamente.',
        )
      }

      onSaved(fullName, editing)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar a gravação. Confira a lista antes de reenviar.',
      )
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className="patient-form"
      onSubmit={handleSubmit}
      aria-labelledby="patient-form-title"
      aria-busy={saving}
    >
      <div>
        <h2 id="patient-form-title">
          {editing ? 'Editar paciente' : 'Novo paciente'}
        </h2>
        <p className="muted">
          Nome completo é obrigatório. Os demais dados são opcionais.
        </p>
      </div>

      <fieldset className="patient-form-grid" disabled={saving}>
        <legend className="visually-hidden">
          Dados administrativos do paciente
        </legend>

        {fields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={`patient-${field.name}`}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <input
              id={`patient-${field.name}`}
              name={field.name}
              type={field.type}
              defaultValue={initialPatient?.[field.name] ?? ''}
              required={field.required}
              max={field.type === 'date' ? localToday() : undefined}
              maxLength={field.type === 'date' ? undefined : 200}
            />
          </div>
        ))}

        <div className="field full-width">
          <label htmlFor="patient-notes">Observações administrativas</label>
          <textarea
            id="patient-notes"
            name="administrative_notes"
            defaultValue={initialPatient?.administrative_notes ?? ''}
            rows={4}
            maxLength={4000}
            aria-describedby="patient-notes-help"
          />
          <small id="patient-notes-help" className="muted">
            Até 4.000 caracteres. Registre orientações operacionais.
            Informações clínicas pertencem ao prontuário.
          </small>
        </div>

        <div className="field full-width">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initialPatient?.active ?? true}
            />
            Cadastro ativo
          </label>
          <small className="muted">
            Desativar impede novas marcações, mas não cancela
            agendamentos existentes nem apaga o histórico.
          </small>
        </div>
      </fieldset>

      {error && (
        <p className="error-message" role="alert">{error}</p>
      )}

      <div className="patient-form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar paciente'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}