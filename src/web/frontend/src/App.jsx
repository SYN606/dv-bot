import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getAuthSession, getBotInfo } from "./api/client";
import LandingPage from "./pages/LandingPage";
import ServerSelectorPage from "./pages/ServerSelectorPage";
import OverviewPage from "./pages/OverviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import VerificationPage from "./pages/VerificationPage";
import AdminRolesPage from "./pages/AdminRolesPage";
import MediaOnlyPage from "./pages/MediaOnlyPage";
import CommandsPage from "./pages/CommandsPage";
import StickyPage from "./pages/StickyPage";
import AutoresponderPage from "./pages/AutoresponderPage";
import ConfigPage from "./pages/ConfigPage";
import PermissionsAuditPage from "./pages/PermissionsAuditPage";
import SupporterRewardsPage from "./pages/SupporterRewardsPage";
import AutoRoleRewardsPage from "./pages/AutoRoleRewardsPage";
import DocumentationPage from "./pages/DocumentationPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ErrorPage from "./pages/ErrorPage";
import Toast from "./components/ui/Toast";

export default function App() {
  const [user, setUser] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });

  const showToast = (message, type = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  useEffect(() => {
    Promise.all([
      getAuthSession().catch(() => null),
      getBotInfo().catch(() => null),
    ])
      .then(([sessionData, botData]) => {
        if (sessionData?.user) {
          setUser({
            ...sessionData.user,
            guilds: sessionData.guilds || [],
            isSuperuser: sessionData.isSuperuser || false,
          });
        }
        if (botData) {
          setBotInfo(botData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingPage user={user} botInfo={botInfo} />} />
        <Route
          path="/dashboard"
          element={
            user ? (
              <ServerSelectorPage
                user={user}
                botInfo={botInfo}
                onUserUpdate={(data) => {
                  if (data?.user) {
                    setUser({
                      ...data.user,
                      guilds: data.guilds || [],
                      isSuperuser: data.isSuperuser || false,
                    });
                  }
                  getBotInfo().then((b) => b && setBotInfo(b)).catch(() => {});
                  showToast("Server list synced successfully from Discord!");
                }}
              />
            ) : (
              <Navigate to="/auth/login" replace />
            )
          }
        />
        <Route
          path="/dashboard/:guildId"
          element={
            <OverviewPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/analytics"
          element={
            <AnalyticsPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/verification"
          element={
            <VerificationPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/admin-roles"
          element={
            <AdminRolesPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/permissions"
          element={
            <PermissionsAuditPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/media-only"
          element={
            <MediaOnlyPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/commands"
          element={
            <CommandsPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/sticky"
          element={
            <StickyPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/autoresponder"
          element={
            <AutoresponderPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/supporter"
          element={
            <SupporterRewardsPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/autorole"
          element={
            <AutoRoleRewardsPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/dashboard/:guildId/config"
          element={
            <ConfigPage
              user={user}
              botInfo={botInfo}
              showToast={showToast}
            />
          }
        />

        {/* Public & Unprotected Pages */}
        <Route path="/docs" element={<DocumentationPage user={user} botInfo={botInfo} />} />
        <Route path="/documentation" element={<DocumentationPage user={user} botInfo={botInfo} />} />
        <Route path="/terms" element={<TermsPage user={user} botInfo={botInfo} />} />
        <Route path="/terms-of-service" element={<TermsPage user={user} botInfo={botInfo} />} />
        <Route path="/privacy" element={<PrivacyPage user={user} botInfo={botInfo} />} />
        <Route path="/privacy-policy" element={<PrivacyPage user={user} botInfo={botInfo} />} />
        <Route path="/error" element={<ErrorPage user={user} botInfo={botInfo} />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<ErrorPage user={user} botInfo={botInfo} />} />
      </Routes>

      <Toast {...toast} />
    </BrowserRouter>
  );
}
