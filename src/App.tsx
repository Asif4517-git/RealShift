import { useCallback, useEffect, useState } from "react";
import { About } from "./components/About";
import { DataLog } from "./components/DataLog";
import { DynoBay } from "./components/DynoBay";
import { Garage } from "./components/Garage";
import { Sidebar, TopBar } from "./components/layout";
import { ControlsModal, DatasheetModal, SettingsModal, type SettingsTab } from "./components/Modals";
import { StoreProvider, useStore } from "./lib/store";
import type { Vehicle } from "./lib/vehicles";
import type { AppView } from "./lib/views";

function Shell() {
  const { settings, storageError } = useStore();
  const [view, setView] = useState<AppView>("dyno");
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("audio");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [datasheet, setDatasheet] = useState<Vehicle | null>(null);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openAudio = useCallback(() => {
    setSettingsTab("audio");
    setSettingsOpen(true);
  }, []);
  const openSettings = useCallback(() => {
    setSettingsTab("simulation");
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (typing) return;
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setControlsOpen(true);
      }
      if (event.key === "Escape") {
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const blocked = settingsOpen || controlsOpen || !!datasheet || mobileNav;

  return (
    <div className={settings.reducedMotion ? "reduce-motion min-h-screen bg-ink text-fg" : "min-h-screen bg-ink text-fg"}>
      <Sidebar
        view={view}
        onNavigate={navigate}
        onOpenSettings={openSettings}
        onOpenControls={() => setControlsOpen(true)}
      />
      <div className="lg:pl-[248px]">
        <TopBar
          view={view}
          onMenu={() => setMobileNav(true)}
          onOpenControls={() => setControlsOpen(true)}
          onOpenSettings={openSettings}
          onOpenAudio={openAudio}
          onAbout={() => navigate("about")}
        />
        {storageError && <div role="alert" className="border-b border-warm/40 bg-[#332416] px-4 py-3 text-sm text-[#ffe0ae]">Browser storage is unavailable, full, or contains unrecognized records. Changes and new runs may not survive a reload. Existing unrecognized data is left untouched. Export important visible runs and check your browser storage settings.</div>}
        <main className="min-h-[calc(100vh-54px)]">
          {view === "dyno" && (
            <DynoBay
              onNavigate={navigate}
              onOpenControls={() => setControlsOpen(true)}
              onOpenSettings={openSettings}
              onOpenAudio={openAudio}
              inputBlocked={blocked}
            />
          )}
          {view === "garage" && <Garage onNavigate={navigate} onOpenDatasheet={setDatasheet} />}
          {view === "data" && <DataLog onNavigate={navigate} onOpenAudio={openAudio} onOpenDatasheet={setDatasheet} />}
          {view === "about" && <About onNavigate={navigate} onOpenControls={() => setControlsOpen(true)} />}
        </main>
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNav(false)} aria-hidden="true" />
          <div className="relative h-full w-[270px] max-w-[86vw]">
            <Sidebar
              view={view}
              onNavigate={navigate}
              onOpenSettings={openSettings}
              onOpenControls={() => setControlsOpen(true)}
              mobile
              onClose={() => setMobileNav(false)}
            />
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />
      <ControlsModal open={controlsOpen} onClose={() => setControlsOpen(false)} />
      <DatasheetModal
        vehicle={datasheet}
        onClose={() => setDatasheet(null)}
        onEnterDyno={() => {
          setDatasheet(null);
          navigate("dyno");
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
