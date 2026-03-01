import reducer, { toggleTheme } from "./uiSlice";

describe("uiSlice", () => {
  it("toggles theme", () => {
    const state1 = reducer(undefined, toggleTheme());
    expect(state1.theme).toBe("dark");

    const state2 = reducer(state1, toggleTheme());
    expect(state2.theme).toBe("light");
  });
});
