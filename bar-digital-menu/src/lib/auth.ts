const STAFF_PIN = "1234";
const AUTH_KEY = "bar_digital_staff_authenticated";

export function isStaffAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
}

export function authenticateStaff(pin: string): boolean {
  if (pin.trim() === STAFF_PIN) {
    try {
      sessionStorage.setItem(AUTH_KEY, "true");
    } catch {}
    return true;
  }
  return false;
}

export function logoutStaff(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {}
}
