// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { ReactElement, useState } from "react";
import { TabItemProps, TabListProps } from "../types/TabTypes";
import './TabComponents.css'; // Ensure you import the CSS file

export const TabItem: React.FC<TabItemProps> = ({ name, children }) => (
  <div className="tab-panel" id={`${name}`}>{children}</div>
)

export const TabList: React.FC<TabListProps> = ({ children, activeTabIndex = 0, handleDownload, handleModal, isChatVisible, setIsChatVisible }) => {
  const [activeTab, setActiveTab] = useState(activeTabIndex);
  const handleTabClick = (index: number) => {
    setActiveTab(index);
  };
  const tabs = React.Children.toArray(children).filter(
    (child): child is ReactElement<TabItemProps> =>
      React.isValidElement(child) && child.type === TabItem
  );
  return (
    <div className="tabs-header-container" >
      <div className="tabs-header">
        <div className="logo-title-wrapper" onClick={() => window.location.href = window.location.origin + window.location.pathname}>
          <img src="/sitebuilder_temp_icon.svg" alt="Logo" className="main-logo" />
          <h1 className="tabs-title">Site Builder Copilot</h1>
        </div>
        <div className="tab-list-wrapper">
          <nav>
            <ul className="tab-list">
              {tabs.map((tab, index) => (
                <li key={`tab-${index}`}>
                  <button
                    key={`tab-btn-${index}`}
                    id={`tab-${tab.props.name}`}
                    onClick={() => handleTabClick(index)}
                    className={`tab-btn ${activeTab === index ? "tab-btn--active" : ""}`}
                  >
                    {tab.props.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="right-tab-list-wrapper">
            <div className="download-button-wrapper" title="Download website">
              <button className="download-button" onClick={handleDownload}>
                <i className="fas fa-save"></i>
              </button>
            </div>
            <div className="upload-button-wrapper" title="Upload to Azure">
              <button className="upload-button" onClick={() => handleModal(true)}>
                <i className="fas fa-cloud"></i>
              </button>
            </div>
            <div className="chat-visibility-button" onClick={() => setIsChatVisible(!isChatVisible)} title={`${isChatVisible ? "Hide chat": "Show chat"}`}>
              <i className={`fas ${isChatVisible ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </div>
            </div>            
        </div>
      </div>
      {tabs[activeTab]}
    </div>


  );
};
