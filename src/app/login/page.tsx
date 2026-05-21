"use client";

import { useCallback, useState } from "react";
import { API_ENDPOINTS, PAGES } from "@/src/common/enums";
import axios from "axios";
import { useRouter } from "next/navigation";
import Message from "@/src/components/Snackbar/message";
import Cookies from "js-cookie";
import { axiosFetch } from "@/hooks/useAxios";
import { miscStore } from "@/src/stores/miscStore";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const setMe = miscStore((state) => state.setMe);
  const me = miscStore((state) => state.me);


  const [isLoginPage, setIsLoginPage] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    name?: string;
  }>({ email: "", password: "" });

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        const endpoint = isLoginPage ? API_ENDPOINTS.LOGIN : API_ENDPOINTS.SIGNUP;
        const response = await axios.post(endpoint, formData);

        if (response.status === 200) {
          Cookies.set("access", response.data.token);
          const [me] = await axiosFetch({
            url: API_ENDPOINTS.ME,
            method: "GET",
          });
          if (me) {
            setMe(me);
          }
          router.push(PAGES.HOME);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          Message.error(error.response.data.message);
        } else {
          Message.error("An error occurred");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isLoginPage, isSubmitting, router, setMe]
  );

  const inputClass =
    "w-full rounded-lg border border-cyan-400/20 bg-[rgba(6,14,28,0.75)] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/15";

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] animate-[fadeUp_0.7s_ease] rounded-2xl border border-cyan-400/25 bg-[rgba(8,16,30,0.62)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 px-3 py-1 text-xs font-medium tracking-wide text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            LIVE CHAT PLATFORM
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-300/80">
            {isLoginPage ? "Sign in" : "Create an account"} to continue
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          {!isLoginPage && (
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-200"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className={inputClass}
                value={formData.name}
                disabled={isSubmitting}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
              value={formData.email}
              disabled={isSubmitting}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200"
              >
                Password
              </label>
              {isLoginPage && (
                <button
                  type="button"
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLoginPage ? "current-password" : "new-password"}
                placeholder="••••••••"
                className={`${inputClass} pr-10`}
                value={formData.password}
                disabled={isSubmitting}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <button
                type="button"
                disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-cyan-200 disabled:opacity-50"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#3a7bd5] to-[#00d2ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,210,255,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting
              ? isLoginPage
                ? "Signing in..."
                : "Signing up..."
              : isLoginPage
                ? "Sign in"
                : "Sign up"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-300/80">
          {isLoginPage ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-cyan-300 hover:text-cyan-200"
            disabled={isSubmitting}
            onClick={() => {
              setIsLoginPage(!isLoginPage);
              setShowPassword(false);
            }}
          >
            {isLoginPage ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
