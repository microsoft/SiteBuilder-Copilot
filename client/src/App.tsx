import React, { useState, useEffect } from 'react';
import ConversationPanel from './ConversationPanel';
import { TabItem, TabList } from './components/TabComponents';
import './App.css';

// Function to generate a GUID
const generateGUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState<{ prompt: string, response: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generate a GUID and update the URL query string
    const guid = generateGUID();
    setSessionId(guid);
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${guid}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }, []);
  const [htmlSource, setHtmlSource] = useState<string>('<h1 id="placeholder-banner">Your Generated Content Will Appear Here!</h1>');
  const [response, setResponse] = useState<string>('{}');
  const [iframeUrl, setIframeUrl] = useState<string>('');

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
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (selectedFile) {
          formData.append('file', selectedFile);
        }

        const response = await fetch(`http://127.0.0.1:5000/sendprompt/${sessionId}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const aiResponse = data.plaintextdata;
        const templateUrl = data.templateurl;

        // Update the conversations with the actual AI response
        setConversations((prevConversations) =>
          prevConversations.map((conv, index) =>
            index === prevConversations.length - 1
              ? { ...conv, response: aiResponse }
              : conv
          )
        );
        scrollToLastElement('conversation');

        if (templateUrl) {
          setIframeUrl(templateUrl);
        } else {
          setHtmlSource(data.htmldata);
        }
        setResponse(JSON.stringify(data));

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  return (
    <div className="container">
      <div className="left-column">
        <TabList activeTabIndex={0}>
          <TabItem name="Website">
            {iframeUrl ? (
              <iframe id="generated-content-iframe" src={iframeUrl} />
            ) : (
              <div id="generated-content" dangerouslySetInnerHTML={{ __html: htmlSource }} />
            )}
          </TabItem>
          <TabItem name="Source">
            <div id="source-code-content"><pre>{htmlSource}</pre></div>
          </TabItem>
          <TabItem name="Raw">
            <div id="raw-response-content"><pre>{response}</pre></div>
          </TabItem>
        </TabList>      
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
        {selectedFile && (
          <div className="selected-file-name">
            Selected file: {selectedFile.name}
          </div>
        )}
        <div className="button-wrapper">
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
          <div className="file-input-wrapper">
            <input
              type="file"
              id="file-input"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="file-input-label">
              <i className="fas fa-paperclip"></i>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;