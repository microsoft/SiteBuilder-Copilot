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
      <div id="new-chat-button-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
        <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 9.5a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3a.5.5 0 0 0-1 0v3h-3ZM18 10a8 8 0 1 0-16 0v.35l.03.38c.1 1.01.38 1.99.83 2.89l.06.12-.9 3.64-.02.08v.08c.03.3.31.52.62.45l3.65-.91.12.06A8 8 0 0 0 18 10ZM3 10a7 7 0 1 1 3.58 6.1l-.09-.03-.1-.02a.5.5 0 0 0-.18 0l-3.02.76.75-3.02.02-.1a.5.5 0 0 0-.07-.27A6.97 6.97 0 0 1 3 10Z" fill="currentColor"></path>
        </svg>
        <button
          id="new-chat-button"
          onClick={async () => await handleNewChat()}
          style={{ marginLeft: '8px' }}
        >
          New chat
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