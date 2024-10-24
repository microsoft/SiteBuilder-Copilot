// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ModalTypeProps {
    modalIsOpen: boolean;
    handleModal: (newIsOpen: boolean) => void;
    url: string;
    sessionId: string;
}
