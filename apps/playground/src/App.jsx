const commands = [
  "npm run dev --workspace @moyarich/demo-tools-playground",
  "npm run list --workspace @moyarich/demo-tools-playground",
  "node apps/playground/demo/strategies/hello/index.mjs",
];

export default function App() {
  return (
    <main>
      <p className="eyebrow">@moyarich/demo-tools</p>
      <h1>Demo Tools Playground</h1>
      <p className="lede">
        A workspace for developing, discovering, and running demo strategies.
      </p>

      <section>
        <h2>Try it</h2>
        {commands.map((command) => (
          <code key={command}>{command}</code>
        ))}
      </section>
    </main>
  );
}
