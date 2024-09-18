import React from "react";
import './ConversationPanel.css';
import { SessionDetails } from './types/SessionTypes';

interface Conversation {
  prompt: string;
  response: string;
}

interface ConversationPanelProps {
  conversations: Conversation[];
  sessionHistory: SessionDetails[];
  handleNewChat: () => Promise<void>;
  handleSessionSelectCallback: (sessionId: string) => void;
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  conversations,
  sessionHistory,
  handleNewChat,
  handleSessionSelectCallback,
}) => {

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = event.target.value;
    handleSessionSelectCallback(sessionId);
  }

  const renderContent = (content: string) => {
    const imageTagMatch = content.includes("![image]");
    if (imageTagMatch) {
      const src = content.split("](")[1].replace(")", "");
      return <img src={src} style={{ width: '50%', height: '50%' }} />;
    }
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return (
    <div id="conversation" className="conversations">
      <div id="conversation-header" className="conversation-header">
        <div id="new-chat-button-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
          <button
            id="new-chat-button"
            title="Start a new chat"
            onClick={async () => await handleNewChat()}>
            <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 9.5a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3a.5.5 0 0 0-1 0v3h-3ZM18 10a8 8 0 1 0-16 0v.35l.03.38c.1 1.01.38 1.99.83 2.89l.06.12-.9 3.64-.02.08v.08c.03.3.31.52.62.45l3.65-.91.12.06A8 8 0 0 0 18 10ZM3 10a7 7 0 1 1 3.58 6.1l-.09-.03-.1-.02a.5.5 0 0 0-.18 0l-3.02.76.75-3.02.02-.1a.5.5 0 0 0-.07-.27A6.97 6.97 0 0 1 3 10Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        {sessionHistory &&
          <select id="session-history" defaultValue={"DEFAULT"} onChange={handleSelect}>
            <option value="DEFAULT" disabled>Select a previous chat</option>
            {sessionHistory.map((sessionDetails) => (
              <option key={sessionDetails.sessionId} value={sessionDetails.sessionId}>{sessionDetails.title}</option>
            ))}
          </select>
        }
      </div>
      <div id="conversations-container">
        {conversations &&
          conversations.map((conversation, index) => (
            <div key={index} className="conversation">
              <div className="submitted-prompt">
                {renderContent(conversation.prompt)}
              </div>
              <div
                className="ai-response"
                dangerouslySetInnerHTML={{ __html: '<b>Copilot:</b> ' + conversation.response }}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

export default ConversationPanel;