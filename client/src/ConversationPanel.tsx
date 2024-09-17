import React from "react";

interface Conversation {
  prompt: string;
  response: string;
}

interface ConversationPanelProps {
  conversations: Conversation[];
  handleNewChat: () => Promise<void>;
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  conversations,
  handleNewChat,
}) => {
  return (
    <div id="conversation" className="conversations">
      <div id="new-chat-button-wrapper">
        <button
          id="new-chat-button"
          onClick={async () => await handleNewChat()}
        >
          New Chat
        </button>
      </div>
      <br />
      {conversations.map((conversation, index) => (
        <div key={index} className="conversation">
          <div className="submitted-prompt">{conversation.prompt}</div>
          <div
            className="ai-response"
            dangerouslySetInnerHTML={{ __html: conversation.response }}
          />
        </div>
      ))}
    </div>
  );
};

export default ConversationPanel;
