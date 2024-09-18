import React, { ReactElement, useState } from "react";
import { TabItemProps, TabListProps } from "../types/TabTypes";
import './TabComponents.css'; // Ensure you import the CSS file

export const TabItem: React.FC<TabItemProps> = ({ name, children }) => (
  <div className="tab-panel" id={`${name}`}>{children}</div>
)

export const TabList: React.FC<TabListProps> = ({ children, activeTabIndex = 0, handleDownload, handleAzureUpload }) => {
    const [activeTab, setActiveTab] = useState(activeTabIndex);
    const handleTabClick = (index: number) => {
      setActiveTab(index);
    };
    const tabs = React.Children.toArray(children).filter(
        (child): child is ReactElement<TabItemProps> =>
          React.isValidElement(child) && child.type === TabItem
      );
    return (
      <div className="tabs">
        <div className="tab-list-wrapper">
          <nav>
            <ul className="tab-list">
              {tabs.map((tab, index) => (
                <li key={`tab-${index}`}>
                  <button
                    key={`tab-btn-${index}`}
                    id={`tab-${tab.props.name}`}
                    onClick={() => handleTabClick(index)}
                  className={`tab-btn ${
                    activeTab === index && "tab-btn--active"
                  }`}
                  >{tab.props.name}</button>
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
              <button className="upload-button" onClick={handleAzureUpload}>
                <i className="fas fa-cloud"></i>
              </button>
            </div>
          </div>          
        </div>
        {tabs[activeTab]}
      </div>
    );
};
