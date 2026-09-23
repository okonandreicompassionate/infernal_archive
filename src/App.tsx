import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { EntityBrowser } from "./components/EntityBrowser";
import { EntityDetailModal } from "./components/EntityDetailModal";
import { UniverseGraph } from "./components/UniverseGraph";
import { VisualTimeline } from "./components/VisualTimeline";
import { WriterWorkspace } from "./components/WriterWorkspace";
import { ArtistWorkspace } from "./components/ArtistWorkspace";
import { AILorekeeperChat } from "./components/AILorekeeperChat";
import { UniverseBibleExportModal } from "./components/UniverseBibleExportModal";
import { CommandPalette } from "./components/CommandPalette";
import { QuickCreateModal } from "./components/QuickCreateModal";
import { AuthScreen } from "./components/AuthScreen";
import { GuideModal } from "./components/GuideModal";
import { InviteAdminModal } from "./components/InviteAdminModal";
import { NicknameModal } from "./components/NicknameModal";
import { SettingsPage } from "./components/SettingsPage";
import { PasswordSetupScreen } from "./components/PasswordSetupScreen";
import { getProfile, supabase, type UserRole } from "./utils/supabase";

export default function App() {
  const routeForTab = (tab: string) => (tab === "dashboard" ? "/" : `/${tab}`);
  const tabForPath = (path: string) => {
    const tab = path.replace(/^\//, "").split("/")[0];
    return tab || "dashboard";
  };
  const [activeTab, setActiveTabState] = useState(() =>
    tabForPath(window.location.pathname),
  );
  const [selectedEntity, setSelectedEntity] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showBibleExport, setShowBibleExport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => window.location.pathname === "/reset-password",
  );

  useEffect(() => {
    const handlePopState = () =>
      setActiveTabState(tabForPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = (tab: string) => {
    const path = routeForTab(tab);
    if (window.location.pathname !== path)
      window.history.pushState({}, "", path);
    setActiveTabState(tab);
    setSelectedEntity(null);
  };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      setUser(
        sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null,
      );
      const profile = sessionUser ? await getProfile(sessionUser.id) : null;
      if (sessionUser && profile && !profile.active) {
        await supabase?.auth.signOut();
        setAuthReady(true);
        return;
      }
      setRole(profile?.role || null);
      setDisplayName(profile?.display_name || "");
      setProfileChecked(true);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
        const sessionUser = session?.user;
        setUser(
          sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null,
        );
        const profile = sessionUser ? await getProfile(sessionUser.id) : null;
        if (sessionUser && profile && !profile.active) {
          await supabase?.auth.signOut();
          setUser(null);
          setRole(null);
          setDisplayName("");
          return;
        }
        setRole(profile?.role || null);
        setDisplayName(profile?.display_name || "");
        setProfileChecked(true);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectItem = (type: string, id: string) => {
    setSelectedEntity({ type, id });
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!authReady)
    return <div className="auth-loading">Loading secure archive...</div>;
  if (!user) return <AuthScreen />;
  if (passwordRecovery) return <PasswordSetupScreen />;

  return (
    <div className="universe-shell min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenQuickCreate={() => setShowQuickCreate(true)}
        onOpenBibleExport={() => setShowBibleExport(true)}
        onRefreshData={handleRefresh}
        onSelectItem={handleSelectItem}
        role={role}
        userEmail={user.email}
        displayName={displayName}
        onOpenGuide={() => setShowGuide(true)}
        onOpenInvite={() => setShowInvite(true)}
        onSignOut={() => supabase?.auth.signOut()}
      />

      <main key={refreshKey}>
        {activeTab === "dashboard" && (
          <Dashboard
            setActiveTab={setActiveTab}
            onSelectItem={handleSelectItem}
            displayName={displayName}
          />
        )}
        {[
          "characters",
          "teams",
          "planets",
          "locations",
          "powers",
          "artifacts",
          "events",
          "issues",
        ].includes(activeTab) && (
          <EntityBrowser
            key={activeTab}
            entityType={activeTab}
            onSelectItem={handleSelectItem}
            onOpenQuickCreate={() => setShowQuickCreate(true)}
          />
        )}
        {activeTab === "graph" && <UniverseGraph />}
        {activeTab === "timeline" && <VisualTimeline />}
        {activeTab === "writer" && <WriterWorkspace />}
        {activeTab === "artist" && <ArtistWorkspace />}
        {activeTab === "lorekeeper" && <AILorekeeperChat />}
        {activeTab === "settings" && (
          <SettingsPage
            userId={user.id}
            email={user.email}
            displayName={displayName}
            role={role}
            onDisplayNameChange={setDisplayName}
          />
        )}
      </main>

      {/* Modals */}
      {selectedEntity && (
        <EntityDetailModal
          entityType={selectedEntity.type}
          entityId={selectedEntity.id}
          onClose={() => setSelectedEntity(null)}
          onSelectRelated={(type, id) => setSelectedEntity({ type, id })}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          setActiveTab={setActiveTab}
          onOpenQuickCreate={() => setShowQuickCreate(true)}
        />
      )}

      {showQuickCreate && (
        <QuickCreateModal
          onClose={() => setShowQuickCreate(false)}
          onCreated={handleRefresh}
        />
      )}

      {showBibleExport && (
        <UniverseBibleExportModal onClose={() => setShowBibleExport(false)} />
      )}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {showInvite && <InviteAdminModal onClose={() => setShowInvite(false)} />}
      {profileChecked && !displayName && (
        <NicknameModal userId={user.id} onSaved={setDisplayName} />
      )}
    </div>
  );
}
