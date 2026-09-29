import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// ── Eagerly loaded (tiny, critical for every visitor) ──────────────────────
import DashboardLayout from "../layouts/DashboardLayout";
import LegalLayout from "../layouts/LegalLayout";
import RouteLoader from "./RouteLoader";

// ── Public pages: small, but lazy to shrink initial bundle ─────────────────
const HomePage = lazy(() => import("../pages/home/HomePage"));
const DocumentationPage = lazy(() => import("../pages/home/DocumentationPage"));
const ErrorPage = lazy(() => import("../pages/home/ErrorPage"));
const TermsPage = lazy(() => import("../pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("../pages/legal/PrivacyPage"));

// ── Dashboard entry ────────────────────────────────────────────────────────
const ServerSelectorPage = lazy(() => import("../pages/dashboard/ServerSelectorPage"));

// ── Dashboard feature pages (lazy — keeps Chart.js out of initial bundle) ──
const OverviewPage = lazy(() => import("../pages/dashboard/OverviewPage"));
const AnalyticsPage = lazy(() => import("../pages/dashboard/AnalyticsPage"));
const VerificationPage = lazy(() => import("../pages/dashboard/VerificationPage"));
const AdminRolesPage = lazy(() => import("../pages/dashboard/AdminRolesPage"));
const MediaOnlyPage = lazy(() => import("../pages/dashboard/MediaOnlyPage"));
const CommandsPage = lazy(() => import("../pages/dashboard/CommandsPage"));
const StickyPage = lazy(() => import("../pages/dashboard/StickyPage"));
const AutoresponderPage = lazy(() => import("../pages/dashboard/AutoresponderPage"));
const ConfigPage = lazy(() => import("../pages/dashboard/ConfigPage"));
const PermissionsAuditPage = lazy(() => import("../pages/dashboard/PermissionsAuditPage"));
const SupporterRewardsPage = lazy(() => import("../pages/dashboard/SupporterRewardsPage"));
const AutoRoleRewardsPage = lazy(() => import("../pages/dashboard/AutoRoleRewardsPage"));
const WarningPunishmentsPage = lazy(() => import("../pages/dashboard/WarningPunishmentsPage"));

export default function AppRoutes({ user, botInfo, showToast, onUserUpdate }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage user={user} botInfo={botInfo} />} />
        <Route path="/docs" element={<DocumentationPage user={user} botInfo={botInfo} />} />
        <Route path="/documentation" element={<DocumentationPage user={user} botInfo={botInfo} />} />

        {/* Legal Routes */}
        <Route element={<LegalLayout user={user} botInfo={botInfo} />}>
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        </Route>

        {/* Authentication / Dashboard Entry */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <ServerSelectorPage
                user={user}
                botInfo={botInfo}
                onUserUpdate={onUserUpdate}
              />
            ) : (
              <Navigate to="/auth/login" replace />
            )
          }
        />

        {/* Nested Dashboard Routes — DashboardLayout eagerly loaded, pages lazy */}
        <Route path="/dashboard/:guildId" element={<DashboardLayout user={user} botInfo={botInfo} />}>
          <Route index element={<OverviewPage showToast={showToast} />} />
          <Route path="analytics" element={<AnalyticsPage showToast={showToast} />} />
          <Route path="verification" element={<VerificationPage showToast={showToast} />} />
          <Route path="admin-roles" element={<AdminRolesPage showToast={showToast} />} />
          <Route path="media-only" element={<MediaOnlyPage showToast={showToast} />} />
          <Route path="commands" element={<CommandsPage showToast={showToast} />} />
          <Route path="sticky" element={<StickyPage showToast={showToast} />} />
          <Route path="autoresponder" element={<AutoresponderPage showToast={showToast} />} />
          <Route path="config" element={<ConfigPage showToast={showToast} />} />
          <Route path="permissions" element={<PermissionsAuditPage showToast={showToast} />} />
          <Route path="supporter" element={<SupporterRewardsPage showToast={showToast} />} />
          <Route path="autorole" element={<AutoRoleRewardsPage showToast={showToast} />} />
          <Route path="warning-punishments" element={<WarningPunishmentsPage showToast={showToast} />} />
        </Route>

        {/* Fallback */}
        <Route path="/error" element={<ErrorPage user={user} botInfo={botInfo} />} />
        <Route path="*" element={<ErrorPage user={user} botInfo={botInfo} />} />
      </Routes>
    </Suspense>
  );
}
