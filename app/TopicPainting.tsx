const positions: Record<string, string> = {
  Self: "0% 48%",
  Life: "50% 48%",
  Growth: "100% 48%",
};

/** Decorative artwork: the adjacent topic heading supplies the accessible name. */
export default function TopicPainting({ topic }: { topic: string }) {
  return (
    <span
      aria-hidden="true"
      className="iserein-topic-painting"
      style={{ backgroundPosition: positions[topic] ?? positions.Self }}
    />
  );
}
