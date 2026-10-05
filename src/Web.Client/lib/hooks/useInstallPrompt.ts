"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * The non-standard `beforeinstallprompt` event Chromium fires when the app is
 * installable. Not in the DOM lib types, so it is declared here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeDisplayMode(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getInstalledSnapshot() {
  // iOS Safari exposes `navigator.standalone` instead of the display-mode media query.
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function getServerInstalledSnapshot() {
  return false;
}

type Platform = "ios" | "android" | "desktop";

function subscribePlatform() {
  return () => {};
}

function getPlatformSnapshot(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports a desktop (Macintosh) UA; detect it by touch points.
  const isIPadOS = navigator.maxTouchPoints > 1 && /mac/i.test(ua);
  if (/iphone|ipad|ipod/i.test(ua) || isIPadOS) {
    return "ios";
  }
  return /android/i.test(ua) ? "android" : "desktop";
}

function getServerPlatformSnapshot(): Platform {
  return "desktop";
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isInstalled = useSyncExternalStore(
    subscribeDisplayMode,
    getInstalledSnapshot,
    getServerInstalledSnapshot,
  );
  const platform = useSyncExternalStore(
    subscribePlatform,
    getPlatformSnapshot,
    getServerPlatformSnapshot,
  );

  useEffect(() => {
    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    canPrompt: deferredPrompt !== null && !isInstalled,
    isInstalled,
    platform,
    isIOS: platform === "ios" && !isInstalled,
    promptInstall,
  };
}