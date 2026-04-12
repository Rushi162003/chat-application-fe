import { useCallback, useState } from "react";
import { API_ENDPOINTS } from "@/src/common/enums";
import axios from "axios";
import { useRouter } from "next/router";
import Message from "@/src/components/Snackbar/message";

export default function LoginPage() {
  const router = useRouter();
  const [isLoginPage, setIsLoginPage] = useState<boolean>(true);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    name?: string;
  }>({ email: "", password: "" });

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isLoginPage) {
        try {

          const response = await axios.post(API_ENDPOINTS.LOGIN, formData);
          if (response.status === 200) {
            router.push("/");
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            Message.error(error.response.data.message);
          } else {
            Message.error("An error occurred");
          }
        }

      } else {
        try {

          const response = await axios.post(API_ENDPOINTS.SIGNUP, formData);

          if (response.status === 200) {
            router.push("/");
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            Message.error(error.response.data.message);
          } else {
            Message.error("An error occurred");
          }
        }

      }
    },
    [formData, isLoginPage, router]
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            Chat
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isLoginPage ? "Sign in" : "Create an account"} to continue
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          {!isLoginPage && (
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/20 transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/20 transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              {isLoginPage && (
                <button
                  type="button"
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-violet-500/20 transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 active:bg-violet-800 dark:bg-violet-500 dark:hover:bg-violet-400 dark:focus-visible:outline-violet-400 dark:active:bg-violet-600 cursor-pointer"
          >
            {isLoginPage ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isLoginPage ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            onClick={() => setIsLoginPage(!isLoginPage)}
          >
            {isLoginPage ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
