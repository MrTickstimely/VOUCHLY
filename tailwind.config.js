module.exports = {
  content: ["./app/**/*.js", "./components/**/*.js"],
  theme: {
    extend: {
      colors: {
        white: "rgb(var(--c-white) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        mute: "rgb(var(--c-mute) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        pass: "rgb(var(--c-pass) / <alpha-value>)",
        flag: "rgb(var(--c-flag) / <alpha-value>)",
        fail: "rgb(var(--c-fail) / <alpha-value>)",
        mark: "rgb(var(--c-mark) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", "Comic Neue", "cursive"],
      },
    },
  },
};
