/** Topic surfaces are decorative; small labels use the darker accent or ink. */
export type TopicTheme = {
  surface: string;
  soft: string;
  accent: string;
  ink: string;
};

export const topicThemes = {
  Self: {
    surface: "#C8C9C5",
    soft: "#ECEDE9",
    accent: "#5D5D57",
    ink: "#33241D",
  },
  Life: {
    surface: "#A9B7BE",
    soft: "#E8EEF0",
    accent: "#435B68",
    ink: "#33241D",
  },
  Growth: {
    surface: "#B8B0A4",
    soft: "#EEE9E2",
    accent: "#655B50",
    ink: "#33241D",
  },
} satisfies Record<string, TopicTheme>;

export function getTopicTheme(name: string): TopicTheme {
  return Object.prototype.hasOwnProperty.call(topicThemes, name)
    ? topicThemes[name as keyof typeof topicThemes]
    : topicThemes.Growth;
}
