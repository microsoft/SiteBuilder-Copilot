import React, { useState, useEffect, useRef } from 'react';
import ConversationPanel from './ConversationPanel';
import { TabItem, TabList } from './components/TabComponents';
import { Modal } from './components/Modal';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useSpeech } from "react-text-to-speech";
import { SessionDetails } from './types/SessionTypes';
import { AiResponse } from './types/ConversationTypes';
import { CodeBlock, dracula } from "react-code-blocks";
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
  const [shouldSendPrompt, setShouldSendPrompt] = useState(false); // Flag to track when to send
  useEffect(() => {
    if (shouldSendPrompt) {
      handleSend();  // Send when the prompt is updated
      setShouldSendPrompt(false); // Reset flag after sending
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, shouldSendPrompt]);

  const handleClick = (newPrompt: string) => {
    console.log("Button clicked with prompt: ", newPrompt);
    setPrompt(newPrompt); // Set the new prompt
    setShouldSendPrompt(true); // Trigger sending
  };

  const [htmlSource, setHtmlSource] = useState<string>();
  const [conversations, setConversations] = useState<{ prompt: string, response: AiResponse }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [response, setResponse] = useState<string>('{}');
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isChatVisible, setIsChatVisible] = useState<boolean>(true);
  const [modalIsOpen, setIsOpen] = useState<boolean>(false);
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

  const setSessionDropDown = (sessionId: string) => {
    const dropdown: HTMLSelectElement = document.getElementById('session-history') as HTMLSelectElement;
    if (dropdown) {
      const options = dropdown.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === sessionId) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
  }

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

  const isSessionSelected = (sessionId: string) => {
    const dropdown = document.getElementById('session-history') as HTMLSelectElement;
    if (dropdown) {
      const selectedValue = dropdown.value;
      return selectedValue === sessionId;
    }
    return false;
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

          if (!isSessionSelected(sessionId)) {
            fetchSessionHistory().then(() => {
              setSessionDropDown(sessionId);
            });
          }
        }
      } catch (error) {
        ErrorHandler.handleError(error, "Failing to get an html response from ChatGPT server.");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000); // 60 seconds timeout
  };

  const isImage = (fileName: string): boolean => {
    const fileExtension = (fileName.split('.').pop() || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension);
  };

  const handleSendInternal = async (prompt: string) => {
    const currentSessionId = sessionId || getQueryParam('sessionId');

    if (prompt.trim()) {
      if (selectedFile) {
        if (isImage(selectedFile.name)) {
          prompt = `${prompt} ![User Image Upload](http://127.0.0.1:5000/${currentSessionId}/template/img/${selectedFile.name})`
        } else {
          prompt = `${prompt} ![File Uploaded](${selectedFile.name})`
        }
      }

      setConversations([...conversations, { prompt, response: { message: 'Working on it... <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style="width:20px;height:20px;" />', responseSuggestions: [] } }]);
      scrollToLastElement('conversations-container');
      setPrompt('');
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (selectedFile) {
          formData.append('file', selectedFile);
          formData.append('prompt', prompt);
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
  }

  // send handler with prompt set from parameter
  const handleSendWithPrompt = async (promptParam: string) => {
    handleSendInternal(promptParam);
  };

  // send handler with prompt set from state
  const handleSend = async () => {
    handleSendInternal(prompt);
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
    setIsOpen(false);

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
    if (htmlSource) {
      const blob = new Blob([htmlSource], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'generated-website.html';
      link.click();
    }
  };

  const handleModal = (newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
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
      <Modal modalIsOpen={modalIsOpen} url={`${LOCAL_SERVER_BASE_URL}/azurestorageupload/${sessionId}`} handleModal={handleModal} sessionId={sessionId} />
      <div className="left-column">
        <TabList activeTabIndex={0} handleDownload={handleDownload} handleModal={handleModal} isChatVisible={isChatVisible} setIsChatVisible={setIsChatVisible}>
          <TabItem name="Website">
            {loading && (
              <div className="loading-spinner" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                Generating Changes...
                <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading" style={{ width: '20px', height: '20px' }} />
              </div>
            )}
            {iframeUrl ? (
              <iframe id="generated-content-iframe" src={iframeUrl} />
            ) : (
              htmlSource == null ? ( // if no HTML and therefore a new session, show the starting menu
                <main>
                  <div className="welcome-section">
                    <div className="welcome-message">
                      <img src="/copilot.svg" alt="Logo" className="main-logo" />
                      <h2>Welcome to SiteBuilder! We're glad you're here.</h2>
                      <p>From prompt to fully functional websites in a few clicks</p>
                      <h2 className='sub-header'>Make me a website for:</h2>
                      <div className="button-grid">
                        <button onClick={() => handleClick(`
                          Make a website with 3 famous fully functioning complex 3D videogames based on already popular games. Have a header at the top of the page. Have an interesting way to 
                          navigate with fun transitions between the pages of videogames. The site should have a specific style and vibe you can choose for the colors and text.  
                          I'd also like a background image behind each game matching their atmospheres. Make up fictional details that seem real to make the content more interesting and engaging, like 
                          funny pun titles for each game on each page.
                        `)}>
                          Custom Videogames
                        </button>
                        <button onClick={() => handleClick(`
                          Create a website showcasing my personal projects and resume. The homepage should have a clean, professional header with my name and a tagline. Include sections for 'About Me', 'Skills', 'Projects', and 
                          'Contact', all with smooth transitions as the user scrolls or navigates between sections. Each project should be featured on its own page with a short, engaging description, screenshots, and links to GitHub 
                          or live demos if applicable. The projects should be highlighted with unique, dynamic visuals, such as hover effects or animations that match the style of the project. Choose a modern, minimalist design style 
                          with a muted color palette, but feel free to add subtle pops of color for emphasis. Use elegant, readable fonts. For the 'Resume' section, include a downloadable PDF and an interactive version on the page. 
                          Make the site responsive so it looks great on both desktop and mobile.Make up some fictional details to showcase skills that don't currently exist on my resume or in projects, such as fun names for the projects
                          and unique challenges that were 'overcome' during development to make the content more engaging.
                        `)}>
                          Personal Projects & Resume
                        </button>
                        <button onClick={() => handleClick(`
                          Design a real estate website for a group that specializes in buying and selling properties.
                          The homepage should feature a large search bar with options to filter by location, price, and
                          property type. Include sections like 'Featured Properties', 'Recent Listings', and 'Customer
                          Testimonials'. Each property listing should have high-resolution images, key features, and a
                          virtual tour option. Add interactive maps that show nearby amenities and neighborhoods, and
                          include smooth transitions between different property views. Choose a professional and
                          luxurious color scheme with elegant fonts that match the brand's premium feel. Make up
                          fictional property listings and client testimonials to add personality, such as ‘A stunning
                          lakefront property with a private dock’ or ‘A sleek downtown loft with panoramic city views’.
                        `)}>
                          Real Estate Group listings
                        </button>
                        <button onClick={() => handleClick(`
                          Create an e-commerce website for an online store that sells trendy, high-quality products.
                          The homepage should feature a banner highlighting current sales or new arrivals, followed by
                          sections like 'Best Sellers', 'New Arrivals', and 'Categories'. Implement a dynamic product
                          filtering system and smooth animations for adding items to the cart. Each product page should
                          include high-quality images, detailed descriptions, customer reviews, and related products.
                          Use interactive elements like hover-to-zoom on product images and subtle animations when
                          switching between product colors or sizes. Choose a modern, clean design with minimalistic
                          fonts and an elegant color scheme. Make up fictional product details to make the content
                          more interesting, like creative product names or unique selling points, such as ‘A scarf
                          that’s also a hoodie’ or ‘Eco-friendly sneakers made from recycled ocean plastic'.
                        `)}>
                          E-commerce Storefronts 
                        </button>
                        <button onClick={() => handleClick(`
                          Design a health and fitness blog that is clean, motivating, and informative. The homepage
                          should have a welcoming header, a featured blog post section, and categories like 'Nutrition',
                          'Workouts', 'Mental Health', and 'Lifestyle'. Add a sidebar for popular posts, user
                          testimonials, and a newsletter signup form. Each blog post should have large, vibrant images,
                          interactive tips or callouts (e.g., 'Did you know?' facts), and easy-to-read text. Use
                          calming yet energizing colors like soft greens and blues, paired with sleek, modern fonts.
                          Make up fictional blog posts and health tips that seem real, like '5 Ways to Boost Your
                          Energy Without Caffeine' or 'How to Build a Home Workout Routine with Just 10 Minutes a Day'.
                        `)}>
                          Health & Fitness Blogs
                        </button>
                        <button onClick={() => handleClick(`
                          Create a social media website where users can connect, share content, and interact with
                          friends in a fun and creative way. The homepage should have a user-friendly login/signup
                          section, followed by a feed that dynamically loads posts, photos, and videos from friends.
                          Include features like 'Trending Topics', 'Groups', and 'Events'. Each user's profile should
                          display a bio, recent posts, and friends, with animated effects like hover interactions on
                          profile pictures and fun transitions when switching between tabs. Choose a vibrant, playful
                          color palette and bold typography. Make up fictional user posts and content to showcase how
                          users interact on the site, like clever captions or trending hashtags that seem authentic
                          and engaging.
                        `)}>
                          Social Media Sites 
                        </button>
                        <button onClick={() => handleClick(`
                          Build a travel agency website that is visually stunning and immersive. The homepage should
                          feature a hero section with breathtaking imagery of popular destinations, paired with a
                          search bar for users to find flights, hotels, and travel packages. Add sections for 'Top
                          Destinations', 'Special Offers', and 'Customer Testimonials'. Each destination page should
                          have vibrant photos, key highlights, and a section where users can explore available tours
                          and activities. Use fun animations and transitions, like parallax scrolling or zoom effects,
                          to make the experience engaging. Choose a tropical and adventurous color scheme with playful
                          fonts. Make up fictional travel packages and unique destinations to make the site more
                          engaging, like ‘a cruise to the hidden waterfalls of the Pacific’ or ‘a secluded desert safari’.
                        `)}>
                          Travel Agent Sites 
                        </button>
                        <button onClick={() => handleClick(`
                          Design a news website with a sleek, modern layout. The homepage should have a breaking
                          news section at the top, followed by categories like 'World', 'Politics', 'Tech',
                          'Entertainment', and 'Sports'. Create an easy-to-navigate menu and use engaging animations
                          for article transitions, such as fade-ins or slide effects. Each article should feature
                          a striking headline, a lead image, and interactive elements like polls or comment sections.
                          Incorporate an automatic feed for live updates, and add dynamic visuals to emphasize major
                          stories. Choose a bold yet professional color palette and fonts that make headlines stand
                          out but keep the text readable. Make up fictional breaking news and stories that seem real
                          to make the content more engaging and exciting for users.
                        `)}>
                          News Website
                        </button>
                      </div>
                    </div>
                  </div>
                </main>
              ) : ( // if we already have html just show that
                <div id="generated-content" dangerouslySetInnerHTML={{ __html: htmlSource }} style={{ width: '100%', height: '100%' }} />)
            )}
          </TabItem>
          <TabItem name="Source">
            <div id="source-code-content">
              <CodeBlock language="html" theme={dracula} text={htmlSource} />
            </div>
          </TabItem>
          <TabItem name="Raw">
            <div id="raw-response-content" style={{ width: '100%', height: '100%' }}>
              <pre>{response}</pre>
            </div>
          </TabItem>
        </TabList>
      </div>
      <div className="right-column" style={{ display: isChatVisible ? 'flex' : 'none' }}>
        <ConversationPanel
          conversations={conversations}
          sessionHistory={sessionHistory}
          handleNewChat={async () => { window.location.href = window.location.origin + window.location.pathname; }}
          handleDeleteChat={handleDeleteChat}
          selectedSession={sessionId}
          handleSessionSelectCallback={handleSessionSelectCallback}
          handleSendWithPrompt={handleSendWithPrompt}
          handleModal={handleModal}
        />
        <textarea
          className="scrollable-input"
          placeholder="Ask for a website here!"
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
          <div id='non-send-buttons'>
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