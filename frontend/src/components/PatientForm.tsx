import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type PatientFormProps = {
  clinicId: string
  onSaved: (name: string) => void
  onCancel: () => void
}

type Field = {
  name: string
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
  onSaved,
  onCancel,
}: PatientFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting.current) return

    const formData = new FormData(event.currentTarget)

    function value(name: string) {
      const text = String(formData.get(name) ?? '').trim()
      return text || null
    }

    const fullName = value('full_name')
    const birthDate = value('birth_date')

    if (!fullName) {
      setError('Informe o nome completo do paciente.')
      return
    }

    if (birthDate && birthDate > localToday()) {
      setError('A data de nascimento não pode estar no futuro.')
      return
    }

    submitting.current = true
    setSaving(true)
    setError('')

    try {
      const { error: saveError } = await supabase
        .from('patients')
        .insert({
          clinic_id: clinicId,
          full_name: fullName,
          preferred_name: value('preferred_name'),
          birth_date: birthDate,
          phone: value('phone'),
          email: value('email'),
          guardian_name: value('guardian_name'),
          guardian_phone: value('guardian_phone'),
          guardian_relationship: value('guardian_relationship'),
        })
        .select('id')
        .single()

      if (saveError) throw new Error(saveError.message)

      onSaved(fullName)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o cadastro. Confira a lista antes de reenviar.',
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
        <h2 id="patient-form-title">Novo paciente</h2>
        <p className="muted">
          Nome completo é obrigatório. Os demais campos são opcionais.
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
              required={field.required}
              max={field.type === 'date' ? localToday() : undefined}
              maxLength={field.type === 'date' ? undefined : 200}
            />
          </div>
        ))}
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