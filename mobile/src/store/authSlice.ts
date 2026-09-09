import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  bootstrapSession,
  type KodaUser,
  type LoginInput,
  type RegisterInput,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { getOnboardingComplete, setOnboardingComplete, clearOnboardingComplete } from "@/lib/onboardingStore";
import { getConsentStatus } from "@/api/onboarding";
import { registerForPushNotificationsAsync, unregisterCurrentPushToken } from "@/lib/pushRegistration";

type AuthStatus = "checkingSession" | "signedOut" | "signingIn" | "signedIn" | "error";

interface AuthState {
  status: AuthStatus;
  user: KodaUser | null;
  error: string | null;
  // null = not yet determined (still checking session / mid-registration).
  // Only meaningful once status === "signedIn".
  onboardingComplete: boolean | null;
}

const initialState: AuthState = {
  status: "checkingSession",
  user: null,
  error: null,
  onboardingComplete: null,
};

/** Runs once on app launch (see src/app/_layout.tsx). Tries to resume a
 * session from the refresh token in SecureStore; falls back to signedOut. */
export const bootstrapAuth = createAsyncThunk("auth/bootstrap", async () => {
  const user = await bootstrapSession();
  if (!user) return null;
  const onboardingComplete = await getOnboardingComplete();
  // Fire-and-forget: a resumed session should (re-)register this device
  // for push the same as a fresh login, but must never hold up app launch
  // waiting on a permission prompt / Expo push token round trip.
  void registerForPushNotificationsAsync();
  return { user, onboardingComplete };
});

export const loginThunk = createAsyncThunk<
  { user: KodaUser; onboardingComplete: boolean },
  LoginInput,
  { rejectValue: string }
>("auth/login", async (input, { rejectWithValue }) => {
  let user: KodaUser;
  try {
    user = await apiLogin(input);
  } catch (err) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    // Anything that isn't an ApiError didn't get a response at all (network
    // failure, DNS, wrong EXPO_PUBLIC_API_URL, etc.) -- log it so it shows
    // up in the Metro terminal instead of vanishing into a generic message.
    console.error("[auth/login] Non-API error during login:", err);
    return rejectWithValue("Something went wrong signing in. Please try again.");
  }

  // A login (as opposed to a resumed session) could be happening on a fresh
  // device/reinstall where the local onboardingComplete flag was never set,
  // or after this user logged out mid-onboarding elsewhere. Trusting a
  // "true" default here risks skipping a still-pending guardian consent
  // gate, so ask the one real source of truth we have. If the check itself
  // fails (offline, etc.) default to treating them as onboarded rather than
  // trapping a legitimate returning user -- pending-consent minors are the
  // rare case this is protecting against, not the common one.
  let onboardingComplete = true;
  try {
    const consent = await getConsentStatus();
    onboardingComplete = consent.consentStatus !== "PENDING";
  } catch (err) {
    console.warn("[auth/login] Could not verify consent status after login:", err);
  }
  await setOnboardingComplete(onboardingComplete);
  void registerForPushNotificationsAsync();

  return { user, onboardingComplete };
});

export const registerThunk = createAsyncThunk<
  KodaUser & { requiresConsent: boolean },
  RegisterInput,
  { rejectValue: string }
>("auth/register", async (input, { rejectWithValue }) => {
  try {
    return await apiRegister(input);
  } catch (err) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    console.error("[auth/register] Non-API error during registration:", err);
    return rejectWithValue("Something went wrong creating your account. Please try again.");
  }
});

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  // Unregister before apiLogout() invalidates the session -- the DELETE
  // call needs a still-valid access token to identify which token to remove.
  await unregisterCurrentPushToken();
  await apiLogout();
  await clearOnboardingComplete();
});

/** Call when the user finishes the last onboarding step (profile). */
export const completeOnboardingThunk = createAsyncThunk("auth/completeOnboarding", async () => {
  await setOnboardingComplete(true);
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        bootstrapAuth.fulfilled,
        (state, action: PayloadAction<{ user: KodaUser; onboardingComplete: boolean } | null>) => {
          state.status = action.payload ? "signedIn" : "signedOut";
          state.user = action.payload?.user ?? null;
          state.onboardingComplete = action.payload?.onboardingComplete ?? null;
        }
      )
      .addCase(bootstrapAuth.rejected, (state) => {
        state.status = "signedOut";
        state.user = null;
        state.onboardingComplete = null;
      })
      .addCase(loginThunk.pending, (state) => {
        state.status = "signingIn";
        state.error = null;
      })
      .addCase(
        loginThunk.fulfilled,
        (state, action: PayloadAction<{ user: KodaUser; onboardingComplete: boolean }>) => {
          state.status = "signedIn";
          state.user = action.payload.user;
          state.onboardingComplete = action.payload.onboardingComplete;
        }
      )
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Sign-in failed";
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = "signingIn";
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = "signedIn";
        state.user = action.payload;
        state.onboardingComplete = false;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Registration failed";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.status = "signedOut";
        state.user = null;
        state.error = null;
        state.onboardingComplete = null;
      })
      .addCase(completeOnboardingThunk.fulfilled, (state) => {
        state.onboardingComplete = true;
      });
  },
});

export default authSlice.reducer;
