import React from "react";
import './ConversationPanel.css';

interface Conversation {
  prompt: string;
  response: string;
}

interface ConversationPanelProps {
  conversations: Conversation[];
  sessionHistory: string[];
  handleNewChat: () => Promise<void>;
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  conversations,
  sessionHistory,
  handleNewChat,
}) => {
  return (
    <div id="conversation" className="conversations">
      <div id="conversation-header" className="conversation-header">
        <div id="new-chat-button-wrapper" className="new-chat-button-wrapper">
          <button
            id="new-chat-button"
            onClick={async () => await handleNewChat()}
          >
            New Chat
          </button>
        </div>
        {sessionHistory &&
          <select id="session-history" defaultValue={"DEFAULT"}>
            <option value="DEFAULT" disabled>Select a previous chat</option>
            {sessionHistory.map((sessionId,) => (
              <option key={sessionId} value={sessionId}>{sessionId}</option>
            ))}
          </select>
        }
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