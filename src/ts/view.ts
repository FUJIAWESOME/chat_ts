import Cookie from 'js-cookie';
import { HTTP, UI_ELEMENTS } from "./constants";
import { getPersonalInfo, updateName, getMessageHistory, openWebsocket, sendMessage, sendEmail } from './main';

document.addEventListener('DOMContentLoaded', async () => {
    localStorage.setItem('numberUploadedMessages', '0');

    const token = Cookie.get('token');

    if (token) {
        const response = await getMessageHistory(token);
        const data = await response.json();
        try {
            localStorage.setItem('messages', JSON.stringify(data));
        } catch (error) {
            console.log(error);
        }

        uploadMessageHistory();
        openWebsocket();
    } else {
        UI_ELEMENTS.MODAL_WINDOW.AUTHORIZATION.classList.add('open');
        UI_ELEMENTS.BACKGROUND_MODAL_WINDOW.style.display = 'block';
    }
})

UI_ELEMENTS.MESSAGE_LIST.addEventListener('scroll', (event: Event) => {
    const containerHeight = (event.currentTarget as HTMLElement).clientHeight;
    const scrollHeight = (event.currentTarget as HTMLElement).scrollHeight;
    const scrollTop = (event.currentTarget as HTMLElement).scrollTop;

    const isTopOfScroll = containerHeight + Math.abs(scrollTop) + 1 >= scrollHeight;
    if (isTopOfScroll) {
        uploadMessageHistory();
    }
})

UI_ELEMENTS.BUTTON.SETTINGS.addEventListener('click', async () => {
    UI_ELEMENTS.MODAL_WINDOW.SETTINGS.classList.add('open');
    UI_ELEMENTS.BACKGROUND_MODAL_WINDOW.style.display = 'block';

    (UI_ELEMENTS.FORM.SETTINGS.firstElementChild as HTMLInputElement).value = localStorage.getItem('name');
})

UI_ELEMENTS.FORM.INPUT_MESSAGE.addEventListener('submit', (event: Event) => {
    event.preventDefault();

    const message = ((event.target as HTMLElement).firstElementChild as HTMLInputElement).value;
    ((event.target as HTMLElement).firstElementChild as HTMLInputElement).value = '';
    
    if (!message) {
        alert('Нелья отправить пустое сообщение!');
        return;
    }

    sendMessage(message);
})


UI_ELEMENTS.FORM.SETTINGS.addEventListener('submit', async (event: SubmitEvent) => {
    event.preventDefault();

    const eventTarget = event.target as HTMLElement; 
    const firstChild = eventTarget.firstElementChild as HTMLInputElement;
    const name = firstChild.value;

    const response = await updateName(name);
    if (response.status === HTTP.STATUS.BAD_REQUEST) {
        alert('Имя слишком короткое! Минимум два символа!');
        return;
    }

    localStorage.setItem('name', name);
    alert('Имя успешно изменино!');
})

UI_ELEMENTS.FORM.AUTHORIZATION.addEventListener('submit', async (event) => {
    event.preventDefault();

    const eventTarget = event.target;

    if (eventTarget instanceof HTMLElement) {
        const firstChild = eventTarget.firstChild;
        if (firstChild instanceof HTMLInputElement) {
            const email = firstChild.value;
            const response = await sendEmail(email);
        
            if (response.status === HTTP.STATUS.BAD_REQUEST) {
                alert('Введен некорректный адрес эл. почты!');
                return;
            }
        
            alert('На почту отправлен код подтверждения!');
        
            UI_ELEMENTS.MODAL_WINDOW.AUTHORIZATION.classList.remove('open');
            UI_ELEMENTS.MODAL_WINDOW.ACCEPT.classList.add('open');
        }
    }
})

