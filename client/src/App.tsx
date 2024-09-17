import React, { useState, useEffect } from 'react';
import ConversationPanel from './ConversationPanel';
import { TabItem, TabList } from './components/TabComponents';
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
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);
  
  useEffect(() => {
    const checkAndSetIframeUrl = async (guid: string) => {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `jobs/${guid}/index.html`);
      if (response.status === 200) {
        setIframeUrl(LOCAL_SERVER_BASE_URL + `jobs/${guid}/index.html`);
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
  }, []);

  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        const response = await fetch(LOCAL_SERVER_BASE_URL + `sessionhistory`);
        const data = await response.json();
        setSessionHistory(data);
        // TODO: display session history in UI, make it interactive
        console.log('session history: ', sessionHistory);
      } catch (error) {
        console.error('Error:', error);
      }
    }
    fetchSessionHistory();
  }, []);

  const scrollToLastElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && element.lastElementChild) {
      setTimeout(() => {
        element.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const reloadIframe = () => { 
    const iframe = document.getElementById('generated-content-iframe') as HTMLIFrameElement;
    // eslint-disable-next-line no-self-assign
    iframe.src = iframe.src;
  }

  // TODO: Re-enable Jonathan's stuff
  // const fetchData = async (baseUrl: string, endpoint: string, method: string, body: FormData) => {
  //   const response = await fetch(`${baseUrl}/${endpoint}`, {
  //     method: method,
  //     body: body,
  //   });

  //   if (!response.ok) {
  //     throw new Error('Network response was not ok');
  //   }

  //   const data = await response.json();

  //   return data;
  // }

  const handleSend = async () => {
    if (prompt.trim()) {
      setConversations([...conversations, { prompt, response: 'Working on it... <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style="width:20px;height:20px;" />' }]);
      scrollToLastElement('conversation');
      setPrompt('');

      try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (selectedFile) {
          formData.append('file', selectedFile);
        }

        const response = await fetch(LOCAL_SERVER_BASE_URL + `sendprompt/${sessionId}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const aiResponse = data.plaintextdata;
        const templateUrl = data.templateurl;

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
          const sourceCodeResponse = await fetch(templateUrl);
          if (sourceCodeResponse.ok) {
            setHtmlSource(await sourceCodeResponse.text());
          }
        } else {
          setHtmlSource(data.htmldata);
        }
        setResponse(JSON.stringify(data));
        reloadIframe();

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
        <ConversationPanel conversations={conversations} handleNewChat={handleNewChat} />
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