import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { FluidTransition } from '../../components/ui/DesignSystem';
import { typeClass } from '../../theme/typography';

export const AuthPages: React.FC<{
  mode: 'signup' | 'verify-email' | 'login' | 'forgot-password' | 'reset-password';
}> = ({ mode }) => {
  const {
    navigate,
    openExampleWorkspace,
    loginWithGoogle,
    loginUser,
    registerUser,
    verifyUserEmail,
    resendUserVerification,
    forgotUserPassword,
    resetUserPassword,
  } = useBrainWise();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(false);
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const isSubmitDisabled =
    isSubmitting ||
    (mode === 'verify-email' && verifyCode.replace(/\D/g, '').length < 6) ||
    (mode === 'forgot-password' && !email.trim()) ||
    (mode === 'reset-password' && (!password || !confirmPassword)) ||
    (mode === 'login' && (!email.trim() || !password)) ||
    (mode === 'signup' && (!name.trim() || !email.trim() || !password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'verify-email') {
      const digits = verifyCode.replace(/\D/g, '');
      if (digits.length !== 6) {
        setError('Enter the 6-digit verification code sent to your inbox.');
        return;
      }
      setIsSubmitting(true);
      const res = await verifyUserEmail(digits, email);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg('Email verified. Initializing Business Brain onboarding…');
        window.setTimeout(() => {
          navigate('onboarding');
        }, 350);
      } else {
        setError(res.error || 'Verification code is invalid or expired.');
      }
      return;
    }

    if (mode === 'forgot-password') {
      if (!email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      setIsSubmitting(true);
      const res = await forgotUserPassword(email);
      setIsSubmitting(false);
      if (res.sent) {
        setResetSent(true);
      } else {
        setError(res.error || 'Failed to dispatch reset instructions.');
      }
      return;
    }

    if (mode === 'reset-password') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setIsSubmitting(true);
      const res = await resetUserPassword('test-reset-token', password);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg('Password updated. Redirecting to sign in…');
        window.setTimeout(() => {
          navigate('login');
        }, 400);
      } else {
        setError(res.error || 'Password reset failed.');
      }
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid work or personal email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name to personalize your workspace.');
        return;
      }
      setIsSubmitting(true);
      const res = await registerUser(name, email, password);
      setIsSubmitting(false);
      if (res.success) {
        navigate('verify-email');
      } else {
        setError(res.error || 'Registration failed.');
      }
      return;
    }

    // Login
    setIsSubmitting(true);
    const res = await loginUser(email, password);
    setIsSubmitting(false);
    if (res.success) {
      navigate((res.nextRoute as any) || 'dashboard');
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginWithGoogle();
      setIsSubmitting(false);
      if (res.success) {
        navigate((res.nextRoute as any) || (mode === 'signup' ? 'onboarding' : 'dashboard'));
      } else {
        setError(res.error || 'Google Sign-In failed or was cancelled.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    }
  };

  const GoogleButton = () => (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={handleGoogleSignIn}
      className="w-full h-10 px-4 rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] hover:bg-[#F5F5F4] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-[#242424] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
        />
        <path
          fill="#34A853"
          d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.525 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
        />
      </svg>
      <span>{isSubmitting ? 'Signing in with Google…' : 'Continue with Google'}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-[1120px] w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('landing')}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5C5C58] hover:text-[#252525] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to BrainWise</span>
        </button>

        <button
          type="button"
          onClick={() => openExampleWorkspace()}
          className="text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
        >
          Explore Sample Showcase →
        </button>
      </div>

      <FluidTransition
        key={mode}
        direction="fade"
        className="w-full max-w-[420px] mx-auto my-8 bg-[#FFFFFF] border border-[#E6E6E2] rounded-[14px] p-6 sm:p-8 bw-surface-raised"
      >
        <div className="flex items-center mb-6">
          <img src="/brainwise-logo.png" alt="BrainWise" className="h-8 w-auto object-contain" />
        </div>

        {mode === 'signup' && (
          <>
            <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>Create your account</h1>
            <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
              Initialize your Business Brain in under two minutes — includes 150 one-time registration credits.
            </p>
          </>
        )}

        {mode === 'verify-email' && (
          <>
            <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>Verify your email</h1>
            <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
              Enter the 6-digit confirmation code sent to{' '}
              <strong className="text-[#252525]">{email || 'your email'}</strong>.
            </p>
          </>
        )}

        {mode === 'login' && (
          <>
            <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>Welcome back</h1>
            <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
              Sign in to your BrainWise command centre.
            </p>
          </>
        )}

        {mode === 'forgot-password' && (
          <>
            <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>Reset password</h1>
            <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
              Enter your email to receive a password reset link.
            </p>
          </>
        )}

        {mode === 'reset-password' && (
          <>
            <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>Set new password</h1>
            <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
              Choose a strong password for your BrainWise account.
            </p>
          </>
        )}

        {(mode === 'signup' || mode === 'login') && (
          <div className="mt-6 space-y-4">
            <GoogleButton />
            <div className="relative flex items-center justify-center text-xs text-[#8E8E88]">
              <span className="w-full border-t border-[#E6E6E2]" />
              <span className="px-3 bg-white shrink-0">or continue with email</span>
              <span className="w-full border-t border-[#E6E6E2]" />
            </div>
          </div>
        )}

        {mode === 'forgot-password' && resetSent ? (
          <div className="mt-6 p-4 rounded-[10px] bg-[#ECF7F1] border border-[#CEE8DA] space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#24724E]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset instructions sent</span>
            </div>
            <p className="text-xs text-[#242424] leading-relaxed">
              We sent a recovery link to <strong>{email}</strong>. For prototype inspection, you can
              preview the Reset Password screen directly.
            </p>
            <button
              type="button"
              onClick={() => navigate('reset-password')}
              className="w-full py-2 text-xs font-semibold text-white bg-[#171717] hover:bg-[#242424] rounded-[8px] cursor-pointer transition-colors"
            >
              Preview Reset Password Screen →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="p-3 rounded-[8px] bg-[#FDF0F0] border border-[#F5CECE] text-xs text-[#BC3E3E]"
              >
                {error}
              </div>
            )}
            {successMsg && (
              <div
                role="status"
                className="p-3 rounded-[8px] bg-[#ECF7F1] border border-[#CEE8DA] text-xs text-[#24724E] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'verify-email' && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="auth-verify-code"
                    className="block text-xs font-medium text-[#242424] mb-1.5"
                  >
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-verify-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="482910"
                      className="w-full h-11 pl-9 pr-3 text-base font-mono-num tracking-[0.28em] border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#686864]">
                    <span>Prototype tip: use 482910 (or 000000 for error)</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={async () => {
                        const res = await resendUserVerification(email);
                        setResendCooldown(res.cooldownSeconds || 60);
                        setSuccessMsg('Fresh verification code dispatched.');
                      }}
                      className="font-medium text-[#C44D00] hover:text-[#A33E00] disabled:text-[#8E8E88] disabled:cursor-not-allowed cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyCode('482910')}
                  className="text-xs font-medium text-[#5C5C58] hover:text-[#252525] underline decoration-dotted underline-offset-4 cursor-pointer"
                >
                  Auto-fill sample verification code (482910)
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-[#242424] mb-1.5"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vishesh"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                  />
                </div>
              </div>
            )}

            {(mode === 'signup' || mode === 'login' || mode === 'forgot-password') && (
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-[#242424] mb-1.5"
                >
                  Work or Personal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                  />
                </div>
              </div>
            )}

            {(mode === 'signup' || mode === 'login' || mode === 'reset-password') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="text-xs font-medium text-[#242424]">
                    {mode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => navigate('forgot-password')}
                      className="text-xs text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                  />
                </div>
              </div>
            )}

            {mode === 'reset-password' && (
              <div>
                <label
                  htmlFor="auth-confirm"
                  className="block text-xs font-medium text-[#242424] mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="relative overflow-hidden w-full h-10 bg-[#FF7417] hover:bg-[#E55F08] disabled:bg-[#E6E6E2] disabled:text-[#858585] disabled:shadow-none disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full shadow-[0_1px_2px_rgba(255,116,23,0.28)] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent bw-liquid-shimmer"
                />
              )}
              {isSubmitting && (
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
              <span>
                {isSubmitting
                  ? 'Processing…'
                  : mode === 'signup'
                    ? 'Create Account & Verify Email'
                    : mode === 'verify-email'
                      ? 'Verify & Start Onboarding'
                      : mode === 'login'
                        ? 'Sign In'
                        : mode === 'forgot-password'
                          ? 'Send Reset Link'
                          : 'Update Password'}
              </span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#E6E6E2] text-center text-xs text-[#686864]">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('login')}
                className="font-semibold text-[#242424] hover:text-[#C44D00] cursor-pointer"
              >
                Sign in
              </button>
            </>
          ) : mode === 'verify-email' ? (
            <>
              Entered the wrong email?{' '}
              <button
                type="button"
                onClick={() => navigate('signup')}
                className="font-semibold text-[#242424] hover:text-[#C44D00] cursor-pointer"
              >
                Edit signup details
              </button>
            </>
          ) : (
            <>
              Need a BrainWise workspace?{' '}
              <button
                type="button"
                onClick={() => navigate('signup')}
                className="font-semibold text-[#242424] hover:text-[#C44D00] cursor-pointer"
              >
                Create account
              </button>
            </>
          )}
        </div>
      </FluidTransition>

      <div className="text-center text-xs text-[#8E8E88]">
        Workspace demo &amp; preview authentication · Instant access via Launch Demo Workspace.
      </div>
    </div>
  );
};
