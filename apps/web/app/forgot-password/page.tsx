"use client";

import { useState } from "react";
import Loader from "@/components/Common/Loader";
import Link from "next/link";
import { authService } from "@/lib/authService";
import { Kanban, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center auth-gradient px-4 overflow-hidden">
        <div className="float-shape float-shape-1" />
        <div className="float-shape float-shape-2" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Kanban size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Hintro</h1>
          </div>
          <div className="w-full max-w-[400px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-sm text-slate-500 mb-7 leading-relaxed">
              We sent a password reset link to<br />
              <strong className="text-slate-700">{email}</strong>
            </p>
            <Link href="/login" className="btn btn-primary px-6">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center auth-gradient px-4 overflow-hidden">
      <div className="float-shape float-shape-1" />
      <div className="float-shape float-shape-2" />
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Kanban size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hintro</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">Reset Your Password</p>
        <div className="w-full max-w-[400px] mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h2>
            <p className="text-sm text-slate-500 mb-7">Enter your email to receive a reset link.</p>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full py-2.5"
              >
                {isSubmitting ? <Loader size="sm" /> : "Send Reset Link"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-medium transition-colors">
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