UI_ELEMENTS.FORM.ACCEPT.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = ((event.target as HTMLElement).firstElementChild as HTMLInputElement).value;

    const response = await getMessageHistory(token);
    if (response.status === HTTP.STATUS.UNAUTHORIZED) {
        alert('Неверный код подтверждения!');
        return;
    }

    const data = await response.json();
    try {
        localStorage.setItem('messages', JSON.stringify(data));
    } catch (error) {
        console.log(error);
    }
    
    Cookie.set('token', token);
    
    const personalInfoResponse = await getPersonalInfo();
    const personalInfo = await personalInfoResponse.json();
    
    localStorage.setItem('email', personalInfo.email);
    localStorage.setItem('name', personalInfo.name);
    
    uploadMessageHistory();
    openWebsocket();

    UI_ELEMENTS.MODAL_WINDOW.ACCEPT.classList.remove('open');
    UI_ELEMENTS.BACKGROUND_MODAL_WINDOW.style.display = 'none';
    ((event.target as HTMLElement).firstElementChild as HTMLInputElement).value = '';
})

export function addMessageToUI(name: string, message: string, date: Date, isPersonalMessage: boolean, isSendingLive: boolean) {
    const hoursNow = date.getHours();
    const minutesNow = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes(); //
    
    const messageType = isPersonalMessage ? 'dialog__personal_message' : 'dialog__someone_message';

    let li = document.createElement('li');
    li.append((UI_ELEMENTS.TEMPLATE as HTMLTemplateElement).content.cloneNode(true));
    li.firstElementChild.textContent = `${name}: ${message}`;
    li.lastElementChild.textContent = `${hoursNow}:${minutesNow}`;
    li.classList.add('dialog__message', 'dialog__message-box', messageType);

    if (isSendingLive) {
        UI_ELEMENTS.MESSAGE_LIST.prepend(li);
    } else {
        UI_ELEMENTS.MESSAGE_LIST.append(li);
    }
}

interface IMessage {
    user: {
        name: string;
        email: string;
    };
    text: string;
    createdAt: string;
}

async function uploadMessageHistory() {
    const firstIndex = localStorage.getItem('numberUploadedMessages');
    const newNumber = Number(localStorage.getItem('numberUploadedMessages')) + 19;
    localStorage.setItem('numberUploadedMessages', String(newNumber));
    const lastIndex = localStorage.getItem('numberUploadedMessages');

    try {
        const data = JSON.parse(localStorage.getItem('messages'));

        data.messages.forEach((item: IMessage, index: string) => {
            let isValidIndex = (index >= firstIndex) && (index < lastIndex);
    
            if (isValidIndex) {
                const dateNow = new Date(item.createdAt);
                const email = localStorage.getItem('email');
                if (item.user.email === email) {
                    addMessageToUI(item.user.name, item.text, dateNow, true, false);
                } else {
                    addMessageToUI(item.user.name, item.text, dateNow, false, false);
                }
            } else {
                return;
            }
        })
    } catch(error) {
        console.log(error);
    }
}

UI_ELEMENTS.BUTTON.ACCEPT_CLOSE.addEventListener('click', () => {
    UI_ELEMENTS.MODAL_WINDOW.ACCEPT.classList.remove('open');
    UI_ELEMENTS.MODAL_WINDOW.AUTHORIZATION.classList.add('open');
})

UI_ELEMENTS.BUTTON.SETTINGS_CLOSE.addEventListener('click', () => {
    UI_ELEMENTS.MODAL_WINDOW.SETTINGS.classList.remove('open');
    UI_ELEMENTS.BACKGROUND_MODAL_WINDOW.style.display = 'none';
})

UI_ELEMENTS.BUTTON.AUTHORIZATION_TOKEN_BTN.addEventListener('click', () => {
    UI_ELEMENTS.MODAL_WINDOW.AUTHORIZATION.classList.remove('open');
    UI_ELEMENTS.MODAL_WINDOW.ACCEPT.classList.add('open');
})

const exitHandler = () => {
    Cookie.remove('token');
    localStorage.clear();

    localStorage.setItem('numberUploadedMessages', '0');
    
    clearMessageHistory();

    UI_ELEMENTS.MODAL_WINDOW.AUTHORIZATION.classList.add('open');
    UI_ELEMENTS.BACKGROUND_MODAL_WINDOW.style.display = 'block';
}

UI_ELEMENTS.BUTTON.EXIT.addEventListener('click', exitHandler);

const clearMessageHistory = () => {
    const messages = document.querySelectorAll('.dialog__message');

    if (messages) {
        messages.forEach(item => item.remove());
    }
}