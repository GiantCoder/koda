import reducer, { loginSuccess, logout } from "./authSlice";

describe("authSlice", () => {
  it("handles loginSuccess", () => {
    const state = reducer(undefined, loginSuccess("token-1"));
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("token-1");
  });

  it("handles logout", () => {
    const loggedIn = reducer(undefined, loginSuccess("token-1"));
    const state = reducer(loggedIn, logout());
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });
});
