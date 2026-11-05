import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './App.css'
import Workspace from './components/Workspace'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    setLoading(true)
    setError('')

    try {
      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (authError) {
        console.error('Diagnóstico do login:', {
          code: authError.code,
          status: authError.status,
          message: authError.message,
        })

        setError(
          authError.code === 'invalid_credentials'
            ? 'E-mail ou senha incorretos.'
            : authError.message,
        )
      }
    } catch {
      setError('Não foi possível conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="brand-panel">
        <span className="brand-name">prisma<span>.</span></span>

        <div>
          <p className="eyebrow">GESTÃO CLÍNICA</p>
          <h1>Clareza para gerir.<br />Tempo para cuidar.</h1>
          <p className="brand-description">
            Uma rotina mais organizada para pacientes,
            profissionais e sua equipe.
          </p>
        </div>

        <p className="brand-footer">Agenda · Atendimento · Gestão</p>
      </section>

      <section className="form-panel">
        <div className="login-card">
          <p className="eyebrow">BEM-VINDO AO PRISMA</p>
          <h2>Acesse sua conta</h2>
          <p className="muted">
            Entre com o e-mail e a senha fornecidos pela administração.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && <p className="error-message" role="alert">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="login-note">Acesso exclusivo para usuários autorizados.</p>
        </div>
      </section>
    </main>
  )
}

type AccountState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready'
    fullName: string
    clinicName: string
    clinicId: string
  }

function Account({ session }: { session: Session }) {
  const [account, setAccount] = useState<AccountState>({
    status: 'loading',
  })
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, clinic_id')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) throw new Error(profileError.message)

        if (!profile) {
          throw new Error(
            'Sua conta não possui um perfil ativo disponível no Prisma.',
          )
        }

        const { data: clinic, error: clinicError } = await supabase
          .from('clinics')
          .select('name')
          .eq('id', profile.clinic_id)
          .maybeSingle()

        if (clinicError) throw new Error(clinicError.message)

        if (!clinic) {
          throw new Error('Sua clínica não está disponível para acesso.')
        }

        if (!cancelled) {
          setAccount({
            status: 'ready',
            fullName: profile.full_name,
            clinicName: clinic.name,
            clinicId: profile.clinic_id
          })
        }
      } catch (error) {
        if (!cancelled) {
          setAccount({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar seu perfil.',
          })
        }
      }
    }

    void loadAccount()

    return () => {
      cancelled = true
    }
  }, [session.user.id])

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })

      if (error) throw error
    } catch {
      setSignOutError('Não foi possível sair. Tente novamente.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <span className="brand-name">prisma<span>.</span></span>
        <button
          className="secondary-button"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Saindo…' : 'Sair'}
        </button>
      </header>

      <section
        className={
          account.status === 'ready'
            ? 'workspace-container'
            : 'account-card'
        }
      >
        {account.status === 'loading' && (
          <p role="status">Carregando seu perfil…</p>
        )}

        {account.status === 'error' && (
          <>
            <h1>Não foi possível liberar o acesso</h1>
            <p className="error-message" role="alert">
              {account.message}
            </p>
            <p className="muted">
              Verifique o cadastro com a administração ou saia da conta.
            </p>
          </>
        )}

        {account.status === 'ready' && (
          <Workspace
            clinicId={account.clinicId}
            fullName={account.fullName}
            clinicName={account.clinicName}
          />
        )}

        {signOutError && (
          <p className="error-message" role="alert">{signOutError}</p>
        )}
      </section>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(
    undefined,
  )

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession)
      })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <main className="loading-page" role="status">
        Iniciando o Prisma…
      </main>
    )
  }

  return session
    ? <Account key={session.user.id} session={session} />
    : <Login />
}