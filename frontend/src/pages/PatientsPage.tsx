import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PatientForm from '../components/PatientForm'
import type { Patient } from '../types/patient'
import PatientDetailsModal from '../components/PatientDetailsModal'

type StatusFilter = 'all' | 'active' | 'inactive'

type FormState =
    | { mode: 'create' }
    | { mode: 'edit'; patient: Patient }
    | null

type ResultState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; patients: Patient[]; total: number }

type ResultsProps = {
    clinicId: string
    search: string
    statusFilter: StatusFilter
    page: number
    editingDisabled: boolean
    onEdit: (patient: Patient) => void
    onPrevious: () => void
    onNext: () => void
    onRetry: () => void
}

const PAGE_SIZE = 20

function PatientResults({
    clinicId,
    search,
    statusFilter,
    page,
    editingDisabled,
    onEdit,
    onPrevious,
    onNext,
    onRetry,
}: ResultsProps) {
    const [result, setResult] = useState<ResultState>({
        status: 'loading',
    })

    const [selectedPatient, setSelectedPatient] =
        useState<Patient | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        async function loadPatients() {
            try {
                let query = supabase
                    .from('patients')
                    .select(
                        'id, clinic_id, full_name, preferred_name, birth_date, email, phone, guardian_name, guardian_phone, guardian_relationship, administrative_notes, active, updated_at',
                        { count: 'exact' },
                    )
                    .eq('clinic_id', clinicId)
                    .order('full_name')
                    .order('id')

                if (search) {
                    const escaped = search.replace(/[\\%_]/g, '\\$&')
                    query = query.ilike('full_name', `%${escaped}%`)
                }

                if (statusFilter !== 'all') {
                    query = query.eq('active', statusFilter === 'active')
                }

                const first = page * PAGE_SIZE

                const { data, count, error } = await query
                    .range(first, first + PAGE_SIZE - 1)
                    .abortSignal(controller.signal)

                if (error) throw new Error(error.message)

                if (!controller.signal.aborted) {
                    setResult({
                        status: 'ready',
                        patients: data ?? [],
                        total: count ?? 0,
                    })
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setResult({
                        status: 'error',
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Não foi possível carregar os pacientes.',
                    })
                }
            }
        }

        void loadPatients()

        return () => controller.abort()
    }, [clinicId, search, statusFilter, page])

    if (result.status === 'loading') {
        return <p className="empty-state" role="status">Carregando pacientes…</p>
    }

    if (result.status === 'error') {
        return (
            <div className="empty-state">
                <p className="error-message" role="alert">{result.message}</p>
                <button className="secondary-button" onClick={onRetry}>
                    Tentar novamente
                </button>
            </div>
        )
    }

    const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

    return (
        <>
            <p className="muted" aria-live="polite">
                {result.total} paciente(s) encontrado(s).
            </p>

            {result.patients.length === 0 ? (
                <div className="empty-state">
                    <h3>Nenhum paciente encontrado</h3>
                    <p className="muted">
                        Confira os filtros ou cadastre um novo paciente.
                    </p>
                </div>
            ) : (
                <div className="table-scroll">
                    <table className="patients-table">
                        <caption className="visually-hidden">
                            Pacientes disponíveis na clínica
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Paciente</th>
                                <th scope="col">Nascimento</th>
                                <th scope="col">Telefone</th>
                                <th scope="col">Situação</th>
                                <th scope="col">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.patients.map((patient) => (
                                <tr key={patient.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="patient-name-button"
                                            onClick={() => setSelectedPatient(patient)}
                                            aria-label={`Abrir ficha de ${patient.full_name}`}
                                        >
                                            {patient.full_name}
                                        </button>
                                        {patient.preferred_name && (
                                            <small>Prefere: {patient.preferred_name}</small>
                                        )}
                                        {patient.administrative_notes && (
                                            <small>Com observação administrativa</small>
                                        )}
                                    </td>
                                    <td>
                                        {patient.birth_date
                                            ? patient.birth_date.split('-').reverse().join('/')
                                            : 'Não informado'}
                                    </td>
                                    <td>{patient.phone || 'Não informado'}</td>
                                    <td>
                                        <span className={`patient-status ${patient.active ? 'active' : 'inactive'}`}>
                                            {patient.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="secondary-button"
                                            disabled={editingDisabled}
                                            onClick={() => onEdit(patient)}
                                            aria-label={`Editar cadastro de ${patient.full_name}`}
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="pagination">
                <button
                    className="secondary-button"
                    disabled={page === 0}
                    onClick={onPrevious}
                >
                    Anterior
                </button>
                <span>Página {page + 1} de {pages}</span>
                <button
                    className="secondary-button"
                    disabled={page + 1 >= pages}
                    onClick={onNext}
                >
                    Próxima
                </button>
                {selectedPatient && (
                    <PatientDetailsModal
                        patient={selectedPatient}
                        editDisabled={editingDisabled}
                        onClose={() => setSelectedPatient(null)}
                        onEdit={(patient) => {
                            setSelectedPatient(null)
                            onEdit(patient)
                            onEdit(patient)
                        }}
                    />
                )}
            )
        </div >
        </>

    )
}

export default function PatientsPage({ clinicId }: { clinicId: string }) {
    const [input, setInput] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [page, setPage] = useState(0)
    const [revision, setRevision] = useState(0)
    const [formState, setFormState] = useState<FormState>(null)
    const [savedMessage, setSavedMessage] = useState('')

    function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSearch(input.trim())
        setPage(0)
        setRevision((current) => current + 1)
    }

    function clearSearch() {
        setInput('')
        setSearch('')
        setStatusFilter('all')
        setPage(0)
        setRevision((current) => current + 1)
    }

    function handlePatientSaved(name: string, edited: boolean) {
        setFormState(null)
        setSavedMessage(
            edited
                ? `Cadastro de ${name} atualizado com sucesso.`
                : `Cadastro de ${name} realizado com sucesso.`,
        )
        setInput(name)
        setSearch(name)
        setStatusFilter('all')
        setPage(0)
        setRevision((current) => current + 1)
    }

    function openEdit(patient: Patient) {
        setSavedMessage('')
        setFormState({ mode: 'edit', patient })
    }

    const initialPatient =
        formState?.mode === 'edit' ? formState.patient : undefined

    return (
        <section className="patients-page">
            <div className="patients-heading">
                <div>
                    <p className="eyebrow">CADASTROS</p>
                    <h1>Pacientes</h1>
                    <p className="muted">Consulte e atualize os pacientes da sua clínica.</p>
                </div>

                <button
                    type="button"
                    disabled={formState !== null}
                    onClick={() => {
                        setSavedMessage('')
                        setFormState({ mode: 'create' })
                    }}
                >
                    Novo paciente
                </button>
            </div>

            {savedMessage && (
                <p className="connection-status" role="status">{savedMessage}</p>
            )}

            {formState && (
                <PatientForm
                    key={initialPatient?.id ?? 'new'}
                    clinicId={clinicId}
                    initialPatient={initialPatient}
                    onSaved={handlePatientSaved}
                    onCancel={() => setFormState(null)}
                />
            )}

            <form className="search-form" onSubmit={handleSearch}>
                <div className="field">
                    <label htmlFor="patient-search">Buscar por nome</label>
                    <input
                        id="patient-search"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Digite o nome ou parte dele"
                        maxLength={100}
                    />
                </div>

                <div className="field status-filter">
                    <label htmlFor="patient-status-filter">Situação</label>
                    <select
                        id="patient-status-filter"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value as StatusFilter)
                            setPage(0)
                        }}
                    >
                        <option value="all">Todos</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>
                </div>

                <button type="submit">Buscar</button>
                <button
                    className="secondary-button"
                    type="button"
                    onClick={clearSearch}
                >
                    Limpar
                </button>
            </form>

            <PatientResults
                key={JSON.stringify([clinicId, search, statusFilter, page, revision])}
                clinicId={clinicId}
                search={search}
                statusFilter={statusFilter}
                page={page}
                editingDisabled={formState !== null}
                onEdit={openEdit}
                onPrevious={() => setPage((current) => Math.max(0, current - 1))}
                onNext={() => setPage((current) => current + 1)}
                onRetry={() => setRevision((current) => current + 1)}
            />
        </section>
    )
}