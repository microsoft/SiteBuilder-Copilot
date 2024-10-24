// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { useState, useEffect } from "react";
import { ModalTypeProps } from "../types/ModalTypes";
import './Modal.css'; // Ensure you import the CSS file

export const Modal: React.FC<ModalTypeProps> = ({ modalIsOpen, handleModal, url, sessionId }) => {
    const [modalInputs, setModalInputs] = useState<{website_name: string, azure_resource_group_name: string}>({website_name: '', azure_resource_group_name: ''});
    const [azureUrl, setAzureUrl] = useState<string>('');
    const [modalError, setModalError] = useState<string>('');

    useEffect(() => {
        setAzureUrl('');
        setModalError('');
        setModalInputs({website_name: '', azure_resource_group_name: ''});
      }, [sessionId]);

    const handleChange = (event : React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;
      const value = event.target.value;
      setModalInputs(values => ({...values, [name]: value}))
    }
    
    const sendAzureForm = async () => {
        const formData = new FormData();
        Object.entries(modalInputs).map(([key, value]) => {
          formData.append(key.trim(), (value as string).trim());
        });
    
        console.log(formData);
    
        const response = await fetch(url, {
          method: 'PUT',
          body: formData
        });
    
        const data = await response.json();
    
        if (response.status === 200) {
          console.log(data.azure_url);
          setAzureUrl(data.azure_url);
        }
        else
        {
          setModalError(data.error);
        }
    
        return Promise.resolve(false);
    }

    return (
        <div>
            { modalIsOpen &&
            <div className="modal">
                <div className="modal-content">
                    <div className="close-modal-container" title="Close Azure modal" onClick={() => handleModal(false)}>
                        <span className="generic-button-input-wrapper generic-button-input-off modal-close">
                            <i className="fas fa-times"></i>
                        </span>
                    </div>
                    <form>
                        Please enter a website name (Must be max 24 chars)
                        <br />
                        <div className="modal-input-field">
                            <input
                                type="text"
                                name="website_name"
                                value={modalInputs.website_name}
                                onChange={handleChange}
                            />
                            { modalError && <div style={{color: "red"}}>{modalError}</div>}
                        </div>
                        <br />
                        Please enter an Azure resource group name
                        <br />
                        <div className="modal-input-field">
                            <input
                                type="text"
                                name="azure_resource_group_name"
                                value={modalInputs.azure_resource_group_name}
                                onChange={handleChange}
                                />
                        </div>
                        <br />
                        { azureUrl && <div>Cloud URL is hosted at {azureUrl}. Please wait a few minutes for the website to finish processing on Azure.</div>}
                    </form>
                    <button className="send-button" title="Submit Azure resource options" onClick={sendAzureForm}>
                        <span className="send-icon">
                            Submit &nbsp;<i className="fas fa-paper-plane"></i>
                        </span>
                    </button>
                </div>
            </div>
            }
        </div>
    );
};
