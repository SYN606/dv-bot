import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  AlertTriangle,
  Compass,
  Home,
  BookOpen,
  ArrowLeft,
  LayoutDashboard,
  ShieldAlert,
  FileQuestion,
} from "lucide-react";

export default function ErrorPage({ user, botInfo }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Support custom error details passed via router state or query parameters
  const state = location.state || {};
  const queryParams = new URLSearchParams(location.search);

  const errorCode = state.code || queryParams.get("code") || "404";
  const errorTitle = state.title || queryParams.get("title") || (errorCode === "500" ? "Internal Server Error" : errorCode === "403" ? "Access Denied" : "Page Not Found");
  const errorMessage =
    state.message ||
    queryParams.get("message") ||
    (errorCode === "404"
      ? "The page or resource you are looking for might have been removed, had its name changed, or is temporarily unavailable."
      : "An unexpected error occurred while processing your request. Please try again or head back to safety.");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="fixed top-[-140px] left-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-140px] right-[-100px] w-[600px] h-[600px] rounded-full bg-rose-600/10 blur-[160px] pointer-events-none -z-10" />

      {/* Top Navigation */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Main Error Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-16">
        <div className="max-w-xl w-full text-center space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono font-semibold shadow-lg shadow-rose-500/10">
            {errorCode === "404" ? (
              <FileQuestion className="w-4 h-4 text-rose-400" />
            ) : errorCode === "403" ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>Error {errorCode}</span>
          </div>

          {/* Graphic & Error Numbers */}
          <div className="relative">
            <h1 className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-b from-white via-slate-200 to-slate-600/30 bg-clip-text text-transparent select-none">
              {errorCode}
            </h1>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <Compass className="w-48 h-48 text-indigo-400 animate-pulse" />
            </div>
          </div>

          {/* Titles and Explanations */}
          <div className="space-y-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {errorTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>

            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Command Docs</span>
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Secondary Helpful Links */}
          <div className="pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <Link to="/docs" className="hover:text-indigo-400 transition-colors">
              Documentation
            </Link>
            <span className="text-white/10">•</span>
            <Link to="/terms" className="hover:text-indigo-400 transition-colors">
              Terms of Service
            </Link>
            <span className="text-white/10">•</span>
            <Link to="/privacy" className="hover:text-indigo-400 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-white/10">•</span>
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors"
            >
              Support Network
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer botInfo={botInfo} />
    </div>
  );
}
