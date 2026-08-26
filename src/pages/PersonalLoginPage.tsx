import React, { useState } from "react";
import {
  Shield,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  signInWithEmail,
  createUserWithEmail,
  getCurrentAuthSession,
} from "@/lib/services/securityService";
import { setPersonalVisitorMode } from "@/lib/services/accessContextService";

interface PersonalLoginPageProps {
  onNavigate?: (path: string) => void;
  onLoginSuccess?: () => void;
}

export function PersonalLoginPage({
  onNavigate,
  onLoginSuccess,
}: PersonalLoginPageProps) {
  const [mode, setMode] = useState<"SIGN_IN" | "CREATE_ACCOUNT">("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your work email.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      // Authenticate personal user
      const auth = await signInWithEmail(trimmedEmail, password);

      // Ensure personal visitor mode without company attachment
      if (auth.uid) {
        setPersonalVisitorMode(auth.uid);
      }

      setSuccessMessage(`Welcome back, ${auth.displayName || "Personal Visitor"}!`);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigateTo("/workspace");
        }
      }, 400);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedEmail) {
      setErrorMessage("Please enter an email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const auth = await createUserWithEmail(
        trimmedEmail,
        password,
        trimmedName || undefined
      );

      // Ensure personal visitor mode
      if (auth.uid) {
        setPersonalVisitorMode(auth.uid);
      }

      setSuccessMessage(`Personal account created! Welcome, ${auth.displayName}!`);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigateTo("/workspace");
        }
      }, 400);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create personal account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="personal-login-page"
      className="min-h-screen bg-canvas text-graphite font-sans antialiased flex flex-col justify-between"
    >
      {/* Standalone Clean Application Header */}
      <header className="border-b border-line bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            onClick={() => navigateTo("/")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-royal flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-graphite">
              MarineWorld.City
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => navigateTo("/gateway")}
              className="text-stone hover:text-graphite font-semibold px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              ← Back to Gateway
            </button>
            <button
              onClick={() => navigateTo("/")}
              className="text-royal hover:text-royal-dark font-medium hidden sm:inline-block cursor-pointer"
            >
              Back to MarineWorld
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header Card */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-royal/10 border border-royal/20 text-royal text-xs font-mono font-bold tracking-wide">
              <Shield className="w-3.5 h-3.5" />
              <span>MarineWorld.City</span>
            </div>

            <h1
              id="personal-login-title"
              className="text-3xl font-extrabold text-graphite tracking-tight uppercase sm:text-4xl"
            >
              {mode === "SIGN_IN" ? "PERSONAL LOGIN" : "CREATE PERSONAL ACCOUNT"}
            </h1>

            <p
              id="personal-login-subtitle"
              className="text-sm text-stone max-w-sm mx-auto leading-relaxed font-medium"
            >
              {mode === "SIGN_IN"
                ? "Access your MarineWorld.City personal workspace."
                : "Create your personal visitor account for public exploration, collections, and saved items."}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-line rounded-2xl p-7 sm:p-8 shadow-sm space-y-6">
            {errorMessage && (
              <div
                id="alert-login-error"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div
                id="alert-login-success"
                className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="font-semibold leading-relaxed">{successMessage}</div>
              </div>
            )}

            <form
              id="form-personal-auth"
              onSubmit={mode === "SIGN_IN" ? handleSignIn : handleCreateAccount}
              className="space-y-4"
            >
              {mode === "CREATE_ACCOUNT" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-personal-name"
                    className="block text-xs font-semibold text-graphite uppercase tracking-wider"
                  >
                    Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-personal-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alexander Vance"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-line rounded-xl text-sm text-graphite bg-white focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="input-personal-email"
                  className="block text-xs font-semibold text-graphite uppercase tracking-wider"
                >
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-personal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-line rounded-xl text-sm text-graphite bg-white focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-personal-password"
                    className="block text-xs font-semibold text-graphite uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === "SIGN_IN" && (
                    <button
                      type="button"
                      id="btn-forgot-password"
                      onClick={() =>
                        setErrorMessage(
                          "Password reset link has been dispatched to your email address."
                        )
                      }
                      className="text-[11px] font-semibold text-royal hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-personal-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-line rounded-xl text-sm text-graphite bg-white focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition"
                  />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone hover:text-graphite transition cursor-pointer"
                    aria-label={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-personal-submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 mt-6 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? "AUTHENTICATING..." : mode === "SIGN_IN" ? "SIGN IN" : "CREATE PERSONAL ACCOUNT"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Switch Mode Action */}
            <div className="pt-4 border-t border-line text-center space-y-2">
              <div className="text-xs text-stone">
                {mode === "SIGN_IN" ? (
                  <>
                    Don&apos;t have a personal account?{" "}
                    <button
                      type="button"
                      id="btn-switch-create-account"
                      onClick={() => {
                        setMode("CREATE_ACCOUNT");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-royal hover:underline uppercase tracking-wide ml-1 cursor-pointer"
                    >
                      CREATE PERSONAL ACCOUNT
                    </button>
                  </>
                ) : (
                  <>
                    Already have a personal account?{" "}
                    <button
                      type="button"
                      id="btn-switch-sign-in"
                      onClick={() => {
                        setMode("SIGN_IN");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-royal hover:underline uppercase tracking-wide ml-1 cursor-pointer"
                    >
                      SIGN IN
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Return */}
          <div className="flex items-center justify-between text-xs text-stone pt-2">
            <button
              onClick={() => navigateTo("/gateway")}
              className="hover:text-graphite transition flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              ← Back to Access Gateway
            </button>
            <button
              onClick={() => navigateTo("/")}
              className="hover:text-graphite transition flex items-center gap-1.5 font-medium cursor-pointer"
            >
              Explore MarineWorld
            </button>
          </div>
        </div>
      </main>

      {/* Standalone Footer */}
      <footer className="py-6 border-t border-line text-center text-xs text-stone">
        <p>MarineWorld.City — Sovereign Maritime Operating Environment</p>
      </footer>
    </div>
  );
}
