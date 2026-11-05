import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PatientForm from '../components/PatientForm'

type Patient = {
    id: string
    full_name: string
    preferred_name: string | null
    birth_date: string | null
    phone: string | null
    active: boolean
}

type ResultState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; patients: Patient[]; total: number }

type ResultsProps = {
    clinicId: string
    search: string
    page: number
    onPrevious: () => void
    onNext: () => void
    onRetry: () => void
}

const PAGE_SIZE = 20

function PatientResults({
    clinicId,
    search,
    page,
    onPrevious,
    onNext,
    onRetry,
}: ResultsProps) {
    const [result, setResult] = useState<ResultState>({
        status: 'loading',
    })

    useEffect(() => {
        const controller = new AbortController()

        async function loadPatients() {
            try {
                let query = supabase
                    .from('patients')
                    .select(
                        'id, full_name, preferred_name, birth_date, phone, active',
                        { count: 'exact' },
                    )
                    .eq('clinic_id', clinicId)
                    .order('full_name')
                    .order('id')

                if (search) {
                    const escaped = search.replace(/[\\%_]/g, '\\$&')
                    query = query.ilike('full_name', `%${escaped}%`)
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
    }, [clinicId, search, page])

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
                    <h3>{search ? 'Nenhum resultado' : 'Nenhum paciente disponível'}</h3>
                    <p className="muted">
                        {search
                            ? 'Tente buscar por outra parte do nome.'
                            : 'Os pacientes disponíveis para sua conta aparecerão aqui.'}
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
                            </tr>
                        </thead>
                        <tbody>
                            {result.patients.map((patient) => (
                                <tr key={patient.id}>
                                    <td>
                                        <strong>{patient.full_name}</strong>
                                        {patient.preferred_name && (
                                            <small>Prefere: {patient.preferred_name}</small>
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
            </div>
        </>
    )
}

export default function PatientsPage({ clinicId }: { clinicId: string }) {
    const [input, setInput] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [revision, setRevision] = useState(0)
    const [showForm, setShowForm] = useState(false)
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
        setPage(0)
        setRevision((current) => current + 1)
    }

    function handlePatientSaved(name: string) {
        setShowForm(false)
        setSavedMessage(`Cadastro de ${name} realizado com sucesso.`)

        // Filtrar pelo nome cadastrado para facilitar a conferência.
        setInput(name)
        setSearch(name)
        setPage(0)
        setRevision((current) => current + 1)
    }

    return (
        <section className="patients-page">
            <div className="patients-heading">
                <div>
                    <p className="eyebrow">CADASTROS</p>
                    <h1>Pacientes</h1>
                    <p className="muted">Consulte os pacientes da sua clínica.</p>
                </div>

                <button
                    type="button"
                    disabled={showForm}
                    onClick={() => {
                        setSavedMessage('')
                        setShowForm(true)
                    }}
                >
                    Novo paciente
                </button>
            </div>

            {savedMessage && (
                <p className="connection-status" role="status">
                    {savedMessage}
                </p>
            )}

            {showForm && (
                <PatientForm
                    clinicId={clinicId}
                    onSaved={handlePatientSaved}
                    onCancel={() => setShowForm(false)}
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
                key={JSON.stringify([clinicId, search, page, revision])}
                clinicId={clinicId}
                search={search}
                page={page}
                onPrevious={() => setPage((current) => Math.max(0, current - 1))}
                onNext={() => setPage((current) => current + 1)}
                onRetry={() => setRevision((current) => current + 1)}
            />
        </section>
    )
}