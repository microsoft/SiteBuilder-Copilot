import React, { useState, useEffect, useRef } from 'react';
import ConversationPanel from './ConversationPanel';
import { TabItem, TabList } from './components/TabComponents';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useSpeech } from "react-text-to-speech";
import { SessionDetails } from './types/SessionTypes';
import { AiResponse } from './types/ConversationTypes';

import './App.css';
import { ErrorHandler, NetworkError, ResponseError } from './ErrorHandler';

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
  const [conversations, setConversations] = useState<{ prompt: string, response: AiResponse }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [htmlSource, setHtmlSource] = useState<string>('<h1 id="placeholder-banner">Your Generated Content Will Appear Here!</h1>');
  const [response, setResponse] = useState<string>('{}');
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();
  const [canDoTTS, setCanDoTTS] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  const {
    speechStatus,
    start: TextToSpeechStart,
    stop: TextToSpeechStop
  } = useSpeech({
    text: textToSpeak,
    voiceURI: "Microsoft Libby Online (Natural) - English (United Kingdom)",
    onStop: (event) => {
      console.log(event);
      if (textToSpeak.length > 0) {
        setTextToSpeak('');
      }
    }
  });

  useEffect(() => {
    if (textToSpeak.length == 0) {
      return;
    }

    TextToSpeechStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textToSpeak]);

  useEffect(() => {
    if (finalTranscript.length == 0) {
      return;
    }
    setPrompt(prompt => {
      let newPrompt = "";
      if (prompt.length > 0) {
        newPrompt += `${prompt} `;
      }
      newPrompt += finalTranscript;

      return newPrompt;
    });
    resetTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTranscript]);

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

  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {

      hasMounted.current = true;

      let guid = getQueryParam('sessionId');
      if (guid) {
        checkAndSetIframeUrl(guid);
        setSessionId(guid);
      } else {
        guid = generateGUID();
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${guid}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        setSessionId(guid);
      }

      fetchSessionHistory();
    }
  }, []);

  const fetchSessionHistory = async () => {
    try {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `sessionhistory`);
      if (!response.ok) {
        throw new ResponseError(response.status, response.statusText);
      }
      const data = await response.json();
      setSessionHistory(data);
    } catch (error) {
      ErrorHandler.handleError(error, "Failed to fetch session history.");
    }
  };

  useEffect(() => {
    try {
      async function doFetchSource(url: string) {

        const sourceCodeResponse = await fetch(url);
        if (sourceCodeResponse.ok) {
          setHtmlSource(await sourceCodeResponse.text());
        }
      }
      if (iframeUrl) {
        doFetchSource(iframeUrl);
      }
    } catch (e) {
      ErrorHandler.handleError(e, "Failed to load your local index.html file into Source tab.");
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

        // Check if the response is not OK and throw a custom error
        if (!response.ok) {
          throw new ResponseError(response.status, response.statusText);
        }

        const data = await response.json();
        if (data.images_ready) {
          clearInterval(intervalId);
          setTimeout(() => {
            setIframeUrl(`${iframeUrl}?t=${new Date().getTime()}`);
          }, 1000);
        }
      } catch (error) {
        ErrorHandler.handleError(error, "Failing to get an image response from Dalle server.");
      }
    }, 1000);

    // Set a timeout to stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000 * 2); // 2 minutes
  };

  // TODO: Re-enable image function when needed
  // const fetchImageData = async (url: string) => {
  //   const formData = new FormData();
  //   formData.append('prompt', prompt);

  //   const response = await fetch(url, {
  //     method: 'POST',
  //     body: formData,
  //   });

  //   if (!response.ok) {
  //     throw new Error('Network response was not ok');
  //   }

  //   const data = await response.json();

  //   return data;
  // }

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
        ErrorHandler.handleError(error, "Failing to get an html response from ChatGPT server.");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000); // 60 seconds timeout
  };

  const handleSend = async () => {
    const currentSessionId = sessionId || getQueryParam('sessionId');

    if (prompt.trim()) {
      setConversations([...conversations, { prompt, response: { message: 'Working on it... <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style="width:20px;height:20px;" />', responseSuggestions: [] } }]);
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
          throw new NetworkError('Failed to send prompt');
        }

        const data = await response.json();
        const aiResponse = parseAiResponseWithOptions(data.response);

        // const imageData = await fetchImageData(`${LOCAL_SERVER_BASE_URL}/getimage/${sessionId}`);
        // console.log(imageData);

        if (canDoTTS) {
          setTextToSpeak(aiResponse.message);
        }

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
        ErrorHandler.handleError(error, 'Failed to receive reply to your prompt.');
      }
    }
  };

  const handleDeleteChat = async () => {
    try {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `deletechat/${sessionId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new NetworkError('Network response to new chat was not okay.');
      }
      else {
        window.location.reload();
      }
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to delete chat.');
    }
  };

  const parseAiResponseWithOptions = (response: string): AiResponse => {
    const jsonStartIndex = response.indexOf('{');
    const jsonEndIndex = response.lastIndexOf('}') + 1;

    let message = response;
    let responseSuggestions: string[] = [];
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      message = response.substring(0, jsonStartIndex);
      try {
        const jsonString = response.substring(jsonStartIndex, jsonEndIndex);
        responseSuggestions = JSON.parse(jsonString).choices;

      } catch (error) {
        ErrorHandler.handleError(error, 'Failed to parse JSON while making ai multi-option response.');
      }
    }
    return { message, responseSuggestions };
  };

  const handleSessionSelectCallback = async (selectedSessionId: string) => {
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sessionId=${selectedSessionId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
    setSessionId(selectedSessionId);
    setIframeUrl(LOCAL_SERVER_BASE_URL + `jobs/${selectedSessionId}/index.html`);

    populateConversations(selectedSessionId);
  };

  const populateConversations = async (sessionId: string) => {
    try {
      const response = await fetch(LOCAL_SERVER_BASE_URL + `messages/${sessionId}`);
      const data = await response.json();
      const messages: Array<{ content: string, role: string }> = data["messages"];
      const promptExchanges: Array<{ prompt: string, response: AiResponse }> = [];
      for (let i = 1; i < messages.length - 1; i += 2) {
        const aiResponse = parseAiResponseWithOptions(messages[i + 1].content);
        promptExchanges.push({ prompt: messages[i].content, response: aiResponse });
      }
      setConversations(promptExchanges);
      setTimeout(() => {
        goToLastConversation();
      }, 50);
    } catch (e) {
      ErrorHandler.handleError(e, 'Failed to retrieve messages from previous chats.');
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

  const handleDownload = () => {
    const blob = new Blob([htmlSource], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated-website.html';
    link.click();
  };

  const handleAzureUpload = async () => {
    alert("Not implemented yet!");
    return Promise.resolve(false);
  }

  const handleImageUrlSubmit = () => {
    setPrompt(`![image](${imageUrl})`);
    setShowUrlInput(false);
  };

  const handleSpeechChange = async () => {
    if (!isMicrophoneAvailable) {
      return;
    }

    if (listening) {
      await SpeechRecognition.stopListening();
    } else {
      await SpeechRecognition.startListening();
    }
  };

  const handleHearingChange = async () => {
    setCanDoTTS(!canDoTTS);
    if (speechStatus == "started") {
      TextToSpeechStop();
    }
  };

  return (
    <div className="container">
      <div className="left-column" style={{ width: '100%' }}>
        <TabList activeTabIndex={0} handleDownload={handleDownload} handleAzureUpload={handleAzureUpload}>
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
          handleNewChat={async () => { window.location.href = window.location.origin + window.location.pathname; }}
          handleDeleteChat={handleDeleteChat}
          selectedSession={sessionId}
          handleSessionSelectCallback={handleSessionSelectCallback}
        />
        <textarea
          className="scrollable-input"
          placeholder="Type your prompt here!"
          value={`${prompt}${transcript}`}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
        ></textarea>
        {selectedFile && (
          <div className="selected-file-name">
            Selected file: {selectedFile.name}
          </div>
        )}
        <div className="button-wrapper" title="Submit">
          <div className="image-upload-wrapper" title="Add an image">
            {showUrlInput && (
              <div className="url-input-box">
                <small>Add an image</small>
                <input
                  type="text"
                  placeholder="Paste link"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImageUrlSubmit()}
                />
              </div>
            )}
            <div className="image-upload-label" onClick={() => setShowUrlInput(!showUrlInput)}>
              <i className="fas fa-image"></i>
            </div>
          </div>
          <div className="file-input-wrapper" title="Add a file">
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
          {browserSupportsSpeechRecognition &&
            <div className={`generic-button-input-wrapper ${listening ? "generic-button-input-on" : "generic-button-input-off"}`} title="Speak a prompt" onClick={handleSpeechChange}>
              <span className="speech-input-icon">
                <i className={`fas fa-microphone ${listening ? "fa-inverse" : ""}`}></i>
              </span>
            </div>
          }
          <div className={`generic-button-input-wrapper ${canDoTTS ? "generic-button-input-on" : "generic-button-input-off"}`} title="Hear the responses" onClick={handleHearingChange}>
            <span className="hear-input-icon">
              <i className={`fas fa-headphones ${canDoTTS ? "fa-inverse" : ""}`}></i>
            </span>
          </div>
          <button className="send-button" onClick={handleSend}>
            <span className="send-icon">
              <i className="fas fa-paper-plane"></i>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;