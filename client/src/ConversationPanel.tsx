import React from 'react';

interface Conversation {
  prompt: string;
  response: string;
}

interface ConversationPanelProps {
  conversations: Conversation[];
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversations }) => {
  return (
    <div id="conversation" className="conversations">
      <div id="new-chat-button-wrapper">
        <button id="new-chat-button" onClick={() => alert("new chat")}>New Chat</button>
      </div>
      <br/>
      {conversations.map((conversation, index) => (
        <div key={index} className="conversation">
          <div className="submitted-prompt">
            {conversation.prompt}
          </div>
          <div className="ai-response" dangerouslySetInnerHTML={{ __html: conversation.response }} />
        </div>
      ))}
    </div>
  );
};

export default ConversationPanel;