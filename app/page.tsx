"use client";

import React, { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { DashboardCanvas, PinnedItem } from "@/components/dashboard-canvas";
import { SettingsModal } from "@/components/settings-modal";

export default function Home() {
  const [pinnedItem, setPinnedItem] = useState<PinnedItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-3.8-flash");
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>();
  const [mobileTab, setMobileTab] = useState<"chat" | "canvas">("chat");

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("chinook_gemini_api_key");
      if (savedKey) setApiKey(savedKey);

      let savedModel = localStorage.getItem("chinook_gemini_model");
      if (savedModel) {
        // Automatically migrate deprecated models to active 3.8 models
        if (savedModel.includes("pro")) {
          savedModel = "gemini-3.8-pro";
          localStorage.setItem("chinook_gemini_model", savedModel);
        } else if (
          savedModel.includes("1.5") ||
          savedModel.includes("2.0") ||
          savedModel.includes("2.5") ||
          savedModel.includes("flash")
        ) {
          savedModel = "gemini-3.8-flash";
          localStorage.setItem("chinook_gemini_model", savedModel);
        }
        setModelName(savedModel);
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem("chinook_gemini_api_key", key);
    } catch {
      // ignore
    }
  };

  const handleSelectModel = (model: string) => {
    setModelName(model);
    try {
      localStorage.setItem("chinook_gemini_model", model);
    } catch {
      // ignore
    }
  };

  const handlePinItem = (item: PinnedItem) => {
    setPinnedItem(item);
  };

  const handleSelectStarterPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setMobileTab("chat");
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Mobile Tab Toggle (Visible only on small screens) */}
      <div className="md:hidden fixed top-3 right-16 z-30 flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
        <button
          onClick={() => setMobileTab("chat")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            mobileTab === "chat" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab("canvas")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            mobileTab === "canvas" ? "bg-blue-600 text-white" : "text-slate-400"
          }`}
        >
          Canvas {pinnedItem && "•"}
        </button>
      </div>

      {/* Split-Pane Layout */}
      <div className="flex w-full h-full">
        {/* Left Pane: Chat Interface */}
        <section
          className={`h-full w-full md:w-[46%] lg:w-[44%] xl:w-[42%] flex-shrink-0 flex flex-col ${
            mobileTab === "chat" ? "flex" : "hidden md:flex"
          }`}
        >
          <ChatInterface
            onPinItem={handlePinItem}
            activePinnedId={pinnedItem?.id}
            onOpenSettings={() => setIsSettingsOpen(true)}
            apiKey={apiKey}
            modelName={modelName}
            selectedPrompt={selectedPrompt}
            onClearSelectedPrompt={() => setSelectedPrompt(undefined)}
          />
        </section>

        {/* Right Pane: Dashboard Canvas */}
        <section
          className={`h-full flex-1 min-w-0 ${
            mobileTab === "canvas" ? "flex" : "hidden md:flex"
          }`}
        >
          <DashboardCanvas
            pinnedItem={pinnedItem}
            onSelectPrompt={handleSelectStarterPrompt}
            className="w-full"
          />
        </section>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        modelName={modelName}
        onSelectModel={handleSelectModel}
      />
    </main>
  );
}
