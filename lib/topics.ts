export const topicNames = ["Self", "Life", "Growth"] as const;
export type TopicName = (typeof topicNames)[number];

export function getTopicName(value: string): TopicName | undefined {
  return topicNames.find((topic) => topic.toLowerCase() === value.toLowerCase());
}

export const topicDescriptions: Record<TopicName, string> = {
  Self: "Thoughtful readings about mind, emotions, identity, and inner peace.",
  Life: "Thoughtful readings about love, relationships, time, and meaning.",
  Growth: "Thoughtful readings about courage, habits, learning, and resilience.",
};
