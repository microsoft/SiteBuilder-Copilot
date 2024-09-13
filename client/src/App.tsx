import React, { useState } from 'react';
import ConversationPanel from './ConversationPanel';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState<{ prompt: string, response: string }[]>([]);

  const scrollToLastElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && element.lastElementChild) {
      setTimeout(() => {
        element.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (prompt.trim()) {
      // Immediately update the conversations with a placeholder response
      setConversations([...conversations, { prompt, response: 'Working on it... <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style="width:20px;height:20px;" />' }]);
      scrollToLastElement('conversation');
      setPrompt('');

      try {
        const response = await fetch('http://127.0.0.1:5000/sendprompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const aiResponse = data.plaintextdata;
        const htmlData = data.htmldata;

        // Update the conversations with the actual AI response
        setConversations((prevConversations) =>
          prevConversations.map((conv, index) =>
            index === prevConversations.length - 1
              ? { ...conv, response: aiResponse }
              : conv
          )
        );
        scrollToLastElement('conversation');

        // Inject the HTML data into the generated-content div and remove the placeholder banner
        const generatedContentDiv = document.getElementById('generated-content');
        if (generatedContentDiv) {
          generatedContentDiv.innerHTML = htmlData;
        }
        const placeholderBanner = document.getElementById('placeholder-banner');
        if (placeholderBanner) {
          placeholderBanner.remove();
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container">
      <div className="left-column">
        <h1 id="placeholder-banner">Your Generated Content Will Appear Here!</h1>
        <div id="generated-content" />
      </div>
      <div className="right-column">
        <ConversationPanel conversations={conversations} />
        <textarea
          className="scrollable-input"
          placeholder="Type your prompt here!"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
        ></textarea>
        <button className="send-button" onClick={handleSend}>
          <span className="send-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.5 19.5L21 12 2.5 4.5v7l13 0-13 0v7z"
              />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default App;