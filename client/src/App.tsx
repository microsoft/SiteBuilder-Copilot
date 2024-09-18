import React, { useState, useEffect } from 'react';
import ConversationPanel from './ConversationPanel';
import { TabItem, TabList } from './components/TabComponents';
import { SessionDetails } from './types/SessionTypes';
import './App.css';

const LOCAL_SERVER_BASE_URL = 'http://127.0.0.1:5000/';
const generateGUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getQueryParam = (name: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState<{ prompt: string, response: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [htmlSource, setHtmlSource] = useState<string>('<h1 id="placeholder-banner">Your Generated Content Will Appear Here!</h1>');
  const [response, setResponse] = useState<string>('{}');
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkAndSetIframeUrl = async (guid: string) => {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `jobs/${guid}/index.html`);
      if (response.status === 200) {
        setIframeUrl(LOCAL_SERVER_BASE_URL + `jobs/${guid}/index.html`);
        populateConversations(guid);
      } else {
        guid = generateGUID();
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${guid}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        setSessionId(guid);
      }
    };
    let guid = getQueryParam('sessionId');
    if (guid) {
      checkAndSetIframeUrl(guid);
    } else {
      guid = generateGUID();
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${guid}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
      setSessionId(guid);
    }

    fetchSessionHistory();
  }, []);


  const fetchSessionHistory = async () => {
    try {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `sessionhistory`);
      const data = await response.json();
      setSessionHistory(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    async function doFetchSource(url: string) {
      const sourceCodeResponse = await fetch(url);
      if (sourceCodeResponse.ok) {
        setHtmlSource(await sourceCodeResponse.text());
      }
    }
    if (iframeUrl) {
      doFetchSource(iframeUrl);
    }
  }, [iframeUrl])

  const scrollToLastElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && element.lastElementChild) {
      setTimeout(() => {
        element.parentElement!.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const goToLastConversation = () => {
    const container = document.getElementById('conversations-container');
    if (container && container.lastElementChild) {
      container.lastElementChild.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  const pollForImages = async (sessionId: string, iframeUrl: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(LOCAL_SERVER_BASE_URL + `image_readycheck/${sessionId}`, {
          method: 'GET',
        });
        const data = await response.json();
        if (data.images_ready) {
            clearInterval(intervalId);
            setTimeout(() => {
              setIframeUrl( `${iframeUrl}?t=${new Date().getTime()}`);
            }, 1000);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000 * 2); // 2 minutes
  };

  const pollForOutput = async (sessionId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(LOCAL_SERVER_BASE_URL + `getoutput/${sessionId}`, {
          method: 'POST',
        });
        const data = await response.json();
        if (data.status === 'ready') {
          clearInterval(intervalId);
          setHtmlSource(data.htmldata);
          setIframeUrl(data.templateurl);
          setLoading(false);
          pollForImages(sessionId, data.templateurl);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000); // 60 seconds timeout
  };

  const handleSend = async () => {
    const currentSessionId = sessionId || getQueryParam('sessionId');

    if (prompt.trim()) {
      setConversations([...conversations, { prompt, response: 'Working on it... <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style="width:20px;height:20px;" />' }]);
      scrollToLastElement('conversations-container');
      setPrompt('');
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (selectedFile) {
          formData.append('file', selectedFile);
        }

        const response = await fetch(LOCAL_SERVER_BASE_URL + `sendprompt/${currentSessionId}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const aiResponse = data.response;

        setConversations((prevConversations) =>
          prevConversations.map((conv, index) =>
            index === prevConversations.length - 1
              ? { ...conv, response: aiResponse }
              : conv
          )
        );
        scrollToLastElement('conversations-container');

        if (currentSessionId) {
          pollForOutput(currentSessionId);
        }

        setResponse(JSON.stringify(data));
        const placeholderBanner = document.getElementById('placeholder-banner');
        if (placeholderBanner) {
          placeholderBanner.remove();
        }

        setSelectedFile(null);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `newchat/${sessionId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Reset the state for a new chat session
      setPrompt('');
      setConversations([]);
      setSelectedFile(null);
      setHtmlSource('<h1 id="placeholder-banner">Your Generated Content Will Appear Here!</h1>');
      setResponse('{}');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSessionSelectCallback = async (selectedSessionId: string) => {
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${selectedSessionId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
    setSessionId(selectedSessionId);
    setIframeUrl(LOCAL_SERVER_BASE_URL + `jobs/${selectedSessionId}/index.html`);

    populateConversations(selectedSessionId);
  };

  const populateConversations = async (sessionId: string) => {
    const response = await fetch(LOCAL_SERVER_BASE_URL + `messages/${sessionId}`);
    const data = await response.json();
    const messages: Array<{content: string, role: string}> = data["messages"];
    const promptExchanges: Array<{prompt: string, response: string}> = [];
    for(let i = 1; i < messages.length - 1; i++) {
      promptExchanges.push({ prompt: messages[i].content, response: messages[i+1].content });
    }
    setConversations(promptExchanges);
    setTimeout(() => {
      goToLastConversation();
    }, 50);
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

  const handleDownload = () => {
    const blob = new Blob([htmlSource], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated-website.html';
    link.click();
  };

  return (
    <div className="container">
      <div className="left-column" style={{ width: '100%' }}>
        <TabList activeTabIndex={0} handleDownload={handleDownload}>
          <TabItem name="Website">
            <div className="content-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
              {loading && (
                <div className="loading-spinner" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                  Generating Changes...
                  <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style={{ width: '20px', height: '20px' }} />
                </div>
              )}
              {iframeUrl ? (
                <iframe id="generated-content-iframe" src={iframeUrl} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }} />
              ) : (
                <div id="generated-content" dangerouslySetInnerHTML={{ __html: htmlSource }} style={{ width: '100%', height: '100%' }} />
              )}
            </div>
          </TabItem>
          <TabItem name="Source">
            <div id="source-code-content" style={{ width: '100%', height: '100%' }}>
              <pre>{htmlSource}</pre>
            </div>
          </TabItem>
          <TabItem name="Raw">
            <div id="raw-response-content" style={{ width: '100%', height: '100%' }}>
              <pre>{response}</pre>
            </div>
          </TabItem>
        </TabList>
      </div>
      <div className="right-column">
        <ConversationPanel
          conversations={conversations}
          sessionHistory={sessionHistory}
          handleNewChat={handleNewChat}
          handleSessionSelectCallback={handleSessionSelectCallback}
        />
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
              <i className="fas fa-paper-plane"></i>
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