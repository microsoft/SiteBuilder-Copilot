export interface ModalTypeProps {
    modalIsOpen: boolean;
    handleModal: (newIsOpen: boolean) => void;
    url: string;
    sessionId: string;
}
