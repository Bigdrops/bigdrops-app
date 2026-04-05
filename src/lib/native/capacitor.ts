import { Capacitor } from "@capacitor/core";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function canUseNativeSqlite(): boolean {
  return isNativePlatform() && Capacitor.isPluginAvailable("CapacitorSQLite");
}

export function canUseAndroidNativeSqlite(): boolean {
  return isAndroidNative() && canUseNativeSqlite();
}
