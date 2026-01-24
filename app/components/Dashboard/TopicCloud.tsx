"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { usePrivacy } from "../../context/PrivacyContext";
import { obfuscateText } from "../../lib/utils";
import { useText } from "../../hooks/useText";

interface Topic {
  text: string;
  count: number;
}

interface TopicCloudProps {
  topics: Topic[];
  onTopicClick: (topic: string) => void;
  onBlockTopic: (topic: string) => void;
  isLoading?: boolean;
}

export const TopicCloud: React.FC<TopicCloudProps> = ({ topics, onTopicClick, onBlockTopic, isLoading }) => {
  const { isPrivacyMode } = usePrivacy();
  const { t } = useText();
  const maxCount = useMemo(() => Math.max(...topics.map((t) => t.count), 1), [topics]);

  // Function to clamp sizes
  const getScale = (count: number) => {
    // Linear scale between 0.8rem and 2.5rem
    const minSize = 0.75;
    const maxSize = 2.0; // rem
    const size = minSize + (count / maxCount) * (maxSize - minSize);
    return `${size.toFixed(2)}rem`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3 p-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-8 bg-base-300 rounded-full w-20" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-base-content/50 h-full">
        <p>{t("topicCloud.empty")}</p>
        <p className="text-xs">{t("topicCloud.hint")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 p-2 justify-center content-start h-full overflow-y-auto">
      {topics.map((topic) => (
        <div
          key={topic.text}
          className="group relative inline-flex items-center gap-1 transition-all duration-200 hover:scale-105"
        >
          <button
            onClick={() => onTopicClick(topic.text)}
            className="px-2 py-1 rounded-xl text-primary hover:text-primary-focus hover:bg-base-200/50 transition-colors font-semibold"
            style={{ fontSize: getScale(topic.count), lineHeight: "1.2" }}
            title={t("topicCloud.countParams", { count: topic.count })}
          >
            {isPrivacyMode ? obfuscateText(topic.text) : topic.text}
          </button>

          {/* Block Button - Visible on Hover */}
          {!isPrivacyMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBlockTopic(topic.text);
              }}
              className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-2 p-0.5 bg-base-100 shadow-sm rounded-full text-base-content/40 hover:text-error hover:bg-base-200 transition-all scale-75"
              title={t("topicCloud.hide")}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
