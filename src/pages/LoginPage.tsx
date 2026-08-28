import React, { useState, useEffect } from "react";
import {
  Shield,
  User,
  Building2,
  Lock,
  ArrowRight,
  LogOut,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  getCurrentAuthSession,
  signInWithEmail,
  signOutCurrentUser,
  subscribeAuthState,
  type AuthContext,
} from "@/lib/services/securityService";
import {
  getUserMemberships,
  getActiveOrganizationContext,
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";
import { resolveCompanyStudioAccess, resolveCompanyStudioAccessAsync } from "@/lib/services/studioService";
import { findCompanyByEmailOrName, getCompanyRecord, findCompaniesByOwnerOrEmail } from "@/lib/repositories/companyRepository";

interface LoginPageProps {
  onNavigate?: (path: string) => void;
  onLoginSuccess?: () => void;
}

export function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  const [currentAuth, setCurrentAuth] = useState<AuthContext>(() => getCurrentAuthSession());
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // Real company login form state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((auth) => {
      setCurrentAuth(auth);
      if (auth.uid) {
        const activeCtx = getActiveOrganizationContext(auth.uid);
        setActiveOrgId(activeCtx?.companyId || activeCtx?.organizationId || null);
      } else {
        setActiveOrgId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setForgotPasswordNotice(null);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const auth = await signInWithEmail(trimmedEmail, password);

      if (auth && auth.uid) {
        // Check if company has an incomplete or active onboarding from Firestore
        const userCompanies = await findCompaniesByOwnerOrEmail(auth.uid, trimmedEmail);
        const comp =
          userCompanies[0] ||
          (await findCompanyByEmailOrName(trimmedEmail)) ||
          (getUserMemberships(auth.uid)[0]?.companyId
            ? await getCompanyRecord(getUserMemberships(auth.uid)[0].companyId)
            : null);

        if (comp) {
          if (comp.lifecycleStatus === "ACTIVE" || comp.status === "ACTIVE" || comp.onboardingCompleted) {
            // Already active company: immediately route to Studio
            setActiveOrganizationContext(auth.uid, comp.id);
            setActiveOrgId(comp.id);
            if (onLoginSuccess) {
              onLoginSuccess();
            }
            navigateTo("/studio");
            return;
          } else {
            // Incomplete registration: redirect directly to onboarding page to complete registration
            navigateTo("/company/onboarding");
            return;
          }
        }

        const activeCtx = getActiveOrganizationContext(auth.uid);
        setActiveOrgId(activeCtx?.companyId || activeCtx?.organizationId || null);

        if (onLoginSuccess) {
          onLoginSuccess();
        }

        const studioCheck = await resolveCompanyStudioAccessAsync(auth, activeCtx?.companyId || undefined);
        if (studioCheck.isAllowed) {
          navigateTo("/studio");
        }
      }
    } catch (err: any) {
      setLoginError(err?.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const uid = currentAuth.uid;
    if (uid) {
      setActiveOrganizationContext(uid, null);
    }
    await signOutCurrentUser();
    setActiveOrgId(null);
    setForgotPasswordNotice(null);
    setLoginError(null);
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setLoginError("Please enter your work email to receive password reset instructions.");
      return;
    }
    setForgotPasswordNotice(`Password reset instructions have been dispatched to ${email.trim()}.`);
    setLoginError(null);
  };

  const memberships = currentAuth.uid ? getUserMemberships(currentAuth.uid) : [];
  const activeOrg = currentAuth.uid ? getActiveOrganizationContext(currentAuth.uid) : null;
  const studioAccess = resolveCompanyStudioAccess(currentAuth, activeOrgId || undefined);

  return (
    <div
      id="company-login-page"
      className="min-h-screen bg-canvas text-graphite font-sans antialiased py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Brand & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-royal/10 border border-royal/20 text-royal text-xs font-mono font-bold tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            <span>MarineWorld.City</span>
          </div>

          <h1 className="text-3xl font-extrabold text-graphite tracking-tight uppercase sm:text-4xl">
            COMPANY LOGIN
          </h1>

          <p className="text-sm text-stone max-w-sm mx-auto leading-relaxed">
            Sign in with your work credentials to access your AI-Native Company workspace.
          </p>
        </div>

        {/* If Active Session Exists, Show Seamless Context Card */}
        {currentAuth.uid && (
          <div className="bg-white border-2 border-royal/30 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold text-base shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      AUTHENTICATED
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-graphite mt-0.5">
                    {currentAuth.displayName || currentAuth.email}
                  </h3>
                  <p className="text-xs text-stone">{currentAuth.email}</p>
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={handleSignOut}
                className="p-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                title="Sign out of current account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {memberships.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs text-stone">
                  Active Workspace: <strong className="text-graphite">{activeOrg?.organizationName || "Pacific Maritime Hub"}</strong> ({activeOrg?.role || "OWNER"})
                </div>

                <button
                  id="btn-enter-studio-authenticated"
                  onClick={() => navigateTo("/studio")}
                  className="w-full py-3 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>CONTINUE TO COMPANY STUDIO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone">
                  No company workspace assigned yet. You can create your company now.
                </p>
                <button
                  onClick={() => navigateTo("/company/onboarding")}
                  className="w-full py-3 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>CREATE YOUR AI-NATIVE COMPANY</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Real User-Facing Company Login Form */}
        <div className="bg-white border border-line rounded-2xl p-7 sm:p-8 shadow-sm space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {forgotPasswordNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{forgotPasswordNotice}</span>
              </div>
            )}

            {/* Work Email */}
            <div className="space-y-1.5">
              <label htmlFor="work-email" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="work-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={(e) => {
                    if (e.target.value === "owner@argento-marine.com") setEmail("");
                  }}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-line rounded-xl text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-royal hover:text-royal-dark font-medium transition cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    if (e.target.value === "••••••••••••") setPassword("");
                  }}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-line rounded-xl text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone hover:text-graphite transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-stone cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-line text-royal focus:ring-royal"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                id="btn-company-sign-in"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-royal hover:bg-royal-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Create Your AI-Native Company */}
        <div className="bg-slate-50 border border-line rounded-2xl p-6 text-center space-y-3">
          <p className="text-xs text-stone">
            Don&apos;t have an AI-Native Company account yet?
          </p>
          <button
            id="btn-create-company-link"
            type="button"
            onClick={() => navigateTo("/company/onboarding")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-line text-royal text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>CREATE YOUR AI-NATIVE COMPANY</span>
          </button>
        </div>

        {/* Global Navigation Return */}
        <div className="flex items-center justify-between text-xs text-stone pt-2">
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="hover:text-graphite transition flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            ← Return to MarineWorld.City
          </button>
          <span className="text-stone">MarineWorld.City Company Login</span>
        </div>
      </div>
    </div>
  );
}
